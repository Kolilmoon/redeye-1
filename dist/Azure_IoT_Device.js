"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const moment = require("moment");
const child_process_1 = require("child_process");
const path = require("path");
const aziotmqtt = require("azure-iot-device-mqtt");
const aziotprovisioningdevicemqtt = require("azure-iot-provisioning-device-mqtt");
const aziotdevice = require("azure-iot-device");
const aziotcommon = require("azure-iot-common");
const aziotsecuritysymmetrickey = require("azure-iot-security-symmetric-key");
const aziotprovisioningdevice = require("azure-iot-provisioning-device");
const Protocol = aziotmqtt.Mqtt;
const ProvProtocol = aziotprovisioningdevicemqtt.Mqtt;
const Client = aziotdevice.Client;
const Message = aziotdevice.Message;
const ConnectionString = aziotcommon.ConnectionString;
const SymmetricKeySecurityClient = aziotsecuritysymmetrickey.SymmetricKeySecurityClient;
const ProvisioningDeviceClient = aziotprovisioningdevice.ProvisioningDeviceClient;
/*Device DTDL id*/
const modelIdObject = { modelId: 'dtmi:Redeye:redeye_1_plus;2' };
const messageSubjectProperty = '$.sub';
const deviceInfoComponentName = 'deviceInformation';
const commandGetCurrentConnectionStatus = 'getCurrentConnectionStatus';
const commandSetStartScanning = 'connectToRedeyeDevice';
// const commandDisconnectDevice = 'disconnectRedeyeDevice';
const commandNameReboot = 'reboot';
const serialNumber = 'redeye-1-plus-01';
const sendCommandResponse = async (request, response, status, payload) => {
    try {
        await response.send(status, payload);
        console.log('Response to method: ' + request.methodName + ' sent successfully.');
    }
    catch (err) {
        console.error('An error ocurred when sending a method response:\n' + err.toString());
    }
};
const helperLogCommandRequest = (request) => {
    console.log('Received command request for command name: ' + request.methodName);
    if (!!(request.payload)) {
        console.log('The command request payload is:');
        console.log(request.payload);
    }
};
const helperCreateReportedPropertiesPatch = (propertiesToReport, componentName) => {
    let patch;
    if (!!(componentName)) {
        patch = {};
        propertiesToReport.__t = 'c';
        patch[componentName] = propertiesToReport;
    }
    else {
        patch = {};
        patch = propertiesToReport;
    }
    if (!!(componentName)) {
        console.log('The following properties will be updated for component: ' + componentName);
    }
    else {
        console.log('The following properties will be updated for root interface.');
    }
    console.log(patch);
    return patch;
};
const updateComponentReportedProperties = (deviceTwin, patch, componentName) => {
    let logLine;
    if (!!(componentName)) {
        logLine = 'Properties have been reported for component: ' + componentName;
    }
    else {
        logLine = 'Properties have been reported for root interface.';
    }
    deviceTwin.properties.reported.update(patch, function (err) {
        if (err)
            throw err;
        console.log(logLine);
    });
};
const desiredPropertyPatchListener = (deviceTwin, componentNames) => {
    deviceTwin.on('properties.desired', (delta) => {
        console.log('Received an update for device with value: ' + JSON.stringify(delta));
        Object.entries(delta).forEach(([key, values]) => {
            const version = delta.$version;
            if (!!(componentNames) && componentNames.includes(key)) { // then it is a component we are expecting
                const componentName = key;
                const patchForComponents = { [componentName]: {} };
                Object.entries(values).forEach(([propertyName, propertyValue]) => {
                    if (propertyName !== '__t' && propertyName !== '$version') {
                        console.log('Will update property: ' + propertyName + ' to value: ' + propertyValue + ' of component: ' + componentName);
                        const propertyContent = { value: propertyValue };
                        propertyContent.ac = 200;
                        propertyContent.ad = 'Successfully executed patch';
                        propertyContent.av = version;
                        patchForComponents[componentName][propertyName] = propertyContent;
                    }
                });
                updateComponentReportedProperties(deviceTwin, patchForComponents, componentName);
            }
            else if (key !== '$version') { // individual property for root
                const patchForRoot = {};
                console.log('Will update property: ' + key + ' to value: ' + values + ' for root');
                const propertyContent = { value: values };
                propertyContent.ac = 200;
                propertyContent.ad = 'Successfully executed patch';
                propertyContent.av = version;
                patchForRoot[key] = propertyContent;
                updateComponentReportedProperties(deviceTwin, patchForRoot, null);
            }
        });
    });
};
const exitListener = async (deviceClient) => {
    const standardInput = process.stdin;
    standardInput.setEncoding('utf-8');
    console.log('Please enter q or Q to exit sample.');
    standardInput.on('data', (data) => {
        if (data.toString() === 'q\n' || data.toString() === 'Q\n') {
            console.log('Clearing intervals and exiting sample.');
            deviceClient.close();
            process.exit();
        }
        else {
            console.log('User Input was: ' + data);
            console.log('Please only enter q or Q to exit sample.');
        }
    });
};
function reboot() {
    return new Promise((resolve, rejects) => {
        child_process_1.exec('sudo reboot', (error, stdout, stderr) => {
            if (error) {
                console.error(`error: ${error}`);
                rejects(false);
                return;
            }
            console.log(`stdout: ${stdout}`);
            console.error(`stderr: ${stderr}`);
        });
        resolve(true);
    });
}
function commandSetStartScanningHandler() {
    return new Promise((resolve, rejects) => {
        child_process_1.exec('node ' + path.join(__dirname, './WiFi.js'), (error, stdout, stderr) => {
            if (error) {
                console.error(`error: ${error}`);
                rejects(false);
                return;
            }
            console.log(`stdout: ${stdout}`);
            console.error(`stderr: ${stderr}`);
        });
        resolve(true);
    });
}
class Azure_IoT_Device {
    /*Constructor of the class*/
    constructor(config) {
        this.lastTestResult = 3;
        this.lastTestResultSpectrum = '[]';
        this.isConnected = false;
        this.deviceConnectionString = config.IOTHUB_DEVICE_CONNECTION_STRING;
        this.provisioningHost = config.IOTHUB_DEVICE_DPS_ENDPOINT || 'global.azure-devices-provisioning.net';
        this.idScope = config.IOTHUB_DEVICE_DPS_ID_SCOPE;
        this.registrationId = config.IOTHUB_DEVICE_DPS_DEVICE_ID;
        this.symmetricKey = config.IOTHUB_DEVICE_DPS_DEVICE_KEY;
        this.useDps = config.IOTHUB_DEVICE_SECURITY_TYPE;
        this.main();
    }
    async main() {
        /* If the user include a provision host then use DPS */
        if (this.useDps === 'DPS') {
            await this.provisionDevice(modelIdObject);
        }
        else if (this.useDps === 'connectionString') {
            try {
                if (!(this.deviceConnectionString && ConnectionString.parse(this.deviceConnectionString, ['HostName', 'DeviceId']))) {
                    console.error(moment().format() + ' Azure Connection string was not specified.');
                    process.exit(1);
                }
            }
            catch (err) {
                console.error(moment().format() + ' Invalid Azure connection string specified.');
                process.exit(1);
            }
        }
        else {
            console.log(moment().format() + ' No proper SECURITY TYPE provided.');
            process.exit(1);
        }
        this.azureClient = Client.fromConnectionString(this.deviceConnectionString, Protocol);
        console.log(moment().format() + ' Connecting using connection string: ' + this.deviceConnectionString);
        let resultTwin;
        try {
            // Define modelId
            await this.azureClient.setOptions(modelIdObject);
            await this.azureClient.open();
            console.log(moment().format() + ' Enabling the commands on the client');
            this.azureClient.onDeviceMethod(commandGetCurrentConnectionStatus, this.commandHandler);
            this.azureClient.onDeviceMethod(commandSetStartScanning, this.commandHandler);
            // this.azureClient.onDeviceMethod(commandDisconnectDevice, this.commandHandler);
            this.azureClient.onDeviceMethod(commandNameReboot, this.commandHandler);
            // attach a standard input exit listener
            exitListener(this.azureClient);
            try {
                resultTwin = await this.azureClient.getTwin();
                // Only report readable properties
                // const patchTestResultProperty = helperCreateReportedPropertiesPatch({ testResult: this.lastTestResult }, null);
                // const patchLastTestResultSpectrum = helperCreateReportedPropertiesPatch({ lastTestResultSpectrum: this.lastTestResultSpectrum }, null);
                const patchGetCurrentConnectionStatus = helperCreateReportedPropertiesPatch({ getCurrentConnectionStatus: this.isConnected }, null);
                const patchDeviceInfo = helperCreateReportedPropertiesPatch({
                    manufacturer: 'Taiwan RedEye Biomedical Inc.',
                    model: 'Redeye-1-Plus',
                    swVersion: '1.00',
                }, deviceInfoComponentName);
                // the below things can only happen once the twin is there
                // updateComponentReportedProperties(resultTwin, patchTestResultProperty, null);
                // updateComponentReportedProperties(resultTwin, patchLastTestResultSpectrum, null);
                updateComponentReportedProperties(resultTwin, patchGetCurrentConnectionStatus, null);
                // desiredPropertyPatchListener(resultTwin, [redeye1ComponentName, deviceInfoComponentName]);
            }
            catch (err) {
                console.error('could not retrieve twin or report twin properties\n' + err.toString());
            }
        }
        catch (err) {
            console.error('could not connect Plug and Play client or could not attach interval function for telemetry\n' + err.toString());
        }
    }
    async provisionDevice(payload) {
        const provSecurityClient = new SymmetricKeySecurityClient(this.registrationId, this.symmetricKey);
        let provisioningClient = ProvisioningDeviceClient.create(this.provisioningHost, this.idScope, new ProvProtocol(), provSecurityClient);
        if (!!(payload)) {
            provisioningClient.setProvisioningPayload(payload);
        }
        try {
            let result = await provisioningClient.register();
            this.deviceConnectionString = 'HostName=' + result.assignedHub + ';DeviceId=' + result.deviceId + ';SharedAccessKey=' + this.symmetricKey;
            console.log('registration succeeded');
            console.log('assigned hub=' + result.assignedHub);
            console.log('deviceId=' + result.deviceId);
            console.log('payload=' + JSON.stringify(result.payload));
        }
        catch (err) {
            console.error("error registering device: " + err.toString());
        }
    }
    async sendTelemetry(deviceClient, data, index, componentName) {
        if (!!(componentName)) {
            console.log('Sending telemetry message %d from component: %s ', index, componentName);
        }
        else {
            console.log('Sending telemetry message %d from root interface', index);
        }
        const msg = new Message(data);
        if (!!(componentName)) {
            msg.properties.add(messageSubjectProperty, componentName);
        }
        msg.contentType = 'application/json';
        msg.contentEncoding = 'utf-8';
        await deviceClient.sendEvent(msg);
    }
    async commandHandler(request, response) {
        helperLogCommandRequest(request);
        switch (request.methodName) {
            case commandGetCurrentConnectionStatus: {
                await sendCommandResponse(request, response, 200, this.isConnected.toString());
                break;
            }
            case commandSetStartScanning: {
                await commandSetStartScanningHandler();
                await sendCommandResponse(request, response, 200, null);
                break;
            }
            case commandNameReboot: {
                await sendCommandResponse(request, response, 200, null);
                await reboot();
                break;
            }
            default:
                await sendCommandResponse(request, response, 404, 'unknown method');
                break;
        }
    }
    ;
}
exports.Azure_IoT_Device = Azure_IoT_Device;
