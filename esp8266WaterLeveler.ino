#include <ESP8266WiFi.h>
#include <ESPAsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <LittleFS.h>
#include <FS.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>
#include <OneButton.h>
#include <ESPAsyncWiFiManager.h>

// Custom library made by myself for this project
#include <ultrasonicSensor.h>

const int relayPump = D0;
const int buzzer = D1;
const int autoPumpIndicator = D8;

int percentage, liters = 0;
int tolerance = 50;
bool autoPumpContollerActive = true;
String relayState = "OFF";
                                                  // trig | echo | height | diameter | maxLiters
UltrasonicSensor sensor1(0, 4, 0.6, 1, 1000);     // D3   | D2   | 0.6    | 1        | 1000
// UltrasonicSensor sensor2(13, 12, 0.5, 1, 1000);   // D7   | D6   | 1      | 1        | 1000
UltrasonicSensor sensor2(2, 14, 0.5, 1, 1000); // D4   | D5   | 0.5    | 1        | 1000
AsyncWebServer server(80);
WebSocketsServer webSocket = WebSocketsServer(81);
DNSServer dns;
StaticJsonDocument<200> doc_tx;
StaticJsonDocument<200> doc_rx;
StaticJsonDocument<200> doc_stored;
OneButton button(A0, false); 

// WiFi credentials (to be changed for commercial use)
#define BUTTON_SHORT_PRESS 1
#define BUTTON_LONG_PRESS 2
#define BUTTON_DOUBLE_PRESS 3


String getPercentage() {
  String jsonString = "";
  JsonObject object = doc_tx.to<JsonObject>();

  object["name"] = "SENSOR_PERCENTAGE";
  object["sensor1"] = sensor1.percentage;
  object["sensor2"] = sensor2.percentage;
  serializeJson(doc_tx, jsonString);

  Serial.print("Water Level (%): ");
  Serial.println(jsonString);
  return String(jsonString);
}
String getLiters() {
  String jsonString = "";
  JsonObject object = doc_tx.to<JsonObject>();

  object["name"] = "SENSOR_LITERS";
  object["sensor1"] = sensor1.liters;
  object["sensor2"] = sensor2.liters;
  serializeJson(doc_tx, jsonString);

  Serial.print("Liters (L): ");
  Serial.println(jsonString);
  return String(jsonString);
}
String getRelayState() {
  digitalRead(relayPump) ? relayState = "ON" : relayState = "OFF";
  return relayState;
}
String processor(const String &var) {
  Serial.print("VAR: ");
  Serial.println(var);
  if (var == "STATE")
  {
    return getRelayState();
  }
  if (var == "PERCENTAGE")
  {
    return (String) sensor1.percentage;
  }
  if (var == "MILLILITERS")
  {
    return (String) sensor1.liters;
  }
  return "ERROR";
}

// Initialize Functions
void initializePins() {
  pinMode(relayPump, OUTPUT);
  pinMode(buzzer, OUTPUT);
  pinMode(autoPumpIndicator, OUTPUT);
}
void connectToWiFi(String ssid, String password) {
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.print("Connected to: ");
  Serial.println(ssid);
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}
void initializeWebSocket() {
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
}
void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_TEXT:

      // Handle incoming text message from the client
      DeserializationError error = deserializeJson(doc_rx, payload);
      if (error) {
        Serial.println("ERR: Something went wrong while deserializing the data");
        return;
      } else {
        
        const char* commandName = doc_rx["name"];
        const char* commandData = doc_rx["data"];

        Serial.print(commandData);
        if (String(commandName) == "PUMP_STATE") {
          setPumpState(String(commandData));
          autoPumpContollerActive = false;
          return;
        } 
        if (String(commandName) == "AUTO_PUMP_STATE") {
          autoPumpContollerActive = commandData;
          return;
        }
      }

      break;
  }
}
int mountFileSystem() {
  LittleFS.begin();
  if (!LittleFS.begin()) return -1;
  if (!LittleFS.exists("/index.html")) return 1;
  return 0;
}

