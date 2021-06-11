import * as moment from 'moment';
import * as aziotmqtt from 'azure-iot-device-mqtt'
import * as aziotdevice from 'azure-iot-device';

const Protocol = aziotmqtt.Mqtt;
const Client = aziotdevice.Client;

export class Azure_IoT_Device {

  deviceConnectionString: string;
  isConnected: boolean;

  azureClient: aziotdevice.Client;

  constructor(deviceConnectionString: string) {
    this.deviceConnectionString = deviceConnectionString;
    this.azureClient = Client.fromConnectionString(this.deviceConnectionString, Protocol);
    this.initConnection();
  }

  private initConnection() {
    this.azureClient.on('connect', this.connectCallback);
    this.azureClient.on('error', this.errorCallback);
    this.azureClient.on('disconnect', this.disconnectHandler);
    this.azureClient.on('message', this.messageHandler);

    this.azureClient.open()
    .catch(err => {
      console.error('Could not connect: ' + err.message);
    });
  }

  messageSender(message: aziotdevice.Message) {
    console.log(moment().format() + 'Sending message: ' + message.getData());
    this.azureClient.sendEvent(message, this.printResultFor('send'));
  }

  private messageHandler(msg) {
    console.log('Id: ' + msg.messageId + ' Body: ' + msg.data);
    this.azureClient.complete(msg, this.printResultFor('completed'));
  }

  private disconnectHandler() {
    this.azureClient.open().catch((err) => {
      console.error(err.message);
    });
  }

  private connectCallback() {
    console.log(moment().format() + 'Client connected');
  }

  private errorCallback(err) {
    console.error(err.message);
  }

  private printResultFor(op) {
    return function printResult(err, res) {
      if (err) console.log(op + ' error: ' + err.toString());
      if (res) console.log(op + ' status: ' + res.constructor.name);
    };
  }

}
