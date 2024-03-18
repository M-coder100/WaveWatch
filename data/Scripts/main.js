import Server from "./backend.js";

const server = new Server(`ws://${window.location.hostname}:81`, 200);
let wave1, wave2, wave3, wave4, tank1, tank2, tank3, smartFlowToggle, toggleDarkMode;

function init() {
  window.scrollTo(0, 0);
  const root = document.querySelector(".tankContainer");

  wave1 = document.getElementById("wave1");
  wave2 = document.getElementById("wave2");
  wave3 = document.getElementById("wave3");
  wave4 = document.getElementById("wave4");

  tank1 = new Tank(root, "Tank 1", {
    isMainTank: true,
    maxLiters: 1000,
    diameterCM: 98,
    heightCM: 61,
    tagName: "Upper tank",
    smartFlow: {
      min: 0,
      max: 90,
      tol: 50
    }
  });
  tank2 = new Tank(root, "Tank 2", {
    maxLiters: 1000,
    diameterCM: 98,
    heightCM: 61,
    tagName: "Bottom tank",
    smartFlow: {
      min: 0,
      max: 90,
      tol: 50
    }
  });
  tank3 = new Tank(root, "Tank 3", { maxLiters: 1000 });

  smartFlowToggle = document.getElementById("smartFlowToggle");
  toggleDarkMode = document.getElementById("toggleDarkMode");

  // to get saved data from the esp8266
  server.getStored().then(data => {
    setSmartFlowState(data.autoPumpContollerActive);
  })
}

window.addEventListener("load", () => {
  const loader = document.querySelector(".loader");
  loader.classList.add("loader-hidden");
  setTimeout(() => document.body.removeChild(loader), 2000);
})


document.addEventListener("DOMContentLoaded", () => {
  init();

  const tanksElm = document.querySelectorAll(".tankDetails");
  const pumpControlBtns = document.querySelectorAll(".buttonContainer button");
  pumpControlBtns.forEach(elm => {
    elm.onclick = () => {
      pumpControlBtns.forEach(e => e.classList.remove("active"));
      elm.classList.add("active");
      if (elm.id == "pumpOn") {
        server.send("PUMP_STATE", "ON");
        setSmartFlowState(false);
      } else if (elm.id == "pumpOff") {
        server.send("PUMP_STATE", "OFF");
        setSmartFlowState(false);
      }
    }
  })
  smartFlowToggle.addEventListener("click", () => {
    setSmartFlowState(smartFlowToggle.checked);
  })
  toggleDarkMode.addEventListener("click", () => {
    document.body.style = "filter: invert(1) hue-rotate(180deg) !important"
  })

  window.addEventListener("scroll", function () {
    let value = window.scrollY;
    if (value >= 250) {
      document.body.style = "background: #191919;"
      document.querySelector(".waterLevelBackdrop").style = "filter: invert(90%);"
      tanksElm[0].classList.add("minimal");
      [wave1, wave2, wave3, wave4].forEach(wave => {
        wave.style.height = "120%";
      })
    } else {
      [wave1, wave2, wave3, wave4].forEach(wave => {
        wave.style.height = tank1.percentage + "%";
      })
      document.querySelector(".waterLevelBackdrop").style = "filter: invert(0);"
      document.body.style = "background: #0099ff;"
      tanksElm[0].classList.remove("minimal");
    }
    wave1.style.backgroundPositionX = 400 + value * 4 + "px";
    wave2.style.backgroundPositionX = 300 + value * -4 + "px";
    wave3.style.backgroundPositionX = 200 + value * 2 + "px";
    wave4.style.backgroundPositionX = 100 + value * -2 + "px";
  });


  // backend
  server.onSensorData = command => {
    if (command.name == "SENSOR_PERCENTAGE") {
      tank1.percentage = command.sensor1;
      tank2.percentage = command.sensor2;
    } else if (command.name == "SENSOR_LITERS") {
      tank1.liters = command.sensor1;
      tank2.liters = command.sensor2;
    }
  }
  server.sk.onMsg = (msg) => {
    if (msg.name == "PUMP_STATE") {
      document.getElementById("pumpConnectionInfo").innerText = msg.data;
      console.log(msg.data);
      pumpControlBtns.forEach(elm => { 
        elm.classList.remove("active");
        if (msg.data == "ON" && elm.id == "pumpOn") {
          elm.classList.add("active");
        } else if (msg.data == "OFF" && elm.id == "pumpOff") {
          elm.classList.add("active");
        }
      })
    } else if (msg.name == "AUTO_PUMP_STATE") {
      
    }
  }
})



