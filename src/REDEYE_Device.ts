import * as net from 'net';
import * as moment from 'moment';
import * as systeminformation from 'systeminformation';

import { REDEYE_Packet } from './REDEYE_Packet';
import { REDEYE_Record_Data } from './REDEYE_Record_Data'
import { REDEYE_Raw_Data } from './REDEYE_Raw_Data';
import { Cmd } from "./REDEYE_Packet_Cmd";
import { WiFi } from './WiFi';

export class REDEYE_Device extends WiFi {

  packet_byte_array: Uint8Array;
  packet_verify: Uint8Array;

  mStream_Size: number;
  mData_Chunks: number;
  mCurrent_cmd: Cmd;

  server: net.Server;
  sender: net.Socket;

  constructor() {
    super();
    this.packet_byte_array = new Uint8Array();
    this.packet_verify = new Uint8Array();
    this.mStream_Size = 0;
    this.mData_Chunks = 0;
    this.mCurrent_cmd = Cmd.PACKET_UNKNOWN;

    systeminformation.wifiConnections(info => {
      if (device.isValidSSID(info[0].ssid)) {
        device.initPCAP();
        device.initSocket();
      }
    })
  }

  initSocket() {
    this.server = net.createServer(socket => {
      this.sender = socket;
      let received: Uint8Array = new Uint8Array();;
      let currentSavedLength: number = 0;
      let currentSavedChunk: number = 0;

      socket.on('data', data => {
        console.log('-----------------------------------------recv data-----------------------------------------');
        let packet = new REDEYE_Packet(data, this.mCurrent_cmd);

        if ((this.mCurrent_cmd == Cmd.ARRIVAL_HISTORY_DATA || this.mCurrent_cmd == Cmd.ARRIVAL_RAW_DATA) && received.length == 0) {
          received = new Uint8Array(this.mStream_Size);
          console.log("mCurrent_cmd: " + Cmd[this.mCurrent_cmd])
          console.log("mStream_Size: " + this.mStream_Size);
          console.log("mData_Chunks: " + this.mData_Chunks);
          received.set(data);
          currentSavedChunk += 1;
          currentSavedLength = data.length;
          console.log("currentSavedChunk: " + currentSavedChunk);
          console.log("currentSize: " + currentSavedLength);
        } else if ((this.mCurrent_cmd == Cmd.ARRIVAL_HISTORY_DATA || this.mCurrent_cmd == Cmd.ARRIVAL_RAW_DATA) && currentSavedLength < this.mStream_Size) {
          received.set(data, currentSavedLength)
          currentSavedLength += data.length;
          currentSavedChunk += 1;
          console.log("currentSavedChunk: " + currentSavedChunk);
          console.log("currentSize: " + currentSavedLength);
          console.log("received size: " + received.length);
        }

        if ((this.mCurrent_cmd == Cmd.ARRIVAL_HISTORY_DATA || this.mCurrent_cmd == Cmd.ARRIVAL_RAW_DATA) && currentSavedLength == this.mStream_Size) {
          packet.cmd = this.mCurrent_cmd;
          packet.packet_array = received;
          received = new Uint8Array(0);
          currentSavedChunk = 0;
          currentSavedLength = 0;
          this.handleMessage(packet);
        }

        if (packet.cmd == Cmd.PACKET_HELLO_ACK) {
          this.mCurrent_cmd = Cmd.PACKET_HISTORY_DATA;
          this.handleMessage(packet)
        } else if (packet.cmd == Cmd.PACKET_HISTORY_DATA) {
          this.mCurrent_cmd = Cmd.ARRIVAL_HISTORY_DATA;
          this.handleMessage(packet)
        } else if (packet.cmd == Cmd.PACKET_NEW_DATA) {
          this.handleMessage(packet)
        } else if (packet.cmd == Cmd.PACKET_RAW_DATA) {
          this.mCurrent_cmd = Cmd.ARRIVAL_RAW_DATA;
          this.handleMessage(packet)
        }

      });

      socket.on('end', function () {
        console.log(moment().format() + ' socket從客戶端被關閉了');
      });
    });

    this.server.listen(5000, '192.168.4.2');
  }

