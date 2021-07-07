"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const wifi = require("node-wifi");
const moment = require("moment");
const fs = require("fs");
const path = require("path");
class WiFi {
    constructor(SSID) {
        this.isDeviceConnected = false;
        this.connectingDeviceSSID = SSID;
        this.initWiFi();
    }
    initWiFi() {
        wifi.init({
            iface: 'wlan0' // network interface, choose a random wifi interface if set to null
        });
    }
    isValidSSID(SSID) {
        /*
        Return true or false to ensure the gateway connected wifi SSID is valid
        If not, disconnect current connected wifi
        A valid Redeye-1-Plus default SSID format is REDEYE-[0-9A-Fa-f]{12}
        */
        console.log(moment().format() + ": Current connected SSID: " + SSID);
        if (SSID.includes('REDEYE-') && SSID.length == 19) {
            console.log(moment().format() + ": Found redeye ssid");
            return true;
        }
        else {
            this.disconnect();
            console.log(moment().format() + ": Not a valid redeye device SSID");
            return false;
        }
    }
    scan() {
        wifi.scan()
            .then(networks => {
            networks.forEach(wifis => {
                if (wifis.ssid == this.connectingDeviceSSID && this.isValidSSID(wifis.ssid)) {
                    wifi.connect({ ssid: wifis.ssid, password: '0123456789' }, error => {
                        if (error) {
                            console.log(error);
                        }
                        this.connectedDeviceSSID = wifis.ssid;
                        this.isDeviceConnected = true;
                        console.log(moment().format() + 'redeye device Connected.');
                    });
                }
            });
        })
            .catch(error => {
            console.log(moment().format() + "wifi connecting failed. " + error);
        });
    }
    disconnect() {
        wifi.disconnect(error => {
            if (error) {
                console.log(error);
            }
            else {
                this.isDeviceConnected = false;
                console.log(moment().format() + 'Disconnected');
            }
        });
    }
}
exports.WiFi = WiFi;
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
    let wf = new WiFi(config.REDEYE_DEVICE_SSID);
    wf.scan();
}, 2000);
