"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Cmd;
(function (Cmd) {
    Cmd[Cmd["PACKET_UNKNOWN"] = 128] = "PACKET_UNKNOWN";
    Cmd[Cmd["PACKET_IS_SOCKET_ALIVE"] = 129] = "PACKET_IS_SOCKET_ALIVE";
    Cmd[Cmd["PACKET_HELLO_ACK"] = 130] = "PACKET_HELLO_ACK";
    Cmd[Cmd["PACKET_HISTORY_DATA"] = 131] = "PACKET_HISTORY_DATA";
    Cmd[Cmd["ARRIVAL_HISTORY_DATA"] = 132] = "ARRIVAL_HISTORY_DATA";
    Cmd[Cmd["PACKET_VERIFY_DATA"] = 133] = "PACKET_VERIFY_DATA";
    Cmd[Cmd["PACKET_NEW_DATA"] = 134] = "PACKET_NEW_DATA";
    Cmd[Cmd["PACKET_OTA_INFO"] = 135] = "PACKET_OTA_INFO";
    Cmd[Cmd["PACKET_OTA_SLICE"] = 136] = "PACKET_OTA_SLICE";
    Cmd[Cmd["PACKET_RAW_DATA"] = 144] = "PACKET_RAW_DATA";
    Cmd[Cmd["ARRIVAL_RAW_DATA"] = 145] = "ARRIVAL_RAW_DATA";
})(Cmd = exports.Cmd || (exports.Cmd = {}));