  async handleMessage(packet: REDEYE_Packet) {
    this.packet_byte_array = new Uint8Array();
    console.log("packet.packet_array: " + JSON.stringify(packet))
    console.log("type: " + Cmd[packet.cmd])

    switch (packet.cmd) {
      case Cmd.PACKET_HELLO_ACK:
        this.packet_byte_array = packet.packet_array;
        this.sender.write(this.packet_byte_array);
        break
      case Cmd.PACKET_HISTORY_DATA:
        this.packet_byte_array = packet.packet_array;
        this.mStream_Size = this.packet_byte_array[24] & 0x000000ff | (this.packet_byte_array[25] << 8) & 0x0000ff00 | (this.packet_byte_array[26] << 16) & 0x00ff0000 | (this.packet_byte_array[27] << 24) & 0xff000000;
        this.mData_Chunks = this.packet_byte_array[28] & 0x000000ff | (this.packet_byte_array[29] << 8) & 0x0000ff00 | (this.packet_byte_array[30] << 16) & 0x00ff0000 | (this.packet_byte_array[31] << 24) & 0xff000000;
        this.sender.write(this.packet_byte_array);
        break
      case Cmd.ARRIVAL_HISTORY_DATA:
        packet.isHistoryDataValid(packet.packet_array)
          .then(resolve => {
            let head: number, tail: number, i: number, tm_year: number, tm_month: number, tm_day: number, tm_hour: number, tm_min: number, tm_sec: number, value: number;
            let recordList: Array<REDEYE_Record_Data> = new Array<REDEYE_Record_Data>();

            let currectNum: number = 20;

            head = parseInt(packet.packet_array[16].toString(16), 16);
            tail = parseInt(packet.packet_array[18].toString(16), 16);

            console.log('head: ' + head);
            console.log('tail: ' + tail);

            for (i = head; i < tail; i++) {
              let recordData: REDEYE_Record_Data = new REDEYE_Record_Data();

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
              recordData.create_datetime = tm_year + "-" + tm_month + "-" + tm_day + " " + tm_hour + ":" + tm_min + ":" + tm_sec

              recordList.push(recordData);
            }

            console.log(JSON.stringify(recordList));
          })
          .catch(reject => {
            console.log(moment().format() + "stream: ARRIVAL_HISTORY_DATA invalid.")
          })

        this.packet_verify = await packet.StreamVerifyAck()
        this.mCurrent_cmd = Cmd.PACKET_UNKNOWN;
        this.mStream_Size = 0;
        this.mData_Chunks = 0;

        this.sender.write(this.packet_verify);
        break
      case Cmd.PACKET_NEW_DATA:
        let head: number, tm_year: number, tm_month: number, tm_day: number, tm_hour: number, tm_min: number, tm_sec: number, value: number;
        let recordData: REDEYE_Record_Data = new REDEYE_Record_Data();
        this.packet_byte_array = packet.packet_array;

        let currectNum: number = 24;

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

        recordData.data_value = value.toString();
        recordData.create_datetime = tm_year + "-" + tm_month + "-" + tm_day + " " + tm_hour + ":" + tm_min + ":" + tm_sec
        console.log(JSON.stringify(recordData));

        this.sender.write(this.packet_byte_array);
        break
      case Cmd.PACKET_RAW_DATA:
        this.packet_byte_array = packet.packet_array;
        this.mStream_Size = this.packet_byte_array[24] & 0x000000ff | (this.packet_byte_array[25] << 8) & 0x0000ff00 | (this.packet_byte_array[26] << 16) & 0x00ff0000 | (this.packet_byte_array[27] << 24) & 0xff000000;
        this.mData_Chunks = this.packet_byte_array[28] & 0x000000ff | (this.packet_byte_array[29] << 8) & 0x0000ff00 | (this.packet_byte_array[30] << 16) & 0x00ff0000 | (this.packet_byte_array[31] << 24) & 0xff000000;
        this.sender.write(this.packet_byte_array);
        break
      case Cmd.ARRIVAL_RAW_DATA:
        packet.isRawDataValid(packet.packet_array)
          .then(resolve => {
            let head: number, tail: number, i: number, wavelength: number, blank: number, sample: number;
            let rawList: Array<REDEYE_Raw_Data> = new Array<REDEYE_Raw_Data>();
            let currectNum1: number = 16;
            let currectNum2: number = 336;
            let currectNum3: number = 656;

            head = 0;
            tail = 40
            console.log('head: ' + head);
            console.log('tail: ' + tail);

            for (i = head; i < tail; i++) {
              let rawData: REDEYE_Raw_Data = new REDEYE_Raw_Data();

              wavelength = parseFloat(Buffer.from(packet.packet_array.slice(currectNum1, currectNum1 + 8)).readDoubleLE().toFixed(6));
              currectNum1 += 8;
              blank = parseFloat(getFloat(packet.packet_array.slice(currectNum2, currectNum2 + 8)).toFixed(6));
              console.log("blanK: " + getFloat(packet.packet_array.slice(currectNum2, currectNum2 + 8)).toFixed(6));
              currectNum2 += 8;
              sample = parseFloat(Buffer.from(packet.packet_array.slice(currectNum3, currectNum3 + 8)).readDoubleLE().toFixed(6));
              currectNum3 += 8;

              rawData.wavelength = wavelength;
              rawData.blank = blank;
              rawData.sample = sample;

              rawList.push(rawData);
            }

            console.log(JSON.stringify(rawList));
          })
          .catch(reject => {
            console.log(moment().format() + "stream: PACKET_RAW_DATA invalid.")
          })

        this.mCurrent_cmd = Cmd.PACKET_UNKNOWN;
        this.mStream_Size = 0;
        this.mData_Chunks = 0;

        break
    }
  }
}

function getFloat(array: Uint8Array): number {
  var view = new DataView(new ArrayBuffer(8));
  array.forEach(function (b, i) {
    view.setUint8(i, b);
  });
  return view.getFloat64(0);
}

let device = new REDEYE_Device();
device;