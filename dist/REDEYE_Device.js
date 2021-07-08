"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const net = require("net");
const moment = require("moment");
const pcap = require("pcap");
const fs = require("fs");
const path = require("path");
const azure_iot_device_1 = require("azure-iot-device");
const REDEYE_Packet_1 = require("./REDEYE_Packet");
const REDEYE_Record_Data_1 = require("./REDEYE_Record_Data");
const REDEYE_New_Data_1 = require("./REDEYE_New_Data");
const REDEYE_Packet_Cmd_1 = require("./REDEYE_Packet_Cmd");
const Azure_IoT_Device_1 = require("./Azure_IoT_Device");
const tcp_tracker = new pcap.TCPTracker();
const pcap_session = pcap.createSession('wlan0', { filter: "ip proto \\tcp" });
const testResultSpectrum = 'testResultSpectrum';
const testResult = 'testResult';
class REDEYE_Device extends Azure_IoT_Device_1.Azure_IoT_Device {
    constructor(config) {
        super(config);
        this.packet_byte_array = new Uint8Array();
        this.packet_verify = new Uint8Array();
        this.mStream_Size = 0;
        this.mData_Chunks = 0;
        this.resultIndex = 0;
        this.spectrumIndex = 0;
        this.mCurrent_cmd = REDEYE_Packet_Cmd_1.Cmd.PACKET_UNKNOWN;
    }
    initPCAP() {
        tcp_tracker.on('session', session => {
            console.log("Start of session between " + session.src_name + " and " + session.dst_name);
            session.on('end', session => {
                console.log(moment().format() + ": End of TCP session between " + session.src_name + " and " + session.dst_name);
            });
        });
        pcap_session.on('packet', raw_packet => {
            let packet = pcap.decode.packet(raw_packet);
            tcp_tracker.track_packet(packet);
            console.log(moment().format() + ":  Packet route:" + packet.payload.payload);
        });
    }
    initSocket() {
        this.server = net.createServer(socket => {
            this.sender = socket;
            let received = new Uint8Array();
            ;
            let currentSavedLength = 0;
            let currentSavedChunk = 0;
            socket.on('data', data => {
                this.isConnected = true;
                console.log('-----------------------------------------recv data-----------------------------------------');
                let packet = new REDEYE_Packet_1.REDEYE_Packet(data, this.mCurrent_cmd);
                if ((this.mCurrent_cmd == REDEYE_Packet_Cmd_1.Cmd.ARRIVAL_HISTORY_DATA || this.mCurrent_cmd == REDEYE_Packet_Cmd_1.Cmd.ARRIVAL_RAW_DATA) && received.length == 0) {
                    received = new Uint8Array(this.mStream_Size);
                    console.log("mCurrent_cmd: " + REDEYE_Packet_Cmd_1.Cmd[this.mCurrent_cmd]);
                    console.log("mStream_Size: " + this.mStream_Size);
                    console.log("mData_Chunks: " + this.mData_Chunks);
                    received.set(data);
                    currentSavedChunk += 1;
                    currentSavedLength = data.length;
                    console.log("currentSavedChunk: " + currentSavedChunk);
                    console.log("currentSize: " + currentSavedLength);
                }
                else if ((this.mCurrent_cmd == REDEYE_Packet_Cmd_1.Cmd.ARRIVAL_HISTORY_DATA || this.mCurrent_cmd == REDEYE_Packet_Cmd_1.Cmd.ARRIVAL_RAW_DATA) && currentSavedLength < this.mStream_Size) {
                    received.set(data, currentSavedLength);
                    currentSavedLength += data.length;
                    currentSavedChunk += 1;
                    console.log("currentSavedChunk: " + currentSavedChunk);
                    console.log("currentSize: " + currentSavedLength);
                    console.log("received size: " + received.length);
                }
                if ((this.mCurrent_cmd == REDEYE_Packet_Cmd_1.Cmd.ARRIVAL_HISTORY_DATA || this.mCurrent_cmd == REDEYE_Packet_Cmd_1.Cmd.ARRIVAL_RAW_DATA) && currentSavedLength == this.mStream_Size) {
                    packet.cmd = this.mCurrent_cmd;
                    packet.packet_array = received;
                    received = new Uint8Array(0);
                    currentSavedChunk = 0;
                    currentSavedLength = 0;
                    this.handleMessage(packet);
                }
                if (packet.cmd == REDEYE_Packet_Cmd_1.Cmd.PACKET_HELLO_ACK) {
                    this.mCurrent_cmd = REDEYE_Packet_Cmd_1.Cmd.PACKET_HISTORY_DATA;
                    this.packet_byte_array = new Uint8Array();
                    this.packet_verify = new Uint8Array();
                    this.mStream_Size = 0;
                    this.mData_Chunks = 0;
                    this.mCurrent_cmd = REDEYE_Packet_Cmd_1.Cmd.PACKET_UNKNOWN;
                    this.handleMessage(packet);
                }
                else if (packet.cmd == REDEYE_Packet_Cmd_1.Cmd.PACKET_HISTORY_DATA) {
                    this.mCurrent_cmd = REDEYE_Packet_Cmd_1.Cmd.ARRIVAL_HISTORY_DATA;
                    this.handleMessage(packet);
                }
                else if (packet.cmd == REDEYE_Packet_Cmd_1.Cmd.PACKET_NEW_DATA) {
                    this.handleMessage(packet);
                }
                else if (packet.cmd == REDEYE_Packet_Cmd_1.Cmd.PACKET_RAW_DATA) {
                    this.mCurrent_cmd = REDEYE_Packet_Cmd_1.Cmd.ARRIVAL_RAW_DATA;
                    this.handleMessage(packet);
                }
            });
            socket.on('end', function () {
                this.isConnected = false;
                this.packet_byte_array = new Uint8Array();
                this.packet_verify = new Uint8Array();
                this.mStream_Size = 0;
                this.mData_Chunks = 0;
                this.mCurrent_cmd = REDEYE_Packet_Cmd_1.Cmd.PACKET_UNKNOWN;
                console.log(moment().format() + ' socket從客戶端被關閉了');
            });
        });
        this.server.listen(5000, '192.168.4.2');
    }
    async handleMessage(packet) {
        this.packet_byte_array = new Uint8Array();
        // console.log("packet.packet_array: " + JSON.stringify(packet))
        console.log("type: " + REDEYE_Packet_Cmd_1.Cmd[packet.cmd]);
        switch (packet.cmd) {
            case REDEYE_Packet_Cmd_1.Cmd.PACKET_HELLO_ACK:
                this.packet_byte_array = packet.packet_array;
                this.sender.write(this.packet_byte_array);
                break;
            case REDEYE_Packet_Cmd_1.Cmd.PACKET_HISTORY_DATA:
                this.packet_byte_array = packet.packet_array;
                this.mStream_Size = this.packet_byte_array[24] & 0x000000ff | (this.packet_byte_array[25] << 8) & 0x0000ff00 | (this.packet_byte_array[26] << 16) & 0x00ff0000 | (this.packet_byte_array[27] << 24) & 0xff000000;
                this.mData_Chunks = this.packet_byte_array[28] & 0x000000ff | (this.packet_byte_array[29] << 8) & 0x0000ff00 | (this.packet_byte_array[30] << 16) & 0x00ff0000 | (this.packet_byte_array[31] << 24) & 0xff000000;
                this.sender.write(this.packet_byte_array);
                break;
            case REDEYE_Packet_Cmd_1.Cmd.ARRIVAL_HISTORY_DATA:
                packet.isHistoryDataValid(packet.packet_array)
                    .then(resolve => {
                    let head, tail, i, tm_year, tm_month, tm_day, tm_hour, tm_min, tm_sec, value;
                    let recordList = new Array();
                    let currectNum = 20;
                    head = parseInt(packet.packet_array[16].toString(16), 16);
                    tail = parseInt(packet.packet_array[18].toString(16), 16);
                    console.log('head: ' + head);
                    console.log('tail: ' + tail);
                    for (i = head; i < tail; i++) {
                        let recordData = new REDEYE_Record_Data_1.REDEYE_Record_Data();
                        tm_sec = Buffer.from(packet.packet_array.slice(currectNum, currectNum + 4)).readIntLE(0, 4);
                        currectNum += 4;
                        tm_min = Buffer.from(packet.packet_array.slice(currectNum, currectNum + 4)).readIntLE(0, 4);
                        currectNum += 4;
                        tm_hour = Buffer.from(packet.packet_array.slice(currectNum, currectNum + 4)).readIntLE(0, 4);
                        currectNum += 4;
                        tm_day = Buffer.from(packet.packet_array.slice(currectNum, currectNum + 4)).readIntLE(0, 4);
                        currectNum += 4;
                        tm_month = Buffer.from(packet.packet_array.slice(currectNum, currectNum + 4)).readIntLE(0, 4);
                        currectNum += 4;
                        tm_year = Buffer.from(packet.packet_array.slice(currectNum, currectNum + 4)).readIntLE(0, 4);
                        currectNum += 4;
                        value = Buffer.from(packet.packet_array.slice(currectNum, currectNum + 4)).readIntLE(0, 4);
                        currectNum += 4;
                        // let date: Date = new Date();
                        // date.setFullYear(tm_year, tm_month, tm_day);
                        // date.setHours(tm_hour, tm_min, tm_sec);
                        recordData.data_value = value.toString();
                        // recordData.create_datetime = date.toISOString().replace(/T/, ' ').replace(/\..+/, '');
                        recordData.create_datetime = tm_year + "-" + tm_month + "-" + tm_day + " " + tm_hour + ":" + tm_min + ":" + tm_sec;
                        recordList.push(recordData);
                    }
                    try {
                        console.log(JSON.stringify(recordList));
                        let message = new azure_iot_device_1.Message(JSON.stringify(recordList));
                        // this.messageSender(message);
                    }
                    catch (err) {
                        console.log(err);
                    }
                })
                    .catch(reject => {
                    console.log(moment().format() + " stream: ARRIVAL_HISTORY_DATA invalid.");
                });
                this.packet_verify = await packet.StreamVerifyAck();
                this.mCurrent_cmd = REDEYE_Packet_Cmd_1.Cmd.PACKET_UNKNOWN;
                this.mStream_Size = 0;
                this.mData_Chunks = 0;
                this.sender.write(this.packet_verify);
                break;
            case REDEYE_Packet_Cmd_1.Cmd.PACKET_SYNC_TIME:
                this.packet_verify = await packet.StreamVerifyAck();
                this.sender.write(this.packet_verify);
                break;
            case REDEYE_Packet_Cmd_1.Cmd.PACKET_NEW_DATA:
                let head, tm_year, tm_month, tm_day, tm_hour, tm_min, tm_sec, value;
                this.packet_New_Data = new REDEYE_New_Data_1.REDEYE_New_Data();
                this.packet_byte_array = packet.packet_array;
                let currectNum = 24;
                tm_sec = Buffer.from(packet.packet_array.slice(currectNum, currectNum + 4)).readIntLE(0, 4);
                currectNum += 4;
                tm_min = Buffer.from(packet.packet_array.slice(currectNum, currectNum + 4)).readIntLE(0, 4);
                currectNum += 4;
                tm_hour = Buffer.from(packet.packet_array.slice(currectNum, currectNum + 4)).readIntLE(0, 4);
                currectNum += 4;
                tm_day = Buffer.from(packet.packet_array.slice(currectNum, currectNum + 4)).readIntLE(0, 4);
                currectNum += 4;
                tm_month = Buffer.from(packet.packet_array.slice(currectNum, currectNum + 4)).readIntLE(0, 4);
                currectNum += 4;
                tm_year = Buffer.from(packet.packet_array.slice(currectNum, currectNum + 4)).readIntLE(0, 4);
                currectNum += 4;
                value = Buffer.from(packet.packet_array.slice(currectNum, currectNum + 4)).readIntLE(0, 4);
                currectNum += 4;
                this.packet_New_Data.data_value = value.toString();
                this.packet_New_Data.create_datetime = moment().format().replace(/T/, ' ').replace(/\..+/, '');
                console.log(JSON.stringify(this.packet_New_Data));
                this.lastTestResult = value;
                let message = JSON.stringify({ testResult: value });
                this.sendTelemetry(this.azureClient, message, this.resultIndex).catch((err) => console.log('error ', err.toString()));
                this.resultIndex += 1;
                this.sender.write(this.packet_byte_array);
                break;
            case REDEYE_Packet_Cmd_1.Cmd.PACKET_RAW_DATA:
                this.packet_byte_array = packet.packet_array;
                this.mStream_Size = this.packet_byte_array[24] & 0x000000ff | (this.packet_byte_array[25] << 8) & 0x0000ff00 | (this.packet_byte_array[26] << 16) & 0x00ff0000 | (this.packet_byte_array[27] << 24) & 0xff000000;
                this.mData_Chunks = this.packet_byte_array[28] & 0x000000ff | (this.packet_byte_array[29] << 8) & 0x0000ff00 | (this.packet_byte_array[30] << 16) & 0x00ff0000 | (this.packet_byte_array[31] << 24) & 0xff000000;
                this.sender.write(this.packet_byte_array);
                break;
            case REDEYE_Packet_Cmd_1.Cmd.ARRIVAL_RAW_DATA:
                packet.isRawDataValid(packet.packet_array)
                    .then(resolve => {
                    let wavelength, blank, sample;
                    let rawList = new Array();
                    for (let i = 0; i < 40; i++) {
                        let rawData = new REDEYE_New_Data_1.REDEYE_Raw_Data();
                        console.log("round " + i.toString() + ",wavelength raw: " + Buffer.from(packet.packet_array.slice(16 + 8 * i, 16 + 8 * i + 8)).toString('hex'));
                        console.log("round " + i.toString() + ",blank      raw: " + Buffer.from(packet.packet_array.slice(16 + 8 * i + 320, 16 + 8 * i + 8 + 320)).toString('hex'));
                        console.log("round " + i.toString() + ",sample     raw: " + Buffer.from(packet.packet_array.slice(16 + 8 * i + 640, 16 + 8 * i + 8 + 640)).toString('hex'));
                        wavelength = parseFloat(Buffer.from(packet.packet_array.slice(16 + 8 * i, 16 + 8 * i + 8)).readDoubleLE(0).toFixed(6));
                        blank = parseFloat(Buffer.from(packet.packet_array.slice(16 + 8 * i + 320, 16 + 8 * i + 8 + 320)).readDoubleLE(0).toFixed(6));
                        sample = parseFloat(Buffer.from(packet.packet_array.slice(16 + 8 * i + 640, 16 + 8 * i + 8 + 640)).readDoubleLE(0).toFixed(6));
                        rawData.wavelength = wavelength;
                        rawData.blank = 0;
                        rawData.sample = sample;
                        rawList.push(rawData);
                    }
                    // console.log(JSON.stringify(rawList));
                    try {
                        this.packet_New_Data.spectrum = rawList;
                        this.lastTestResultSpectrum = JSON.stringify(this.packet_New_Data);
                        console.log(JSON.stringify(this.packet_New_Data));
                        let message = JSON.stringify({ testResultSpectrum: rawList });
                        this.sendTelemetry(this.azureClient, message, this.spectrumIndex).catch((err) => console.log('error ', err.toString()));
                        this.spectrumIndex += 1;
                        // let index = 0;
                        // rawList.forEach(element => {
                        //   this.sendTelemetry(this.azureClient, JSON.stringify(element), index, testResultspectrum).catch((err) => console.log('error ', err.toString()));
                        //   index = index + 1;
                        // })
                    }
                    catch (err) {
                        console.log(err);
                    }
                })
                    .catch(reject => {
                    console.log(moment().format() + " stream: PACKET_RAW_DATA invalid.");
                });
                this.mCurrent_cmd = REDEYE_Packet_Cmd_1.Cmd.PACKET_UNKNOWN;
                this.mStream_Size = 0;
                this.mData_Chunks = 0;
                break;
        }
    }
}
exports.REDEYE_Device = REDEYE_Device;
function getFloat(data) {
    return new DataView(data.buffer).getFloat64(0);
}
let config;
fs.readFile(path.join(__dirname, '../config.json'), 'utf-8', (error, data) => {
    if (error) {
        console.log('read error ' + error);
        process.exit(0);
    }
    else {
        config = JSON.parse(data);
        console.log('read success.');
    }
});
setTimeout(() => {
    let redeyeDevice = new REDEYE_Device(config);
    setTimeout(() => {
        redeyeDevice.initSocket();
    }, 500);
}, 3000);
