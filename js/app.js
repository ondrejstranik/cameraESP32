// DOM Elements
const connectButton = document.getElementById('connectBleButton');
const disconnectButton = document.getElementById('disconnectBleButton');
const onButton = document.getElementById('onButton');
const offButton = document.getElementById('offButton');
const retrievedValue = document.getElementById('valueContainer');
const bleStateContainer = document.getElementById('bleState');
const timestampContainer = document.getElementById('timestamp');
const cameraLink = document.getElementById('cameraID');
const cameraName = document.getElementById('cameraNameID');
const wifiName = document.getElementById('wifiNameID');
const wifiPwd = document.getElementById('wifiPwdID');
const wifiConnectButton = document.getElementById('wifiConnectID');

//Define BLE Device Specs
var bleService = '19b10000-e8f2-537e-4f6c-d104768a1214';
var ledCharacteristic = '19b10002-e8f2-537e-4f6c-d104768a1214';
var sensorCharacteristic= '19b10001-e8f2-537e-4f6c-d104768a1214';
var wifiNameCharacteristic= '19b10003-e8f2-537e-4f6c-d104768a1214';
var wifiPwdCharacteristic= '19b10004-e8f2-537e-4f6c-d104768a1214';
var SECharacteristic = '19b10005-e8f2-537e-4f6c-d104768a1214';

//FIll up the default values
cameraName.value = 'ESP32';
wifiName.value = 'esp32';
wifiPwd.value = 'esp32esp32';

//Global Variables to Handle Bluetooth
var bleServer;
var bleServiceFound;
var sensorCharacteristicFound;


// Connect Button (search for BLE Devices only if BLE is available)
connectButton.addEventListener('click', (event) => {
    if (isWebBluetoothEnabled()){
        connectToDevice();
    }
});

// Disconnect Button
disconnectButton.addEventListener('click', disconnectDevice);

//Wifi Button
wifiConnectButton.addEventListener('click', () => sendWifiData(wifiName.value, wifiPwd.value))

// Write to the ESP32 LED Characteristic
onButton.addEventListener('click', () => writeOnCharacteristic("1"));
offButton.addEventListener('click', () => writeOnCharacteristic("0"));

// delay function - to wait between setting BLE characteristic
function delay(time) {
return new Promise(resolve => setTimeout(resolve, time));
}

// Check if BLE is available in your Browser
function isWebBluetoothEnabled() {
    if (!navigator.bluetooth) {
        console.log("Web Bluetooth API is not available in this browser!");
        bleStateContainer.innerHTML = "Web Bluetooth API is not available in this browser!";
        cameraLink.href = ""
        return false
    }
    console.log('Web Bluetooth API supported in this browser.');
    return true
}

// Connect to BLE Device and Enable Notifications
function connectToDevice(){
    deviceName = cameraName.value
    
    console.log('Initializing Bluetooth...');
    navigator.bluetooth.requestDevice({
        filters: [{name: deviceName}],
        optionalServices: [bleService]
    })
    .then(device => {
        console.log('Device Selected:', device.name);
        bleStateContainer.innerHTML = 'Connected to device ' + device.name;
        bleStateContainer.style.color = "#24af37";
        device.addEventListener('gattservicedisconnected', onDisconnected);
        return device.gatt.connect();
    })
    .then(gattServer =>{
        bleServer = gattServer;
        console.log("Connected to GATT Server");
        return bleServer.getPrimaryService(bleService);
    })
    .then(service => {
        bleServiceFound = service;
        console.log("Service discovered:", service.uuid);
        return service.getCharacteristic(sensorCharacteristic);
    })
    .then(characteristic => {
        console.log("Characteristic discovered:", characteristic.uuid);
        sensorCharacteristicFound = characteristic;
        characteristic.addEventListener('characteristicvaluechanged', handleCharacteristicChange);
        characteristic.startNotifications();
        console.log("Notifications Started.");
        return characteristic.readValue();
    })
    .then(value => {
        console.log("Read value: ", value);
        const decodedValue = new TextDecoder().decode(value);
        console.log("Decoded value: ", decodedValue);
        retrievedValue.innerHTML = "ip: "+ decodedValue;
    })
    .catch(error => {
        console.log('Error: ', error);
    })
}

function onDisconnected(event){
    console.log('Device Disconnected:', event.target.device.name);
    bleStateContainer.innerHTML = "Device disconnected";
    bleStateContainer.style.color = "#d13a30";

    connectToDevice();
}

