"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pcap = require("pcap");
const net = require("net");
const wifi = require("node-wifi");
const systeminformation = require("systeminformation");
const REDEYE_Packet_1 = require("./REDEYE_Packet");
const tcp_tracker = new pcap.TCPTracker();
// const pcap_session = pcap.createSession('wlan0', { filter: "ip proto \\tcp" });
const pcap_session = pcap.createSession('en0', { filter: "ip proto \\tcp" });
wifi.init({
    iface: null
});
wifi.scan((error, networks) => {
    if (error) {
        console.log(error);
    }
    else {
        console.log(networks);
        /*
            networks = [
                {
                  ssid: '...',
                  bssid: '...',
                  mac: '...', // equals to bssid (for retrocompatibility)
                  channel: <number>,
                  frequency: <number>, // in MHz
                  signal_level: <number>, // in dB
                  quality: <number>, // same as signal level but in %
                  security: 'WPA WPA2' // format depending on locale for open networks in Windows
                  security_flags: '...' // encryption protocols (format currently depending of the OS)
                  mode: '...' // network mode like Infra (format currently depending of the OS)
                },
                ...
            ];
            */
    }
});
class Main {
    constructor() {
        systeminformation.wifiConnections(info => {
            if (this.isValidSSID(info[0].ssid)) {
                this.initPCAP();
                this.inifSocket();
            }
        });
    }
    isValidSSID(SSID) {
        console.log(SSID);
        if (SSID.includes('REDEYE')) {
            console.log("found redeye ssid");
            return true;
        }
        else {
            console.log("Not a valid redeye device SSID");
            return false;
        }
    }
    initPCAP() {
        tcp_tracker.on('session', session => {
            // console.log("Start of session between " + session.src_name + " and " + session.dst_name);
            session.on('end', session => {
                console.log("End of TCP session between " + session.src_name + " and " + session.dst_name);
            });
        });
        pcap_session.on('packet', raw_packet => {
            let packet = pcap.decode.packet(raw_packet);
            tcp_tracker.track_packet(packet);
            // console.log(packet.payload.payload);
        });
    }
    inifSocket() {
        const server = net.createServer(socket => {
            console.log('接收連線');
            let received = "";
            socket.on('data', data => {
                received += data;
                let packet = new REDEYE_Packet_1.REDEYE_Packet(data);
            });
            socket.on('end', function () {
                console.log('socket從客戶端被關閉了');
            });
        });
        server.listen(5000, '192.168.4.2');
    }
}
// let main = new Main();
// main;
