// class Socket {
//     /** @type {WebSocket} */
//     websocket;
//     /** @type {Function} */
//     onOpen = () => {
//         // WebSocket connection oppened
//         console.log('Connection opened');
//     }
//     /** 
//      * @type {Function} 
//      * @param {CloseEvent} event
//      **/
//     onClose = (event) => {
//         // WebSocket connection closed
//         if (event.wasClean) {
//             console.log(`Connection closed cleanly, code=${event.code}, reason=${event.reason}`);
//         } else {
//             console.error(`Connection died`);
//             document.getElementById("relayState").innerText = "Disconnected";
//             console.log("WebSocket Connection Lost", "The server may be down.");
//         }
//         setTimeout(() => this.init(), 2000);
//     }
//     /** @type {Function} */
//     onError = (error) => {
//         // WebSocket connection error
//         console.error("WebSocket Error:", error);
//     }
//     /** @type {Function} */
//     onMsg;

//     /** @type {string} - Private*/
//     #gateway;

//     /** @param {string} gateway String that specifes the url where the websocket is running */
//     constructor(gateway) {
//         console.log('Trying to open a WebSocket connection...');
//         this.#gateway = gateway;
//     }

//     /**
//      * @param {Event} eventType - Web socket event type.
//      * @param {Function} handler - Function handler.
//      */
//     on(eventType, handler) { this.websocket.addEventListener(eventType, handler) }

//     /** 
//      * @param {string} name 
//      * @param {*} data 
//     */
//     send(name, data) {
//         let object = { name: name, data: data }
//         this.websocket.send(JSON.stringify(object));
//     }

//     init() {
//         this.websocket = new WebSocket(this.#gateway);
//         this.websocket.onopen = this.onOpen;
//         this.websocket.onclose = this.onClose.bind(this); // Ensure proper this context in onClose
//         this.websocket.onerror = this.onError;

//         this.websocket.onmessage = (event) => this.onMsg(JSON.parse(event.data)); // Deserialize the json data to read the object
//     }
// }

class Server {
    /** @type {WebSocket} */
    websocket;
    /** @type {string} - Private*/
    #gateway;
    /** @type {number} - Private*/
    #interval;

    constructor(gateway, interval) {
        this.#gateway = gateway;
        this.#interval = interval;
    }

    init() {
        console.log('Trying to open a WebSocket connection...');
        this.websocket = new WebSocket(this.#gateway);
        this.websocket.onopen = this.sk.onOpen;
        this.websocket.onclose = this.sk.onClose.bind(this); // Ensure proper this context in onClose
        this.websocket.onerror = this.sk.onError;
        this.websocket.onmessage = (event) => this.sk.onMsg(JSON.parse(event.data)); // Deserialize the json data to read the object

        this.getLiveReading(this.#interval);
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
        this.websocket.send(JSON.stringify(object));
    }

    getLiveReading(interval) {
        var eventFunc = this.onSensorData.bind(this); // Ensure the correct 'this' context 
        setInterval(() => {
            var xhttpPercentage = new XMLHttpRequest();
            xhttpPercentage.onreadystatechange = function () {
                if (this.readyState == 4 && this.status == 200) {
                    eventFunc(JSON.parse(this.responseText));
                }
            };
            xhttpPercentage.open("GET", "/percentage", true);
            xhttpPercentage.send();

            var xhttpLiters = new XMLHttpRequest();
            xhttpLiters.onreadystatechange = function () {
                if (this.readyState == 4 && this.status == 200) {
                    eventFunc(JSON.parse(this.responseText));
                }
            };
            xhttpLiters.open("GET", "/liters", true);
            xhttpLiters.send();
        }, interval)
    }

    onSensorData(res) {console.log(res)}

    async getStored() {
        try {
            const response = await fetch("/stored");
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`)
            const data = await response.json();
            console.log(data);
            return data;
        } catch (error) {
            console.error("Error fetching stored data:", error);
            return null;
        }
    }
    sk = {
        /** @type {Function} */
        onOpen: () => {
            // WebSocket connection oppened
            console.log('Connection opened');
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
                document.getElementById("relayState").innerText = "Disconnected";
                console.log("WebSocket Connection Lost", "The server may be down.");
            }
            setTimeout(() => this.init(), 2000);
        },
        /** @type {Function} */
        onError: (error) => {
            // WebSocket connection error
            console.error("WebSocket Error:", error);
        },
        /** @type {Function} */
        onMsg: () => {},
    }
}


export default Server;