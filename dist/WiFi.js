"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const wifi = require("node-wifi");
const moment = require("moment");
const pcap = require("pcap");
const tcp_tracker = new pcap.TCPTracker();
// const pcap_session = pcap.createSession('wlan0', { filter: "ip proto \\tcp" });
const pcap_session = pcap.createSession('en0', { filter: "ip proto \\tcp" });
class WiFi {
    constructor() {
        this.initWiFi();
    }
    initWiFi() {
        wifi.init({
            iface: 'en0' // network interface, choose a random wifi interface if set to null
        });
    }
    isValidSSID(SSID) {
        console.log(moment().format() + ": Current connected SSID: " + SSID);
        if (SSID.includes('REDEYE')) {
            console.log(moment().format() + ": Found redeye ssid");
            return true;
        }
        else {
            console.log(moment().format() + ": Not a valid redeye device SSID");
            return false;
        }
    }
    initPCAP() {
        tcp_tracker.on('session', session => {
            // console.log("Start of session between " + session.src_name + " and " + session.dst_name);
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
    scan() {
        wifi.scan((error, networks) => {
            if (error) {
                console.log(error);
            }
            else {
                console.log(networks);
                networks.forEach(wifis => {
                    if (this.isValidSSID(wifis.ssid)) {
                        try {
                            wifi.connect({ ssid: wifis.ssid, password: '0123456789' }, error => {
                                if (error) {
                                    console.log(error);
                                }
                                console.log('Connected');
                            });
                        }
                        catch (err) {
                            console.log(moment().format() + "wifi connecting failed. " + err);
                        }
                    }
                });
            }
        });
    }
    disconnect() {
        wifi.disconnect(error => {
            if (error) {
                console.log(error);
            }
            else {
                console.log('Disconnected');
            }
        });
    }
}
exports.WiFi = WiFi;
