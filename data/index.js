import Backend from "./backend.js";
const backend = new Backend(`ws://${window.location.hostname}:81`);
const smartFlowToggle = document.getElementById("smartFlowToggle");
const timedOperationToggle = document.getElementById("timedOperationToggle");
const alarm = new Audio("/src/alarm.mp3");

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
        `,
            tank.querySelector(".tankName").textContent,
            (setInputValue, windowTitle) => {
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

                    let index = tanks.indexOf(tank);
                    if (index > 2) index -= 3;
                    setInputValue(index, "#VALUE#");
                })
            }, selectedElements => {
                let obj = {
                    tankName: selectedElements[0].value,
                    tankTagName: selectedElements[1].value,
                    height: parseInt(selectedElements[2].value, 10),
                    diameter: parseInt(selectedElements[3].value, 10),
                    maxLiters: parseInt(selectedElements[4].value, 10),
                    smartFlow: {
                        min: parseInt(selectedElements[5].value, 10),
                        tol: parseInt(selectedElements[6].value, 10),
                        max: parseInt(selectedElements[7].value, 10),
                        isActive: selectedElements[8].checked
                    }
                }
                backend.saveSettings("tanks", obj, selectedElements[9]);
                setTimeout(() => {
                    handleTankUI();
                }, 3000);
            });
    })
    const settings = [...document.querySelectorAll("#settings .setting")];
    settings.forEach(setting => {
        setting.onclick = e => {
            if (e.target.tagName == "LABEL" || e.target.tagName == "INPUT") {
                if (e.target.tagName == "INPUT") {
                    if (e.target.id == "smartFlowToggle") {
                        setSmartFlowState(e.target.checked);
                    } else if (e.target.id == "timedOperationToggle" && e.target.checked) {
                        timedOperationToggle.parentElement.parentElement.click();
                        timedOperationToggle.checked = false;
                    }
                }
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

                    new Popup(popupString, windowTitle,
                        setInputValue => {
                            const settings = backend.getSetting`tanks`.then(tanks => tanks.data.map(tank => tank.smartFlow));
                            settings.then(data => {
                                setInputValue("ST_TANK_SMARTFLOW_MIN1", data[0].min); // 0
                                setInputValue("ST_TANK_SMARTFLOW_TOL1", data[0].tol);
                                setInputValue("ST_TANK_SMARTFLOW_MAX1", data[0].max);
                                setInputValue("ST_TANK_SMARTFLOW_CHECKBOX1", data[0].isActive, true);

                                setInputValue("ST_TANK_SMARTFLOW_MIN2", data[1].min); // 4
                                setInputValue("ST_TANK_SMARTFLOW_TOL2", data[1].tol);
                                setInputValue("ST_TANK_SMARTFLOW_MAX2", data[1].max);
                                setInputValue("ST_TANK_SMARTFLOW_CHECKBOX2", data[1].isActive, true);

                                setInputValue("ST_TANK_SMARTFLOW_MIN3", data[2].min); // 8
                                setInputValue("ST_TANK_SMARTFLOW_TOL3", data[2].tol);
                                setInputValue("ST_TANK_SMARTFLOW_MAX3", data[2].max);
                                setInputValue("ST_TANK_SMARTFLOW_CHECKBOX3", data[2].isActive, true);

                            })
                        }, selectedElements => {
                            backend.getSetting`tanks`.then(settings => {
                                let array = settings.data;
                                array.forEach(item => {
                                    let index = array.indexOf(item) * 4;
                                    item.smartFlow.min = parseInt(selectedElements[index].value, 10);
                                    item.smartFlow.tol = parseInt(selectedElements[index + 1].value, 10);
                                    item.smartFlow.max = parseInt(selectedElements[index + 2].value, 10);
                                    item.smartFlow.isActive = selectedElements[index + 3].checked;
                                })
                                backend.saveSettings("tanks", array);
                            })

                        });
                    break;
                case "timed operation":
                    popupString = `
                        <div class="timedOperationTypeContainer">
                            <input type="radio" name="timedOperationType" id="RADIO_TIMER_TYPE" checked/>
                            <label class="timedOperationType" for="RADIO_TIMER_TYPE">Timer</label>
                            <input type="radio" name="timedOperationType" id="RADIO_CLOCK_TYPE"/>
                            <label class="timedOperationType" for="RADIO_CLOCK_TYPE">Clock</label>
                        </div>
                        <div id="timerTypeContainer">
                            <div id="TIMER_CONTAINER">
                                <div class="wrapper">
                                    <div class="numbers" value="0"></div>
                                    <p>Hours</p>
                                </div>
                                <div class="wrapper">
                                    <div class="numbers" value="15"></div>
                                    <p>Minutes</p>
                                </div>
                                <div class="wrapper">
                                    <div class="numbers" value="0"></div>
                                    <p>Seconds</p>
                                </div>
                            </div>
                            <div class="actionType">
                                <div class="information">
                                    <h3>Action</h3>
                                    <p>Action To Perform When Timer Runs Out</p>
                                </div>
                                <select id="ACTION_TYPE">
                                    <option value="0" selected>Pump OFF</option>
                                    <option value="1">Pump ON</option>
                                    <option value="2">SmartFlow OFF</option>
                                    <option value="3">SmartFlow ON</option>
                                    <option value="4">Toggle Pump</option>
                                    <option value="5">Toggle SmartFlow</option>
                                </select>
                            </div>
                            <div class="playControls">
                                <button class="setting" id="START_TIMER"><ion-icon name="play"></ion-icon>Start Timer</button>
                                <button class="setting hidden" id="PLAY_TIMER"><ion-icon name="play"></ion-icon>Play</button>
                                <button class="setting hidden" id="PAUSE_TIMER"><ion-icon name="pause"></ion-icon>Pause</button>
                                <button class="setting hidden" id="RESTART_TIMER"><ion-icon name="refresh"></ion-icon>Restart</button>
                            </div>
                        </div>
                        <div id="clockTypeContainer">
                            <div class="clockStack>
                                <div class="clockTimer">
                                    <div class="container setting">
                                        <input type="time"/>
                                        <select>
                                            <option value="0" selected>Pump OFF</option>
                                            <option value="1">Pump ON</option>
                                            <option value="2">SmartFlow OFF</option>
                                            <option value="3">SmartFlow ON</option>
                                            <option value="4">Toggle Pump</option>
                                            <option value="5">Toggle SmartFlow</option>
                                        </select>
                                        <label class="toggle">
                                            <input type="checkbox" id="ST_TANK_SMARTFLOW_CHECKBOX3"/>
                                            <span class="slider round"></span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `
                    new Popup(popupString, windowTitle, ($) => {
                        const numbers = $(".numbers", "#ALL#");
                        const timerContainer = $("TIMER_CONTAINER");
                        const actionTypeSelect = $("ACTION_TYPE");

                        const startTimerBtn = $("START_TIMER");
                        const pauseTimerBtn = $("PAUSE_TIMER");
                        const playTimerBtn = $("PLAY_TIMER");
                        const restartTimerBtn = $("RESTART_TIMER");

                        let timerIntervalID;
                        

                        // Create the number elements
                        numbers.forEach(parentElement => {
                            let selectedValue = parentElement.getAttribute("value");
                            for (let i = 0; i < 60; i++) {
                                let number = document.createElement("div");
                                parentElement.appendChild(number);
                                number.textContent = i;
                                number.id = "NUMBER_" + i;
                                number.classList.add("number");

                                if (selectedValue == i) {
                                    number.classList.add("selected");
                                    number.scrollIntoView({ block: "center" });
                                }
                                number.addEventListener("click", () => {
                                    number.scrollIntoView({ block: "center" });
                                })
                            }

                            parentElement.addEventListener("scroll", () => {
                                let currentPos = Math.round(parentElement.scrollTop / 100);
                                let currentNumber = parentElement.querySelector(".number#NUMBER_" + currentPos);
                                parentElement.querySelector(".number.selected").classList.remove("selected");
                                currentNumber.classList.add("selected");
                            });
                        });


                        
                        let timerState = false;
                        if (backend.isConnected) {
                            backend.getSetting("timer").then(timer => {
                                console.log(timer.data);
                                timerState = timer.data[2];
                                timedOperationToggle.checked = timerState;
                                
                                if (timer.data[0] != -1 && timer.data[1] != -1) {
                                    console.log("Playing Active Timer");
                                    if (timerState) {
                                        playTimer();
                                    } else {
                                        let secondsToTime = [Math.floor(timer.data[0] / 3600), Math.floor(timer.data[0] / 60 % 60), timer.data[0] % 60];
                                        numbers.forEach(parentElement => {
                                            let selectedNumber = parentElement.querySelector(".number#NUMBER_" + secondsToTime[numbers.indexOf(parentElement)]);
                                            let selectedNumberPosistion = (selectedNumber.offsetTop - (parentElement.getBoundingClientRect().height - selectedNumber.getBoundingClientRect().height) / 2) - 100;
                                            parentElement.scrollTo({ top: selectedNumberPosistion });
                                        })
                                        pauseTimer();
                                    }
                                }
                            });
                            startTimerBtn.onclick = startTimer;
                            pauseTimerBtn.onclick = pauseTimer;
                            playTimerBtn.onclick = playTimer;
                            restartTimerBtn.onclick = restartTimer;
                        } else startTimerBtn.disabled = true;

                        function startTimer() {
                            const time = $(".numbers .number.selected", "#ALL#").map(child => {
                                let finalTime = parseInt(child.textContent, 10);
                                child.parentElement.setAttribute("value", finalTime);
                                return finalTime;
                            })
                            if (!time[0] && !time[1] && time[2] < 5) return;
                            let timeToSeconds = time[0] * 3600 + time[1] * 60 + time[2];

                            console.log("Selected Time:", time);                            
                            console.log("Time To Seconds:", timeToSeconds);                            
                            backend.saveSettings("timer", [timeToSeconds, parseInt(actionTypeSelect.value, 10), true]);
                            
                            timerContainer.classList.add("disabled");
                            startTimerBtn.classList.add("hidden");
                            playTimerBtn.classList.add()
                            pauseTimerBtn.classList.remove("hidden");
                            restartTimerBtn.classList.remove("hidden");

                            backend.onTimerTick = (seconds) => {
                                console.log("Tick:", seconds);
                                if (seconds == -1) return;
                                timerTick(seconds);
                            }
                            timerIntervalID = backend.getTimerData(250);
                            timerState = true;
                            timedOperationToggle.checked = timerState;
                        }
                        function pauseTimer() {
                            console.log("Timer Paused!");
                            
                            timerContainer.classList.add("disabled");
                            playTimerBtn.classList.remove("hidden");
                            restartTimerBtn.classList.remove("hidden");
                            pauseTimerBtn.classList.add("hidden");
                            startTimerBtn.classList.add("hidden");
                            
                            clearInterval(timerIntervalID);
                            if (timerState) {
                                backend.send("TIMER", false);
                                timerState = false;
                            }
                            timedOperationToggle.checked = timerState;
                        }
                        function playTimer() {
                            console.log("Timer Playing!");

                            timerContainer.classList.add("disabled");
                            startTimerBtn.classList.add("hidden");
                            playTimerBtn.classList.add("hidden");
                            pauseTimerBtn.classList.remove("hidden");
                            restartTimerBtn.classList.remove("hidden");
                            
                            clearInterval(timerIntervalID);
                            backend.onTimerTick = (seconds) => {
                                console.log("Tick:", seconds);
                                if (seconds == -1) return;
                                timerTick(seconds);
                            }
                            timerIntervalID = backend.getTimerData(250);
                            
                            if (!timerState) {
                                backend.send("TIMER", true);
                                timerState = true;
                            }
                            timedOperationToggle.checked = timerState;
                        }
                        function restartTimer() {
                            console.log("Timer Restarted!");
                            
                            timerContainer.classList.remove("disabled");
                            startTimerBtn.classList.remove("hidden");
                            restartTimerBtn.classList.add("hidden");
                            pauseTimerBtn.classList.add("hidden");
                            playTimerBtn.classList.add("hidden");

                            numbers.forEach(parentElement => {
                                let startingNumber = parentElement.querySelector(".number#NUMBER_" + parentElement.getAttribute("value"));
                                let startingNumberPosistion = (startingNumber.offsetTop - (parentElement.getBoundingClientRect().height - startingNumber.getBoundingClientRect().height) / 2) - 100;
                                parentElement.scrollTo({ top: startingNumberPosistion });
                            })

                            clearInterval(timerIntervalID);
                            if (timerState) backend.saveSettings("timer", [-1, -1, false]);
                            timerState = false;
                            timedOperationToggle.checked = timerState;
                        }
                        function timerTick(seconds) {
                            if (seconds === 0) {
                                clearInterval(timerIntervalID);
                                pauseTimerBtn.classList.add("hidden");
                                timerState = false;
                                timedOperationToggle.checked = timerState;
                            }
                            let secondsToTime = [Math.floor(seconds / 3600), Math.floor(seconds / 60 % 60), seconds % 60];

                            let numbers = $(".numbers", "#ALL#");
                            if (!numbers[0]) {
                                console.log("Timer Running In Background");
                                clearInterval(timerIntervalID);
                                timerState = true;
                                timedOperationToggle.checked = timerState;
                                return;
                            }
                        
                            for (let i = 0; i < 3; i++) {
                                if (secondsToTime[i] != numbers[i].querySelector(".number.selected").textContent) {
                                    let currentNumber = numbers[i].querySelector(".number#NUMBER_" + secondsToTime[i]);
                                    let currentNumberPosistion = currentNumber.offsetTop - (numbers[i].getBoundingClientRect().height - currentNumber.getBoundingClientRect().height) / 2;
                                    numbers[i].scrollTo({ top: currentNumberPosistion });
                                }
                            }
                        }
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
                case "appearance":
                    popupString = `
                        <div class="palleteContainer">
                            <div class="pallete">
                                <div style="background: #53F4FE;"></div>
                                <div style="background: #006aff;"></div>
                                <div style="background: #1A172A;"></div>
                                <div style="background: #05022b;"></div>
                                <div style="background: #1A172A;"></div>
                            </div>
                            <div class="pallete">
                                <div style="background: #3182FF;"></div>
                                <div style="background: #4954ff;"></div>
                                <div style="background: #100036;"></div>
                                <div style="background: #000000;"></div>
                                <div style="background: #07002d;"></div>
                            </div>
                            <div class="pallete">
                                <div style="background: #930000;"></div>
                                <div style="background: #ff0000;"></div>
                                <div style="background: #000000;"></div>
                                <div style="background: #000000;"></div>
                                <div style="background: #000000;"></div>
                            </div>
                            <div class="pallete">
                                <div style="background: #7dffa3;"></div>
                                <div style="background: #ffcb00;"></div>
                                <div style="background: #061e08;"></div>
                                <div style="background: #000000;"></div>
                                <div style="background: #071e00;"></div>
                            </div>
                            <div class="pallete">
                                <div style="background: #3200a4;"></div>
                                <div style="background: #6c2bff;"></div>
                                <div style="background: #08011a;"></div>
                                <div style="background: #000000;"></div>
                                <div style="background: #0d0017;"></div>
                            </div>
                        </div>
                    `;
                    new Popup(popupString, windowTitle,
                        select => {
                            const pallets = document.querySelectorAll(".popupWindow .palleteContainer .pallete");
                            if (localStorage.getItem("pallete")) {
                                let activePalleteIndex = JSON.parse(localStorage.getItem("pallete"))[0];
                                pallets[activePalleteIndex].classList.add("active");
                            } else {
                                pallets[0].classList.add("active");
                            }
                            pallets.forEach(pallete => {
                                pallete.addEventListener("click", () => {
                                    document.querySelector(".popupWindow .palleteContainer .pallete.active").classList.remove("active");
                                    pallete.classList.add("active");
                                })
                                select(pallete, "#ELEMENT#");
                            })
                        },
                        selectedElements => {
                            let activePallete = selectedElements.filter(element => element.classList.contains("active"))[0];
                            let finalColorPallete = [...activePallete.children].map(color => color.style.background);

                            useColorPallete(finalColorPallete);

                            let activePalleteIndex = selectedElements.indexOf(activePallete);
                            let newArray = [activePalleteIndex, finalColorPallete];
                            localStorage.setItem("pallete", JSON.stringify(newArray));
                        }
                    );
                    break;
                case "general":
                    popupString = `
                        <div class="group">
                            <h5>Notification Settings</h5>
                            <div class="setting">
                                <h3 class="settingName">Success Messages</h3>
                                <div class="container">
                                    <label class="toggle" for="success">
                                        <input type="checkbox" id="success"/>
                                        <span class="slider round"></span>
                                    </label>
                                </div>
                            </div>
                            <div class="setting">
                                <h3 class="settingName">Info Messages</h3>
                                <div class="container">
                                    <label class="toggle" for="info">
                                        <input type="checkbox" id="info"/>
                                        <span class="slider round"></span>
                                    </label>
                                </div>
                            </div>
                            <div class="setting">
                                <h3 class="settingName">Warning Messages</h3>
                                <div class="container">
                                    <label class="toggle" for="warning">
                                        <input type="checkbox" id="warning"/>
                                        <span class="slider round"></span>
                                    </label>
                                </div>
                            </div>
                            <div class="setting">
                                <h3 class="settingName">Error Messages</h3>
                                <div class="container">
                                    <label class="toggle" for="error">
                                        <input type="checkbox" id="error"/>
                                        <span class="slider round"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div class="group">
                            <h5>Sound Settings</h5>
                            <div class="setting">
                                <h3 class="settingName">Controller Box Buzzer</h3>
                                <div class="container">
                                    <label class="toggle" for="buzzer">
                                        <input type="checkbox" id="buzzer"/>
                                        <span class="slider round"></span>
                                    </label>
                                </div>
                            </div>
                            <div class="setting">
                                <h3 class="settingName">Mobile Alarm</h3>
                                <div class="container">
                                    <label class="toggle" for="alarm">
                                        <input type="checkbox" id="alarm"/>
                                        <span class="slider round"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <button class="setting" id="RESET_SENSORS">Reset Sensors</button>
                        <div class="message info" id="MESSAGE" style="display: none">
                            <ion-icon name="checkmark-circle"></ion-icon>
                            <p>Sensors Reseted Successfully. Try Reconnecting The Sensors If Any Issue Presists</p>
                            <ion-icon name="close-outline" onclick="this.parentElement.style.display = 'none'"></ion-icon>
                        </div>
                    `
                    new Popup(popupString, windowTitle, select => {
                        document.getElementById("RESET_SENSORS").onclick = () => {
                            backend.send("RESET_SENSORS", true);
                            document.getElementById("MESSAGE").style.display = "flex";
                        }
                        let generalSettingsArray = JSON.parse(localStorage.getItem("general")) || [true, true, true, true, false];
                        select("success", generalSettingsArray[0], true);
                        select("info", generalSettingsArray[1], true);
                        select("warning", generalSettingsArray[2], true);
                        select("error", generalSettingsArray[3], true);
                        select("alarm", generalSettingsArray[4], true);
                        backend.getSetting("isBuzzerActive").then(setting => {
                            select("buzzer", setting.data, true);
                        })
                    }, selectedElements => {
                        let finalArrayDB = selectedElements.map(element => element.checked);
                        localStorage.setItem("general", JSON.stringify(finalArrayDB.filter((item, index) => index != 5)));
                        backend.saveSettings("isBuzzerActive", finalArrayDB[5]);
                    });
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

    let tankCarouselPos = Math.round(tankCarousel.scrollLeft/756);
    [...pagination.children].forEach(child => child.classList.remove("active"));
    pagination.children[tankCarouselPos].classList.add("active");

    tankCarouselNextBtn.onclick = () => {
        if (tankCarouselPos == 2) return;
        tankCarouselPos += 1;
        tankCarousel.children[tankCarouselPos].scrollIntoView({ behavior: "smooth" });
    }
    tankCarouselBackBtn.onclick = () => {
        if (tankCarouselPos == 0) return;
        tankCarouselPos -= 1;
        tankCarousel.children[tankCarouselPos].scrollIntoView({ behavior: "smooth" });
    }
    tankCarousel.addEventListener("scroll", () => {
        tankCarouselPos = Math.round(tankCarousel.scrollLeft/756);

        [...pagination.children].forEach(child => child.classList.remove("active"));
        pagination.children[tankCarouselPos].classList.add("active");
    })
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
    let isSensorDisconnectedArr = [false, false, false];
    let tanksSettingsObject;

    backend.getSetting`tanks`.then(tanksSettings => {
        tanksSettings?.data.forEach((item) => {
            let index = tanksSettings?.data.indexOf(item);
            let tankName = tanksSettings?.search(index, "tankName");
            new TankUI(tanks[index], tanksMinimal[index], tankName);
        })
        tanksSettingsObject = tanksSettings;
    })
    backend.onSensorData = data => {
        if (!tanksSettingsObject) return;
        let sensReadings = [data.sensor1, data.sensor2, data.sensor3];
        for (let i = 0; i < tanks.length; i++) {
            if (!isSensorDisconnectedArr[i]) {
                if (sensReadings[i] === -1) {
                    new PopupInline("error", `Sensor At ${tanksSettingsObject.search(i, "tankName")} Is Disconnected Or Not Functioning Properly`)
                    isSensorDisconnectedArr[i] = true;
                    let tankClass = new TankUI(tanks[i], tanksMinimal[i]);
                    tankClass.percentage = "N/A";
                    tankClass.liters = "0";
                } else {
                    let tankClass = new TankUI(tanks[i], tanksMinimal[i]);
                    let tankLiters = Math.floor(tanksSettingsObject.search(i, "maxLiters") * sensReadings[i] / 100);
                    tankClass.percentage = sensReadings[i];
                    tankClass.liters = tankLiters;
                }
            } else if (sensReadings[i] != -1) {
                new PopupInline("success", `Sensor At ${tanksSettingsObject.search(i, "tankName")} Is Successfully Connected`)
                isSensorDisconnectedArr[i] = false;
            }
        }
    }
}


function init() {
    handleSettingsPopup();
    handleTankCarousel();
    handleTankUI();

    if (localStorage.getItem("pallete")) {
        let finalColorPallete = JSON.parse(localStorage.getItem("pallete"))[1];
        useColorPallete(finalColorPallete);
    }

    backend.onConnect = () => {
        handlePumpBtnPress();
        backend.init();
        new PopupInline("success", "App Successfully Connected To WaveWatch Controller");

        backend.getSetting("timer").then(timer => timedOperationToggle.checked = timer.data[2]);
    }
    backend.onDisconnect = () => {
        new PopupInline("error", "App Disconnected From Server. This Could Be Because The Controller Is Switched OFF");
        setIndicatorColorUI("disconnected");
        backend.websocket = null;
    }
    backend.getLiveReading(250);
}

backend.sk.onMsg = msg => {
    console.log(msg);
    if (msg.name == "GET_PUMP_STATE" || msg.name == "PUMP_STATE") {
        currentPumpState = stateToBool(msg.data);
        if (msg.name == "PUMP_STATE") {
            let isMobileAlarmActive = JSON.parse(localStorage.getItem("general"))[4];
            if (isMobileAlarmActive) alarm.play();
        }
    } else if (msg.name == "GET_SMART_FLOW_STATE" || msg.name == "SMART_FLOW_STATE") {
        if (msg.reason) {
            new PopupInline("info", `Pump Going To ${msg.data} Due To ${msg.reason}`);
        } else {
            smartFlowToggle.checked = stateToBool(msg.data);
        }
    } else if (msg.name == "TIMER_STATE") {
        timedOperationToggle.checked =  stateToBool(msg.data);
    }
    setIndicatorColorUI(currentPumpState);
}
backend.sk.onError = (error) => {
    console.log(error);
    if (error?.target) {
        new PopupInline("info", "Trying To Reconnect Back To The Controller's Server");
    } else {
        const popupWindow = document.querySelector(".popupWindow");
        document.getElementById("popupRoot").innerHTML = "";
        popupWindow.classList.remove("show");
        smartFlowToggle.checked = false;
        timedOperationToggle.checked = false;
        scrollTo({top: 0});
        new PopupInline("error", "Unable To Perform Action. App Disconnected From Server");
    }
    setIndicatorColorUI("disconnected");
}

// Utility Functions
function useColorPallete(colorsArray) {
    document.documentElement.style.setProperty("--accent1", colorsArray[0]);
    document.documentElement.style.setProperty("--accent2", colorsArray[1]);
    document.documentElement.style.setProperty("--dark1", colorsArray[2]);
    document.documentElement.style.setProperty("--dark2", colorsArray[3]);
    document.documentElement.style.setProperty("--dark3", colorsArray[4]);
}
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
    setIndicatorColorUI(currentPumpState);
    backend.send("SMART_FLOW_STATE", boolean ? "ON" : "OFF");
}
function stateToBool(state) {
    if (state == "ON") return true;
    if (state == "OFF") return false;
    console.error("State Unidentifed:", state);
    return -1;
}

// Class Objects:
class TankUI {
    constructor(tankRoot, tankMinimalRoot, name) {
        this.tankPercentagePlaceholder = tankRoot.querySelector(".tankPercentage");
        this.tankLitersPlaceholder = tankRoot.querySelector(".tankLiters");
        this.tankBGPercentage = tankRoot.querySelector(".circleInner");

        this.tankPercentagePlaceholderMinimal = tankMinimalRoot.querySelector(".tankPercentage");
        this.tankBGPercentageMinimal = tankMinimalRoot.querySelector(".tankFill");

        if (name) {
            tankRoot.querySelector(".tankName").textContent = name;
            tankMinimalRoot.querySelector(".tankName").textContent = name;
        }
    }
    set percentage(value) {
        this.tankPercentagePlaceholder.textContent = value + "%";
        this.tankPercentagePlaceholderMinimal.textContent = value + "%";

        let percentageToDeg = 360 * value / 100;
        this.tankBGPercentage.style = `background: conic-gradient(var(--accent1), var(--accent2) ${percentageToDeg}deg, transparent ${percentageToDeg}deg)`;
        this.tankBGPercentageMinimal.style = `height: ${value}%`;
    }
    set liters(value) {
        this.tankLitersPlaceholder.textContent = value + "L";
    }
}
class Popup {
    selectedElements = [];
    setInputValue(idStr, data, isToggle = false) {
        let element;
        if (data == "#ELEMENT#" || data == "#VALUE#") {
            element = idStr;
        } else if (data == "#ALL#") {
            element = [...document.querySelectorAll(idStr)];
        } else {
            element = document.getElementById(idStr);
            if (data) {
                if (isToggle) {
                    element.checked = data;
                } else {
                    element.value = data;
                }
            }
        }
        this.selectedElements.push(element);
        return element;
    }
    constructor(htmlString, windowTitle, setInputValue = null, onSaveArg = null) {
        const popupWindow = document.querySelector(".popupWindow");
        document.getElementById("popupRoot").innerHTML = htmlString;
        document.getElementById("popupWindowTitle").innerHTML = windowTitle;

        if (setInputValue) setInputValue(this.setInputValue.bind(this), windowTitle);
        if (onSaveArg) {
            popupWindow.classList.add("saveable");
        } else {
            popupWindow.classList.remove("saveable");
        }

        popupWindow.classList.add("show");
        popupWindow.querySelector("#settingsBackBtn").onclick = () => {
            document.getElementById("popupRoot").innerHTML = "";
            popupWindow.classList.remove("show");
        }
        popupWindow.querySelector("#settingsSaveBtn").onclick = () => {
            document.getElementById("popupRoot").innerHTML = "";
            popupWindow.classList.remove("show");

            onSaveArg(this.selectedElements);
        }
    }
}
class PopupInline {
    constructor(popupType, popupHTML) {
        let notifcationSettings = JSON.parse(localStorage.getItem("general"))?.filter((item, index) => index < 4) || [true, true, true, true];

        let iconName;
        if (popupType == "success" && notifcationSettings[0]) {
            iconName = "checkmark-circle";
        } else if (popupType == "info" && notifcationSettings[1]) {
            iconName = "information-circle";
        } else if (popupType == "warning" && notifcationSettings[2]) {
            iconName = popupType;
        } else if (popupType == "error" && notifcationSettings[3]) {
            iconName = "bug";
        } else return;

        const root = document.querySelector(".popupStack");
        const div = document.createElement("div");

        div.classList.add("message", popupType);
        div.innerHTML = `
            <ion-icon name="${iconName}"></ion-icon>
            <p>${popupHTML}</p>
            <ion-icon name="close-outline" onclick="this.parentElement.remove()"></ion-icon>
        `

        var x = new MutationObserver(function (e) {
            if (e[0].removedNodes) {
                if (root.lastElementChild == div) {
                    setTimeout(() => {
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