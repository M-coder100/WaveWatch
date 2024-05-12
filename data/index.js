import Backend from "./backend.js";
const backend = new Backend(`ws://${window.location.hostname}:81`);
const smartFlowToggle = document.getElementById("smartFlowToggle");
let currentPumpState = false;

function handleSettingsPopup() {
    const tanks = [...document.querySelector(".tanksMinimal").children, ...document.querySelectorAll(".tankNameContainer")];
    tanks.forEach(tank => {
        tank.onclick = () => new Popup(`
            <details class="setting inline" open>
                <summary>Tank Name</summary>
                <input type="text" placeholder="None" id="ST_TANK_NAME"/>
            </details>
            <details class="setting inline" open>
                <summary>Tank Tag Name</summary>
                <input type="text" placeholder="None" id="ST_TANK_TAG_NAME"/>
            </details>
            <details class="setting" open>
                <summary>Tank Dimensions</summary>
                <ul>
                    <li><label for="ST_TANK_HEIGHT">Height</label><input type="number" id="ST_TANK_HEIGHT" placeholder="cm"/></li>
                    <li><label for="ST_TANK_DIAMETER">Diameter</label><input type="number" id="ST_TANK_DIAMETER" placeholder="cm"/></li>
                    <li><label for="ST_TANK_MAX_LITERS">Max Liters</label><input type="number" id="ST_TANK_MAX_LITERS" placeholder="L"/></li>
                </ul>
            </details>
            <details class="setting" open>
                <summary>
                    <span>Smart Flow</span>
                    <label class="toggle">
                        <input type="checkbox" id="ST_TANK_SMARTFLOW_CHECKBOX"/>
                        <span class="slider round"></span>
                    </label>
                </summary>
                <ul>
                    <li><label for="ST_TANK_SMARTFLOW_MIN">Minimum</label><input type="number" id="ST_TANK_SMARTFLOW_MIN" placeholder="%"/></li>
                    <li><label for="ST_TANK_SMARTFLOW_TOL">Tolerance</label><input type="number" id="ST_TANK_SMARTFLOW_TOL" placeholder="%"/></li>
                    <li><label for="ST_TANK_SMARTFLOW_MAX">Maximum</label><input type="number" id="ST_TANK_SMARTFLOW_MAX" placeholder="%"/></li>
                </ul>
            </details>
            <div class="message info">
                <ion-icon name="information-circle"></ion-icon>
                <p>This data is essential for calculating percentages and enabling SmartFlow within the controller.</p>
            </div>
        `, tank.querySelector(".tankName").textContent, (setInputValue, windowTitle) => {
            const settings = backend.getSetting`tanks`.then(tanks => tanks.data.filter(tank => tank.tankName == windowTitle)[0]);
            settings.then(data => {
                setInputValue("ST_TANK_NAME", data.tankName);
                setInputValue("ST_TANK_TAG_NAME", data.tankTagName);
                setInputValue("ST_TANK_HEIGHT", data.height);
                setInputValue("ST_TANK_DIAMETER", data.diameter);
                setInputValue("ST_TANK_MAX_LITERS", data.maxLiters);
                setInputValue("ST_TANK_SMARTFLOW_MIN", data.smartFlow.min);
                setInputValue("ST_TANK_SMARTFLOW_TOL", data.smartFlow.tol);
                setInputValue("ST_TANK_SMARTFLOW_MAX", data.smartFlow.max);

                setInputValue("ST_TANK_SMARTFLOW_CHECKBOX", data.smartFlow.isActive, true);
            })
        });
    })
    const settings = [...document.querySelectorAll("#settings .setting")];
    settings.forEach(setting => {
        setting.onclick = e => { 
            if (e.target.tagName == "LABEL" || e.target.tagName == "INPUT") {
                if (e.target.tagName == "INPUT" && e.target.id == "smartFlowToggle") setSmartFlowState(e.target.checked);
                return;
            }

            const windowTitle = setting.querySelector(".settingName").textContent;
            let popupString = "In Progress...";

            switch (windowTitle.toLowerCase()) {
                case "smart flow":
                    popupString = `
                        <details class="setting" open>
                            <summary>
                                <span>Tank 1</span>
                                <label class="toggle">
                                    <input type="checkbox" id="ST_TANK_SMARTFLOW_CHECKBOX1"/>
                                    <span class="slider round"></span>
                                </label>
                            </summary>
                            <ul>
                                <li><label for="ST_TANK_SMARTFLOW_MIN1">Minimum</label><input type="number" id="ST_TANK_SMARTFLOW_MIN1" placeholder="%"/></li>
                                <li><label for="ST_TANK_SMARTFLOW_TOL1">Tolerance</label><input type="number" id="ST_TANK_SMARTFLOW_TOL1" placeholder="%"/></li>
                                <li><label for="ST_TANK_SMARTFLOW_MAX1">Maximum</label><input type="number" id="ST_TANK_SMARTFLOW_MAX1" placeholder="%"/></li>
                            </ul>
                        </details>
                        <details class="setting" open>
                            <summary>
                                <span>Tank 2</span>
                                <label class="toggle">
                                    <input type="checkbox" id="ST_TANK_SMARTFLOW_CHECKBOX2"/>
                                    <span class="slider round"></span>
                                </label>
                            </summary>
                            <ul>
                                <li><label for="ST_TANK_SMARTFLOW_MIN2">Minimum</label><input type="number" id="ST_TANK_SMARTFLOW_MIN2" placeholder="%"/></li>
                                <li><label for="ST_TANK_SMARTFLOW_TOL2">Tolerance</label><input type="number" id="ST_TANK_SMARTFLOW_TOL2" placeholder="%"/></li>
                                <li><label for="ST_TANK_SMARTFLOW_MAX2">Maximum</label><input type="number" id="ST_TANK_SMARTFLOW_MAX2" placeholder="%"/></li>
                            </ul>
                        </details>
                        <details class="setting" open>
                            <summary>
                                <span>Tank 3</span>
                                <label class="toggle">
                                    <input type="checkbox" id="ST_TANK_SMARTFLOW_CHECKBOX3"/>
                                    <span class="slider round"></span>
                                </label>
                            </summary>
                            <ul>
                                <li><label for="ST_TANK_SMARTFLOW_MIN3">Minimum</label><input type="number" id="ST_TANK_SMARTFLOW_MIN3" placeholder="%"/></li>
                                <li><label for="ST_TANK_SMARTFLOW_TOL3">Tolerance</label><input type="number" id="ST_TANK_SMARTFLOW_TOL3" placeholder="%"/></li>
                                <li><label for="ST_TANK_SMARTFLOW_MAX1">Maximum</label><input type="number" id="ST_TANK_SMARTFLOW_MAX3" placeholder="%"/></li>
                            </ul>
                        </details>
                        <div class="message info">
                            <ion-icon name="information-circle"></ion-icon>
                            <p>This data is needed to faciliate SmartFlow within the controller.</p>
                        </div>
                    `

                    new Popup(popupString, windowTitle, setInputValue => {
                        const settings = backend.getSetting`tanks`.then(tanks => tanks.data.map(tank => tank.smartFlow));
                        settings.then(data => {
                            setInputValue("ST_TANK_SMARTFLOW_MIN1", data[0].min);
                            setInputValue("ST_TANK_SMARTFLOW_MIN2", data[1].min);
                            setInputValue("ST_TANK_SMARTFLOW_MIN3", data[2].min);
                            setInputValue("ST_TANK_SMARTFLOW_TOL1", data[0].tol);
                            setInputValue("ST_TANK_SMARTFLOW_TOL2", data[1].tol);
                            setInputValue("ST_TANK_SMARTFLOW_TOL3", data[2].tol);
                            setInputValue("ST_TANK_SMARTFLOW_MAX1", data[0].max);
                            setInputValue("ST_TANK_SMARTFLOW_MAX2", data[1].max);
                            setInputValue("ST_TANK_SMARTFLOW_MAX3", data[2].max);
        
                            setInputValue("ST_TANK_SMARTFLOW_CHECKBOX1", data[0].isActive, true);
                            setInputValue("ST_TANK_SMARTFLOW_CHECKBOX2", data[1].isActive, true);
                            setInputValue("ST_TANK_SMARTFLOW_CHECKBOX3", data[2].isActive, true);
                        })
                    });
                    break;
                case "support":
                    popupString = `
                        <iframe height="315"
                            src="https://www.youtube.com/embed/PTO2xpy11Hk?t=0m50s">
                        </iframe>
                        <h3>The Above Is A Quick Video To Install And Use WaveWatch</h3>
                        WaveWatch is a pioneering solution revolutionizing water management in agriculture, offering precision monitoring and control capabilities tailored to the needs of farmers. Utilizing advanced technology such as ultrasonic sensors and a user-friendly mobile app interface, WaveWatch empowers farmers to optimize irrigation practices, prevent water overflow, and conserve resources effectively. With its commitment to sustainability and innovation, WaveWatch stands as a beacon of hope in addressing the challenges of water scarcity and inefficiency in agricultural settings, driving towards a more resilient and productive farming future.
                    `
                    new Popup(popupString, windowTitle);
                    break;
                default: 
                    new Popup(popupString, windowTitle);
                    break;
            }
        }
    })
}
function handleTankCarousel() {
    const tankCarouselBackBtn = document.querySelector(".tankCarousel .control.left");
    const tankCarouselNextBtn = document.querySelector(".tankCarousel .control.right");
    const tankCarousel = document.querySelector(".tankCarousel");
    const pagination = document.querySelector(".pagination");

    let tankCarouselPos = 0;
    tankCarouselNextBtn.onclick = () => {
        if (tankCarouselPos == 2) return;
        tankCarouselPos += 1;
        [...pagination.children].forEach(child => child.classList.remove("active"));
        pagination.children[tankCarouselPos].classList.add("active");
        tankCarousel.children[tankCarouselPos].scrollIntoView({ behavior: "smooth" });
    }
    tankCarouselBackBtn.onclick = () => {
        if (tankCarouselPos == 0) return;
        tankCarouselPos -= 1;
        [...pagination.children].forEach(child => child.classList.remove("active"));
        pagination.children[tankCarouselPos].classList.add("active");
        tankCarousel.children[tankCarouselPos].scrollIntoView({ behavior: "smooth" });
    }
}
function handlePumpBtnPress() {
    const pumpOnBtn = document.getElementById("on");
    const pumpOffBtn = document.getElementById("off");

    pumpOnBtn.onclick = () => {
        if (currentPumpState == false) {
            backend.send("PUMP_STATE", "ON");
            currentPumpState = true;
            if (smartFlowToggle.checked) new PopupInline("warning", "Smart Flow Turning OFF Due To Manual Intervention");
        }
    }
    pumpOffBtn.onclick = () => {
        if (currentPumpState == true) {
            backend.send("PUMP_STATE", "OFF");
            currentPumpState = false;
            if (smartFlowToggle.checked) new PopupInline("warning", "Smart Flow Turning OFF Due To Manual Intervention");
        }
    }
}
function handleTankUI() {
    const tanks = [...document.querySelectorAll(".tankCarousel .tank")];
    const tanksMinimal = [...document.querySelectorAll(".tanksMinimal .tank")];
    
    backend.onSensorData = data => {
        backend.getSetting`tanks`.then(tanksSettings => {
            let sensReadings = [data.sensor1, data.sensor2, data.sensor3];
            for (let i = 0; i < tanks.length; i++) {
                let tankClass = new TankUI(tanks[i], tanksMinimal[i]);
                let tankLiters = Math.floor(tanksSettings.search(i, "maxLiters") * sensReadings[i]/100);
                tankClass.percentage = sensReadings[i];
                tankClass.liters = tankLiters;
            }
        })
    }
}


