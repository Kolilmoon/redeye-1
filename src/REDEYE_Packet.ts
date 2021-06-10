import * as moment from 'moment';
import * as crypto from 'crypto';

import { Cmd } from './REDEYE_Packet_Cmd';

export class REDEYE_Packet {
    cmd: Cmd;
    length: number;

    stream_md5sum_digits: Uint8Array;
    packet_array: Uint8Array;
    data_chunks: number;

    md5sum: crypto.Hash = crypto.createHash('md5');
    md5sum_digits: Uint8Array;
    md5sum_digits_check: Uint8Array;

    constructor(data: Buffer, currentCmd: Cmd) {
        this.cmd = currentCmd;
        console.info("packet info: " + data.toString('hex'));
        this.isValidePacket(data)
            .then(resolve => {
                console.log(' isValid packet. Type: ' + Cmd[this.cmd])
            })
            .catch(rejects => {
                console.log('isNotValid packet or its RX_DATA. Type:' + Cmd[this.cmd])
            });
    }

    StreamVerifyAck(): Promise<Uint8Array> {
        this.md5sum = crypto.createHash('md5');
        return new Promise((resolve, reject) => {
            if (this.cmd == Cmd.ARRIVAL_HISTORY_DATA) {
                try {
                    let packet_buf = new Uint8Array(40);
                    let packet_verify = new Uint8Array(40);
                    packet_buf.set([parseInt(Cmd.PACKET_VERIFY_DATA.toString(16))], 0);
                    packet_buf.set([40], 4);

                    packet_verify = packet_buf;
                    packet_verify.set(this.stream_md5sum_digits.slice(0, 16), 24);

                    let arr = new Uint8Array(packet_verify.slice(0, 8).length + packet_verify.slice(24, 40).length);
                    arr.set(packet_verify.slice(0, 8));
                    arr.set(packet_verify.slice(24, 40), packet_verify.slice(0, 8).length);
                    this.md5sum.update(arr);
                    this.md5sum_digits_check = Uint8Array.from(this.md5sum.digest());

                    packet_verify.set(arr.slice(0, 16), 8);
                    resolve(packet_verify);
                } catch (err) {
                    console.log(moment().format() + ' not Valid StreamVerifyAck.')
                    reject()
                }
            } else {
                console.log(moment().format() + ' not Valid PACKET_HISTORY_DATA StreamVerifyAck.')
                reject()
            }
        })
    }

    isHistoryDataValid(b: Uint8Array): Promise<Boolean> {
        this.md5sum = crypto.createHash('md5');
        let head: number = b[16] | b[17] << 8
        let tail: number = b[18] | b[19] << 8;

        this.md5sum_digits = b.slice(0, 16);

        if (b.length > 16) {
            this.md5sum.update(b.slice(16, Math.min(b.length - 16, 4 + 28 * tail)))
        }

        this.md5sum_digits_check = Uint8Array.from(this.md5sum.digest());
        this.stream_md5sum_digits = new Uint8Array(this.md5sum_digits_check.length);
        this.stream_md5sum_digits.set(this.md5sum_digits_check);

        return new Promise((resolve, rejects) => {
            if (this.md5sum_digits.length == this.md5sum_digits_check.length && this.md5sum_digits.some((v) => this.md5sum_digits_check.indexOf(v) >= 0)) {
                resolve(true)
            } else {
                rejects(false)
            }
        })
    }

    isRawDataValid(b: Uint8Array): Promise<Boolean> {
        this.md5sum = crypto.createHash('md5');

        this.md5sum_digits = b.slice(0, 16);
        this.md5sum.update(b.slice(16, b.length))

        this.md5sum_digits_check = Uint8Array.from(this.md5sum.digest());
        this.stream_md5sum_digits = new Uint8Array(this.md5sum_digits_check.length);
        this.stream_md5sum_digits.set(this.md5sum_digits_check);

        return new Promise((resolve, rejects) => {
            if (this.md5sum_digits.length == this.md5sum_digits_check.length && this.md5sum_digits.some((v) => this.md5sum_digits_check.indexOf(v) >= 0)) {
                resolve(true)
            } else {
                rejects(false)
            }
        })
    }

    isValidePacket(data: Buffer): Promise<Boolean> {
        this.md5sum = crypto.createHash('md5');
        const type: number = parseInt(data.slice(0, 1).toString('hex'), 16)
        const length: number = parseInt(data.slice(4, 5).toString('hex'), 16)
        const b: Uint8Array = Uint8Array.from(data);

        if (this.cmd == Cmd.PACKET_UNKNOWN) {
            switch (type) {
                case Cmd.PACKET_HELLO_ACK:
                    this.cmd = Cmd.PACKET_HELLO_ACK;
                    break
                case Cmd.PACKET_HISTORY_DATA:
                    this.cmd = Cmd.PACKET_HISTORY_DATA;
                    break
                case Cmd.PACKET_NEW_DATA:
                    this.cmd = Cmd.PACKET_NEW_DATA;
                    break
                case Cmd.PACKET_RAW_DATA:
                    this.cmd = Cmd.PACKET_RAW_DATA;
                    this.data_chunks = b[24];
                    this.packet_array = new Uint8Array(length);
                    this.packet_array.set(b);
                    return new Promise((resolve, reject) => {
                        reject(false);
                    })
                    break
                default:
                    this.cmd = Cmd.PACKET_UNKNOWN;
            }
        } else if (this.cmd == Cmd.PACKET_HISTORY_DATA) {
            this.data_chunks = b[24];
            this.packet_array = new Uint8Array(length);
            this.packet_array.set(b);
            return new Promise((resolve, reject) => {
                reject(false);
            })
        }
        console.log('length: ' + length)

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
                resolve(true)
            } else {
                reject(false)
            }
        })
    }
}