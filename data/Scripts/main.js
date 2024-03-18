import Server from "./backend.js";

let server = new Server(`ws://${window.location.hostname}:81`, 200);
let autoPumpState = true;

server.sk.onMsg = (msg) => {
  if (msg.name = "PUMP_STATE") {
    document.getElementById("relayState").innerText = msg.data;
  } 
}

let autoPumpStateElm = document.getElementById("autoPumpState");
document.addEventListener("DOMContentLoaded", function () {
  // to get saved data from the esp8266
  server.getStored().then(data => {
    autoPumpState = data.autoPumpContollerActive;
    autoPumpStateElm.innerText = autoPumpState ? "ON" : "OFF";
  })


  server.onSensorData = command => {
    if (command.name == "SENSOR_PERCENTAGE") {
      document.getElementById("percentage1").innerText = command.sensor1;
      document.getElementById("percentage2").innerText = command.sensor2;
    } else if (command.name == "SENSOR_LITERS") {
      document.getElementById("liters1").innerText = command.sensor1;
      document.getElementById("liters2").innerText = command.sensor2;
    }
  }
  

  // Example button click handlers
  document
    .getElementById("onButton")
    .addEventListener("click", function () {
      server.send("PUMP_STATE", "ON");
      autoPumpStateElm.innerText = "OFF";
    });
  document
    .getElementById("offButton")
    .addEventListener("click", function () {
      server.send("PUMP_STATE", "OFF");
      autoPumpStateElm.innerText = "OFF";
    });
  document
    .getElementById("autoPumpButton")
    .addEventListener("click", function () {
      if (autoPumpState) {
        autoPumpStateElm.innerText = "OFF";
        autoPumpState = false;
        server.send("AUTO_PUMP_STATE", autoPumpState);
      } else {
        autoPumpStateElm.innerText = "ON";
        autoPumpState = true;
        server.send("AUTO_PUMP_STATE", autoPumpState);
      }
      console.log(autoPumpState);
    });
});

window.addEventListener("load", () => server.init());