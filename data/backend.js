class Backend {
    /** @type {WebSocket} */
    websocket;
    /** @type {string} - Private*/
    #gateway;
    isConnected = false;

    constructor(gateway) {
        this.#gateway = gateway;
    }
    init() {
        console.log('Trying to open a WebSocket connection...');
        this.websocket = new WebSocket(this.#gateway);
        this.websocket.onopen = this.sk.onOpen;
        this.websocket.onclose = this.sk.onClose.bind(this); // Ensure proper this context in onClose
        this.websocket.onerror = this.sk.onError;
        this.websocket.onmessage = (event) => this.sk.onMsg(JSON.parse(event.data)); // Deserialize the json data to read the object
    }

    /**
     * @param {Event} eventType - Web socket event type.
     * @param {Function} handler - Function handler.
     */
    on(eventType, handler) { this.websocket.addEventListener(eventType, handler) }

    /** 
     * @param {string} name 
     * @param {*} data 
    */
    send(name, data) {
        let object = { name: name, data: data }
        try {
            this.websocket.send(JSON.stringify(object));
        } catch (error) {
            this.sk.onError(error);
        }
    }

    onConnect = () => {console.log("%c Connected", "color: aqua");};
    onDisconnect = () => {console.log("%c Disconnected", "color: orange");}

    getLiveReading(interval) {
        var eventFunc = this.onSensorData.bind(this); // Ensure the correct 'this' context 
        var onConnect = this.onConnect; 
        var onDisconnect = this.onDisconnect; 
        var isConnected = false;
        setInterval(() => {
            var xhttpPercentage = new XMLHttpRequest();
            xhttpPercentage.open("GET", "/percentage", true);
            
            xhttpPercentage.onreadystatechange = function () {
                if (this.readyState == 4) {
                    if (this.status == 200) {
                        eventFunc(JSON.parse(this.responseText));
                        if (isConnected == false) {
                            onConnect();
                            this.isConnected = true;
                        }
                        isConnected = true;
                    } else {
                        if (isConnected == true) {
                            onDisconnect();
                            this.isConnected = false;
                        }
                        isConnected = false;
                    }
                }
            };
            xhttpPercentage.send();
        }, interval);
    }
    getTimerData(interval) {
        var eventFunc = this.onTimerTick.bind(this); 
        let lastSeconds = 0;

        let intervalID = setInterval(() => {
            var xhttpPercentage = new XMLHttpRequest();
            xhttpPercentage.open("GET", "/timer", true);
            
            xhttpPercentage.onreadystatechange = function () {
                if (this.readyState == 4) {
                    if (this.status == 200) {
                        let seconds = JSON.parse(this.responseText);
                        if (lastSeconds != seconds) {
                            eventFunc(seconds);
                        }
                        lastSeconds = seconds;
                    }
                }
            };
            xhttpPercentage.send();
        }, interval);
        return intervalID;
    }
    onSensorData(res) { console.log(res) }
    onTimerTick(res) { console.log(res) }

    async getSetting(settingName) {
        return fetch("./settings.json")
            .then(response => {
                if (!response.ok) {
                    throw new Error("Failed to fetch settings.json");
                }
                return response.json();
            })
            .then(settings => {
                if (!settings.hasOwnProperty(settingName)) {
                    throw new Error(`Setting '${settingName}' not found in settings.json`);
                }

                return {
                    data: settings[settingName],
                    search: (index = 0, ...searchItems) => {
                        if (searchItems[1]) {
                            return settings[settingName][index][searchItems[0]][searchItems[1]];
                        }
                        return settings[settingName][index][searchItems[0]];
                    }
                };
            })
            .catch(error => {
                console.error("Error fetching or processing settings:", error);
                return null;
            });
    }
    async saveSettings(settingName, data, index) {
        let fileObject = fetch("./settings.json").then(res => res.json());
        fileObject.then(settings => {
            if (isFinite(index)) {
                settings[settingName][index] = data;
            } else {
                settings[settingName] = data;
            }
            this.send("SETTINGS", JSON.stringify(settings));
        })
    }
    sk = {
        /** @type {Function} */
        onOpen: () => {
            // WebSocket connection oppened
            console.log('Connection opened');
            this.send("GET_PUMP_STATE", true);
            this.send("GET_SMART_FLOW_STATE", true);
            // this.send("GET_TIMER_ACTIVE", true);
            // this.send("GET_TIMER_ACTION", true);
            this.isConnected = true;
        },
        /** 
         * @type {Function} 
         * @param {CloseEvent} event
         **/
        onClose: (event) => {
            // WebSocket connection closed
            if (event.wasClean) {
                console.log(`Connection closed cleanly, code=${event.code}, reason=${event.reason}`);
            } else {
                console.error(`Connection died`);
                console.log("WebSocket Connection Lost", "The server may be down.");
            }
            this.isConnected = false;
            setTimeout(() => this.init(), 2000);
        },
        /** @type {Function} */
        onError: (error) => {
            // WebSocket connection error
            console.error("WebSocket Error:", error);
        },
        /** @type {Function} */
        onMsg: (msg) => {
            console.log(msg);
        },
    }
}


export default Backend;