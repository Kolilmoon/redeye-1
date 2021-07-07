# Azure IoT Plug and Play gateway for Redeye-V1-Plus

# Contents

- [Purpose](#purpose)
- [Cloud service used](#cloud-service-used)
- [Prerequisites](#prerequisites)
- [Project setup](#project-setup)

# Purpose

This project contains a sample for working with Azure IoT Hub Device Provisioning Service:
* A building scenario sample written in Node.js with Typescript. The sample can be used to set up redeye device through gateway to Azure IoT Hub with  Azure IoT Hub Device Provisioning Service.
* The designed Flow and architecture is showed as following:


# Cloud service used

* [Azure IoT Hub Device Provisioning Service (DPS)](https://docs.microsoft.com/en-us/azure/iot-dps/) 
* [Azure IoT Hub](https://docs.microsoft.com/zh-tw/azure/iot-hub/about-iot-hub)

### Prerequisites

* **Hardware Environmental setup** 
  - Prepare components required for Allwinner-Banana-Pi-BPI-M64:
    - SD card (minimum class 4; class 10 is recommended)
    - USB power supply (5V 2A recommended)
    - Network connection via Ethernet
    - A computer with an SD card reader/writer (to write the image to the SD card)
  - Prepare components required for RedEye-1-Plus:
    - USB power supply (5V 2A recommended)
  - Connect Allwinner-Banana-Pi-BPI-M64 to the network via Ethernet in the same network.
  - Power on the Allwinner-Banana-Pi-BPI-M64.
  - Power on the RedEye-1-Plus.
* **Software Environmental setup**
* [Ubuntu Mate 18.04 for Allwinner-Banana-Pi-BPI-M64](http://wiki.banana-pi.org/Banana_Pi_BPI-M64#Image_Release)
  * Package and Language Version
    * [npm](https://www.npmjs.com/get-npm)
    * [Node.js v12.16.3](https://nodejs.org/en/download/)

## Project setup

```sh
npm install
```

### Run the code

First, edit [./config.json](./config.json) and implement environment variables to retrieve configuration.

​	set REDEYE_DEVICE_SSID = Your-redeye-1-plus-device-ssid.

- If you are using a connection string to authenticate:
  - set IOTHUB_DEVICE_SECURITY_TYPE="connectionString"
  - set IOTHUB_DEVICE_CONNECTION_STRING="<connection string of your device>"
- If you are using a DPS enrollment group to authenticate:
  - set IOTHUB_DEVICE_SECURITY_TYPE="DPS"
  - set IOTHUB_DEVICE_DPS_ID_SCOPE="<ID Scope of DPS instance>"
  - set IOTHUB_DEVICE_DPS_DEVICE_ID="<Device's ID>"
  - set IOTHUB_DEVICE_DPS_DEVICE_KEY="<Device's security key >"
  - set IOTHUB_DEVICE_DPS_ENDPOINT="<DPS endpoint>"



Change to directory [./dist/](./dist/) and run:

Pairing connection between Gateway and Redeye-V1-Plus for the first time, run

```sh
$ node WiFi.js
```

Once the connected message shows up, Redeye-1-Plus is paired with with gateway.



Start Listening test results from Redeye-1-Plus

```sh
$ node REDEYE_Device.js
```



## Provision script as a service

Module Github: https://github.com/zapty/forever-service

### Prerequisite

forever must be installed globally using

```sh
$ npm install -g forever
```



### Installation forever-service

```sh
$ npm install -g forever-service
```



### Set script as a daemon service

```sh
$ forever-service install redeye1plus --script /home/pi/Redeye1/dist/REDEYE_Device.js
```