AsyncWiFiManager wifiManager(&server, &dns);
void setup() {
  Serial.begin(115200);

  wifiManager.autoConnect("WaveWatch");
  connectToWiFi(WiFi.SSID(), WiFi.psk());

  // Runs only after wifi gets connected 👇
  initializeWebSocket();
  initializePins();
  int errorCode = mountFileSystem();
  if (errorCode == 1) {
    Serial.println("File does not exist");
    return;
  } else if (errorCode == -1) {
    Serial.println("Failed to mount file system");
    return;
  } else Serial.println("File system mounted successfully!");

  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(LittleFS, "/index.html", "text/html", false, processor);          
  });
  server.on("/stored", HTTP_GET, [](AsyncWebServerRequest *request) {
    doc_stored["autoPumpContollerActive"] = autoPumpContollerActive;
    doc_stored["key2"] = 42;

    // Convert the JSON object to a string
    String jsonData;
    serializeJson(doc_stored, jsonData);
    
    request->send(200, "application/json", jsonData);
  });
  server.on("/Styles/styles.css", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(LittleFS, "/Styles/styles.css", "text/css");
  });
  server.on("/Scripts/main.js", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(LittleFS, "/Scripts/main.js", "text/javascript");
  });
  server.on("/Scripts/backend.js", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(LittleFS, "/Scripts/backend.js", "text/javascript");
  });
  server.on("/percentage", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send_P(200, "text/plain", getPercentage().c_str());
  });
  server.on("/liters", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send_P(200, "text/plain", getLiters().c_str());
  });

  button.attachClick(singleclick);
  button.attachDoubleClick(doubleclick);
  button.attachLongPressStop(longclick);

  getRelayState();
  server.begin();
}
void loop() {
  button.tick(analogRead(button.pin())/1024);

  webSocket.loop();
  sensor1.sense();
  sensor1.getPercentage();
  sensor1.getLiters();

  sensor2.sense();
  sensor2.getPercentage();
  sensor2.getLiters();

  if (autoPumpContollerActive) {
    if (digitalRead(autoPumpIndicator) == LOW) {
      digitalWrite(autoPumpIndicator, HIGH);
      delay(2000);
    }
    autoPumpContoller();
  } else {
    digitalWrite(autoPumpIndicator, LOW);
  }

  delay(10);
}

// Utility Functions
void setPumpState(String state) {
  if (getRelayState() == state) return;
  if (state == "OFF") {
    buzzerSFX(3);
    digitalWrite(relayPump, LOW);
  } else {
    buzzerSFX(2);
    digitalWrite(relayPump, HIGH);
  }
  
  sendWSData("PUMP_STATE", state);
}

String state = "OFF"; // Initial Pump State
void autoPumpContoller() {
  Serial.printf("Adjusted percentage 1: %d \n", sensor1.percentage);  
  Serial.printf("Adjusted percentage 2: %d \n", sensor2.percentage);

  if (sensor2.percentage >= tolerance) {
    if (sensor1.percentage >= 90) {
      state = "OFF";
    } else if (sensor1.percentage <= tolerance) {
      state = "ON";
    }
  } else if (sensor2.percentage <= 10) {
    state = "OFF";
  } else if (sensor1.percentage >= 90) {
    state = "OFF";
  }
  setPumpState(state);
}

void buzzerSFX(int iterationCount) {
  for (unsigned i = 0; i < iterationCount; ++i) {
    digitalWrite(buzzer, HIGH);
    delay(1000);
    digitalWrite(buzzer, LOW);
    delay(1000);
  } 
}

void sendWSData(String name, String data) {
  String jsonString = "";
  JsonObject object = doc_tx.to<JsonObject>();
  object["name"] = name;
  object["data"] = data;
  serializeJson(doc_tx, jsonString);
  Serial.println(jsonString);
  webSocket.broadcastTXT(jsonString);
}

void doubleclick () {
  if (getRelayState() == "ON") {
    Serial.print("Turining off the pump");
    setPumpState("OFF");
  } else if (getRelayState() == "OFF") {
    Serial.print("Turining on the pump");
    setPumpState("ON");
  }
  autoPumpContollerActive = false;
}
bool isAutomaticClick = true;
void singleclick () {
  Serial.println("Single Clicked!");
  if (isAutomaticClick) {
    isAutomaticClick = false;
    return;
  }
  buzzerSFX(1);
  autoPumpContollerActive = !autoPumpContollerActive;
  Serial.printf("autoPumpContollerActive: %d \n", autoPumpContollerActive);
}
void longclick () {
  Serial.println("Long Clicked!");
  buzzerSFX(4);
  wifiManager.resetSettings();
  ESP.restart();
}