class Tank {
  elm;
  #tagName;
  #percentage = 0;
  #liters = 0;
  #name;
  isMainTank = false;
  isSmartFlowEnabled = false;
  constructor(root, name, props) {
    this.isMainTank = props?.isMainTank;
    this.isSmartFlowEnabled = props?.smartFlow;

    const div = document.createElement("div");
    root.appendChild(div);
    this.elm = div;

    div.classList.add("tankDetails");
    if (!this.isMainTank) div.classList.add("minimal");
    div.id = name.toLowerCase().split(" ").join("");

    div.innerHTML = `
          <div class="infoUpper">
              <div>
                  <span class="tankName">${this.name}</span>
                  <span class="tankTagName ${this.isSmartFlowEnabled ? "smartFlow" : ""}">${this.tagName}</span>
              </div>
              <button class="moreOptions">&vellip;</button>
          </div>
          <div class="waterPercentage">
              <div><h3 id="waterLevelPercentage">${this.#percentage}</h3>%</div>
              <h4>Filled</h4>
              <div class="minimal">
                  <div id="waterLevelPercentage" class="progressBar"></div>
              </div>
          </div>
          <div class="waterFlowDetails">
              ${(props.heightCM && props.diameterCM) ? `<div><span class="waterLevelInfoValue"><span id="waterLevelLiters">${this.#liters}</span>Liters</span> / <span id="waterLevelMaxLiters">${props.maxLiters}</span>L</div><div><span class="waterLevelInfoValue"><span id="waterLevelFlowRate">94</span>cm/s</span> Flow rate</div>` : "<span style='text-align: center; color: yellow;'>Set tank measurements to get liters and other readings.</span>"}
          </div>
      `
    this.name = name;
    this.tagName = props.tagName ? props.tagName : this.isSmartFlowEnabled ? "Smart Flow" : "Not Set";
    this.percentage = this.#percentage;
    this.elm.querySelector(".moreOptions").addEventListener("click", () => {
      console.log("Hello");
    })
    if (this.isSmartFlowEnabled) {
      const infoElm = document.createElement("details");

      infoElm.classList.add("smartFlowTankInfo");
      document.getElementById("smartFlowInfo").appendChild(infoElm);

      let smartFlowMIN = props.smartFlow.min;
      let smartFlowMAX = props.smartFlow.max;
      let smartFlowTOL = props.smartFlow.tol;

      infoElm.innerHTML = `
              <summary><span class="name">${this.name}</span><span class="toggle"></span><span class="edit">Edit</span></summary>
              <ul>
                  <li>Minimum<span>${smartFlowMIN}</span></li>
                  <li>Maximum<span>${smartFlowMAX}</span></li>
                  <li>Tolerance<span>${smartFlowTOL}</span></li>
              </ul>
          `
      infoElm.querySelector(".toggle").addEventListener("click", e => {
        e.preventDefault();
        infoElm.classList.toggle("active");
        smartFlowListen();
      });
    }
  }
  get percentage() {
    return this.#percentage;
  }
  set percentage(num) {
    if (this.isMainTank) {
      document.querySelectorAll(".waterLevelBackdrop .wave").forEach(elm => elm.style.height = `${num}vh`)
      this.elm.querySelector(".waterPercentage").style = `background: conic-gradient(#0099ff, #0400ff ${num / 100 * 360}deg, #1d1e22 0deg)`;
    }
    if (this.isMainTank) document.querySelector(".waterLevelBackdrop .wave").style.height = num + "vh";

    this.elm.querySelector(".waterPercentage .minimal .progressBar").style.width = `${num}%`;
    this.elm.querySelector("#waterLevelPercentage").innerHTML = num;
    this.#percentage = num;
  }
  get tagName() {
    return this.#tagName;
  }
  set tagName(str) {
    this.elm.querySelector(".tankTagName").textContent = str;
    this.#tagName = str;
  }
  get name() {
    return this.#name;
  }
  set name(str) {
    this.elm.querySelector(".tankName").textContent = str;
    this.#name = str;
  }
  get liters() {
    return this.#liters;
  }
  set liters(num) {
    this.elm.querySelector("#waterLevelLiters").textContent = num;
    this.#liters = num;
  }
}

function smartFlowListen() {
  let isAtleast1Active = false;
  [...document.getElementById("smartFlowInfo").children].forEach(child => {
    if (child.classList.contains("active")) {
      isAtleast1Active = true;
    }
  })
  smartFlowToggle.checked = isAtleast1Active;
}
function setSmartFlowState(bool) {
  console.log("from setSmartFlowState()", bool);
  [...document.getElementById("smartFlowInfo").children].forEach(child => {
    if (bool && smartFlowToggle.checked) {
      child.classList.add("active");
    } else {
      child.classList.remove("active");
    }
  })
  smartFlowToggle.checked = bool;
  server.send("AUTO_PUMP_STATE", bool ? "ON" : "OFF");
}

window.addEventListener("load", () => server.init());