function init() {
    handleSettingsPopup();
    handleTankCarousel();
    handleTankUI();
    
    backend.onConnect = () => {
        handlePumpBtnPress();
        backend.init();
        new PopupInline("success", "App Successfully Connected To WaveWatch Controller");
    }
    backend.onDisconnect = () => {
        new PopupInline("error", "App Disconnected From Server. This Could Be Because The Controller Is Switched OFF");
        setIndicatorColorUI("disconnected");
    }
    backend.getLiveReading(250);
}

backend.sk.onMsg = msg => {
    console.log(msg);
    if (msg.name == "GET_PUMP_STATE" || msg.name == "PUMP_STATE") {
        currentPumpState = msg.data == "ON" ? true : false;
    } else if (msg.name == "GET_SMART_FLOW_STATE" || msg.name == "SMART_FLOW_STATE") {
        if (msg.reason) {
            new PopupInline("info", `Pump Going To ${msg.data} Due To ${msg.reason}`);
        } else {
            smartFlowToggle.checked = msg.data == "ON" ? true : false;
        }
    }
    setIndicatorColorUI(currentPumpState);
}

// Utility Functions
function setIndicatorColorUI(pumpState) {
    let style = "";
    let colorCode = pumpState ? 1 : 2;

    if (pumpState == "disconnected") colorCode = 4;

    if (smartFlowToggle.checked && pumpState != "disconnected") {
        style += `--pumpStateColor: var(--semantic${3});`;
    } else {
        style += `--pumpStateColor: var(--semantic${colorCode});`;
    }
    style += `--pumpStateShadowColor: var(--semantic${colorCode});`
    
    document.body.style = style;
}
function setSmartFlowState(boolean) {
    smartFlowToggle.checked = boolean;
    backend.send("SMART_FLOW_STATE", boolean ? "ON" : "OFF");
    setIndicatorColorUI(currentPumpState);
}