function handleCharacteristicChange(event){
    const newValueReceived = new TextDecoder().decode(event.target.value);
    console.log("Characteristic value changed: ", newValueReceived);
    retrievedValue.innerHTML = "ip: "+ newValueReceived;
    timestampContainer.innerHTML = getDateTime();
    cameraLink.href = "http://"+ newValueReceived + ":80"
}

function writeOnCharacteristic(name){
    if (bleServer && bleServer.connected) {
        bleServiceFound.getCharacteristic(SECharacteristic)
        .then(characteristic => {
            console.log("Found the SE characteristic: ", characteristic.uuid);
            const _name = new TextEncoder().encode(name);
            return characteristic.writeValue(_name);
        })
        .then(() => {
            latestValueSent.innerHTML = name;
            console.log("Value written to SEcharacteristic:", name);
        })
        .catch(error => {
            console.error("Error writing to the SE characteristic: ", error);
        });
    } else {
        console.error ("Bluetooth is not connected. Cannot write to characteristic.")
        window.alert("Bluetooth is not connected. Cannot write to characteristic. \n Connect to BLE first!")
    }
}

function sendWifiData(name,pwd){
    let status= "connecting";

    if (bleServer && bleServer.connected) {
        bleServiceFound.getCharacteristic(wifiNameCharacteristic)
        .then(characteristic => {
            console.log("Found the wifiName characteristic: ", characteristic.uuid);
            const _name = new TextEncoder().encode(name);
            return characteristic.writeValue(_name);
        })
        .then(() => {
            console.log("Value written to wifiName characteristic:", name);
            
        })
        .catch(error => {
            console.error("Error writing to the wifiName characteristic: ", error);
        });
        
        delay(1000).then(() => {           
            bleServiceFound.getCharacteristic(wifiPwdCharacteristic)
            .then(characteristic => {
                console.log("Found the wifiPwd characteristic: ", characteristic.uuid);
                const _pwd = new TextEncoder().encode(pwd);
                return characteristic.writeValue(_pwd);
            })
            .then(() => {
                console.log("Value written to wifiPwd characteristic:", pwd);
            })
            .catch(error => {
                console.error("Error writing to the wifiPwd characteristic: ", error);
            });
        });

        delay(2000).then(() => { 
            bleServiceFound.getCharacteristic(ledCharacteristic)
            .then(characteristic => {
                console.log("Found the LED characteristic: ", characteristic.uuid);
                const _status = new TextEncoder().encode(status);
                return characteristic.writeValue(_status);
            })
            .then(() => {
                console.log("Value written to LEDcharacteristic:", status);
            })
            .catch(error => {
                console.error("Error writing to the LED characteristic: ", error);
            });
        });

        //window.alert("Connecting esp32 to wifi")

    } else {
        console.error ("Bluetooth is not connected. Cannot write to characteristic.")
        window.alert("Bluetooth is not connected. Cannot write to characteristic. \n Connect to BLE first!")
    }
}

function disconnectDevice() {
    console.log("Disconnect Device.");
    if (bleServer && bleServer.connected) {
        if (sensorCharacteristicFound) {
            sensorCharacteristicFound.stopNotifications()
                .then(() => {
                    console.log("Notifications Stopped");
                    return bleServer.disconnect();
                })
                .then(() => {
                    console.log("Device Disconnected");
                    bleStateContainer.innerHTML = "Device Disconnected";
                    bleStateContainer.style.color = "#d13a30";

                })
                .catch(error => {
                    console.log("An error occurred:", error);
                });
        } else {
            console.log("No characteristic found to disconnect.");
        }
    } else {
        // Throw an error if Bluetooth is not connected
        console.error("Bluetooth is not connected.");
        window.alert("Bluetooth is not connected.")
    }
}

function getDateTime() {
    var currentdate = new Date();
    var day = ("00" + currentdate.getDate()).slice(-2); // Convert day to string and slice
    var month = ("00" + (currentdate.getMonth() + 1)).slice(-2);
    var year = currentdate.getFullYear();
    var hours = ("00" + currentdate.getHours()).slice(-2);
    var minutes = ("00" + currentdate.getMinutes()).slice(-2);
    var seconds = ("00" + currentdate.getSeconds()).slice(-2);

    var datetime = day + "/" + month + "/" + year + " at " + hours + ":" + minutes + ":" + seconds;
    return datetime;
}
