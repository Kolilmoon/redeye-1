"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const moment = require("moment");
const crypto = require("crypto");
const REDEYE_Packet_Cmd_1 = require("./REDEYE_Packet_Cmd");
class REDEYE_Packet {
    constructor(data, currentCmd) {
        this.md5sum = crypto.createHash('md5');
        this.cmd = currentCmd;
        // console.info("packet info: " + data.toString('hex'));
        this.isValidePacket(data)
            .then(resolve => {
            console.log(' isValid packet. Type: ' + REDEYE_Packet_Cmd_1.Cmd[this.cmd]);
        })
            .catch(rejects => {
            console.log('isNotValid packet or its RX_DATA. Type:' + REDEYE_Packet_Cmd_1.Cmd[this.cmd]);
        });
    }
    StreamVerifyAck() {
        this.md5sum = crypto.createHash('md5');
        return new Promise((resolve, reject) => {
            let packet_buf;
            let packet_verify;
            let arr;
            switch (this.cmd) {
                case REDEYE_Packet_Cmd_1.Cmd.ARRIVAL_HISTORY_DATA:
                    packet_buf = new Uint8Array(40);
                    packet_verify = new Uint8Array(40);
                    packet_buf.set([parseInt(REDEYE_Packet_Cmd_1.Cmd.PACKET_VERIFY_DATA.toString(16))], 0);
                    packet_buf.set([40], 4);
                    packet_verify = packet_buf;
                    packet_verify.set(this.stream_md5sum_digits.slice(0, 16), 24);
                    arr = new Uint8Array(packet_verify.slice(0, 8).length + packet_verify.slice(24, 40).length);
                    arr.set(packet_verify.slice(0, 8));
                    arr.set(packet_verify.slice(24, 40), packet_verify.slice(0, 8).length);
                    this.md5sum.update(arr);
                    this.md5sum_digits_check = Uint8Array.from(this.md5sum.digest());
                    packet_verify.set(arr.slice(0, 16), 8);
                    resolve(packet_verify);
                    break;
                case REDEYE_Packet_Cmd_1.Cmd.PACKET_SYNC_TIME:
                    packet_buf = new Uint8Array(40);
                    packet_verify = new Uint8Array(40);
                    packet_buf.set([parseInt(REDEYE_Packet_Cmd_1.Cmd.PACKET_SYNC_TIME.toString(16))], 0);
                    packet_buf.set([48], 4);
                    packet_buf.set([moment().second()], 8);
                    packet_buf.set([moment().minute()], 12);
                    packet_buf.set([moment().hour()], 16);
                    packet_buf.set([moment().daysInMonth()], 20);
                    packet_buf.set([moment().month()], 24);
                    packet_buf.set([moment().year()], 28);
                    packet_verify = packet_buf;
                    packet_verify.set(this.stream_md5sum_digits.slice(0, 16), 24);
                    arr = new Uint8Array(packet_verify.slice(0, 8).length + packet_verify.slice(24, 40).length);
                    arr.set(packet_verify.slice(0, 8));
                    arr.set(packet_verify.slice(24, 40), packet_verify.slice(0, 8).length);
                    this.md5sum.update(arr);
                    this.md5sum_digits_check = Uint8Array.from(this.md5sum.digest());
                    packet_verify.set(arr.slice(0, 16), 8);
                    resolve(packet_verify);
                    break;
                default:
                    reject();
            }
        });
    }
    isHistoryDataValid(b) {
        this.md5sum = crypto.createHash('md5');
        let head = b[16] | b[17] << 8;
        let tail = b[18] | b[19] << 8;
        this.md5sum_digits = b.slice(0, 16);
        if (b.length > 16) {
            this.md5sum.update(b.slice(16, Math.min(b.length - 16, 4 + 28 * tail)));
        }
        this.md5sum_digits_check = Uint8Array.from(this.md5sum.digest());
        this.stream_md5sum_digits = new Uint8Array(this.md5sum_digits_check.length);
        this.stream_md5sum_digits.set(this.md5sum_digits_check);
        return new Promise((resolve, rejects) => {
            if (this.md5sum_digits.length == this.md5sum_digits_check.length && this.md5sum_digits.some((v) => this.md5sum_digits_check.indexOf(v) >= 0)) {
                resolve(true);
            }
            else {
                rejects(false);
            }
        });
    }
    isRawDataValid(b) {
        this.md5sum = crypto.createHash('md5');
        this.md5sum_digits = b.slice(0, 16);
        this.md5sum.update(b.slice(16, b.length));
        this.md5sum_digits_check = Uint8Array.from(this.md5sum.digest());
        this.stream_md5sum_digits = new Uint8Array(this.md5sum_digits_check.length);
        this.stream_md5sum_digits.set(this.md5sum_digits_check);
        return new Promise((resolve, rejects) => {
            if (this.md5sum_digits.length == this.md5sum_digits_check.length && this.md5sum_digits.some((v) => this.md5sum_digits_check.indexOf(v) >= 0)) {
                resolve(true);
            }
            else {
                rejects(false);
            }
        });
    }
    isValidePacket(data) {
        this.md5sum = crypto.createHash('md5');
        const type = parseInt(data.slice(0, 1).toString('hex'), 16);
        const length = parseInt(data.slice(4, 5).toString('hex'), 16);
        const b = Uint8Array.from(data);
        if (this.cmd == REDEYE_Packet_Cmd_1.Cmd.PACKET_UNKNOWN) {
            switch (type) {
                case REDEYE_Packet_Cmd_1.Cmd.PACKET_HELLO_ACK:
                    this.cmd = REDEYE_Packet_Cmd_1.Cmd.PACKET_HELLO_ACK;
                    break;
                case REDEYE_Packet_Cmd_1.Cmd.PACKET_HISTORY_DATA:
                    this.cmd = REDEYE_Packet_Cmd_1.Cmd.PACKET_HISTORY_DATA;
                    break;
                case REDEYE_Packet_Cmd_1.Cmd.PACKET_NEW_DATA:
                    this.cmd = REDEYE_Packet_Cmd_1.Cmd.PACKET_NEW_DATA;
                    break;
                case REDEYE_Packet_Cmd_1.Cmd.PACKET_SYNC_TIME:
                    this.cmd = REDEYE_Packet_Cmd_1.Cmd.PACKET_SYNC_TIME;
                    break;
                case REDEYE_Packet_Cmd_1.Cmd.PACKET_OTA_INFO:
                    this.cmd = REDEYE_Packet_Cmd_1.Cmd.PACKET_OTA_INFO;
                    break;
                case REDEYE_Packet_Cmd_1.Cmd.PACKET_RAW_DATA:
                    this.cmd = REDEYE_Packet_Cmd_1.Cmd.PACKET_RAW_DATA;
                    this.data_chunks = b[24];
                    this.packet_array = new Uint8Array(length);
                    this.packet_array.set(b);
                    return new Promise((resolve, reject) => {
                        reject(false);
                    });
                    break;
                default:
                    this.cmd = REDEYE_Packet_Cmd_1.Cmd.PACKET_UNKNOWN;
            }
        }
        else if (this.cmd == REDEYE_Packet_Cmd_1.Cmd.PACKET_HISTORY_DATA) {
            this.data_chunks = b[24];
            this.packet_array = new Uint8Array(length);
            this.packet_array.set(b);
            return new Promise((resolve, reject) => {
                reject(false);
            });
        }
        console.log('length: ' + length);
        this.md5sum_digits = b.slice(8, 24);
        let arr = new Uint8Array(b.slice(0, 8).length + b.slice(24, length).length);
        arr.set(b.slice(0, 8));
        arr.set(b.slice(24, length), b.slice(0, 8).length);
        this.md5sum.update(arr);
        this.md5sum_digits_check = Uint8Array.from(this.md5sum.digest());
        return new Promise((resolve, reject) => {
            if (this.md5sum_digits.length == this.md5sum_digits_check.length && this.md5sum_digits.some((v) => this.md5sum_digits_check.indexOf(v) >= 0)) {
                this.packet_array = new Uint8Array(length);
                this.packet_array.set(b);
                resolve(true);
            }
            else {
                reject(false);
            }
        });
    }
}
exports.REDEYE_Packet = REDEYE_Packet;