// Class Objects:
class TankUI {
    constructor (tankRoot, tankMinimalRoot) {
        this.tankPercentagePlaceholder = tankRoot.querySelector(".tankPercentage");
        this.tankLitersPlaceholder = tankRoot.querySelector(".tankLiters");
        this.tankBGPercentage = tankRoot.querySelector(".circleInner");
        
        this.tankPercentagePlaceholderMinimal = tankMinimalRoot.querySelector(".tankPercentage");
        this.tankBGPercentageMinimal = tankMinimalRoot.querySelector(".tankFill");
    }
    set percentage (value) {
        this.tankPercentagePlaceholder.textContent = value+"%";
        this.tankPercentagePlaceholderMinimal.textContent = value+"%";
        
        let percentageToDeg = 360*value/100;
        this.tankBGPercentage.style = `background: conic-gradient(var(--accent1), var(--accent2) ${percentageToDeg}deg, transparent ${percentageToDeg}deg)`; 
        this.tankBGPercentageMinimal.style = `height: ${value}%`; 
    }
    set liters (value) {
        this.tankLitersPlaceholder.textContent = value+"L";
    }
}
class Popup {
    setInputValue(idStr, data, isToggle = false) {
        if (isToggle) {
            document.getElementById(idStr).checked = data;
            return;
        }
        document.getElementById(idStr).value = data;
    }

    constructor(htmlString, windowTitle, setInputValue = null) {
        const popupWindow = document.querySelector(".popupWindow");
        document.getElementById("popupRoot").innerHTML = htmlString;
        document.getElementById("popupWindowTitle").innerHTML = windowTitle;

        if (setInputValue) setInputValue(this.setInputValue, windowTitle);

        popupWindow.classList.add("show");
        popupWindow.querySelector("#settingsBackBtn").onclick = () => {
            document.getElementById("popupRoot").innerHTML = "";
            popupWindow.classList.remove("show");
        }
    }
}
class PopupInline {
    constructor (popupType, popupHTML) {
        const root = document.querySelector(".popupStack");
        const div = document.createElement("div");
        let iconName;
        if (popupType == "info") {
            iconName = "information-circle";
        } else if (popupType == "warning") {
            iconName = popupType;
        } else if (popupType == "error") {
            iconName = "bug";
        } else if (popupType == "success") {
            iconName = "checkmark-circle";
        }
        

        div.classList.add("message", popupType);
        div.innerHTML = `
            <ion-icon name="${iconName}"></ion-icon>
            <p>${popupHTML}</p>
            <ion-icon name="close-outline" onclick="this.parentElement.remove()"></ion-icon>
        `
        
        var x = new MutationObserver(function (e) {
            if (e[0].removedNodes) {
                if (root.lastElementChild == div) {
                    setTimeout(() =>  {
                        div.classList.add("remove");    
                        setTimeout(() => div.remove(), 500);
                    }, 10000);
                }
            }
        });
        
        x.observe(root, { childList: true });
        root.prepend(div);
    }
}

document.addEventListener("DOMContentLoaded", init);