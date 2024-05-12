#include <ESP8266WiFi.h>
#include <ESPAsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <LittleFS.h>
#include <FS.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>
#include <OneButton.h>
#include <ESPAsyncWiFiManager.h>
#include <ESP8266mDNS.h>

// Custom libraries made by myself for this project
#include <ultrasonicSensor.h>
#include <SmartFlowTank.h>

const int relayPump = D0;
const int buzzer = D1;
const int autoPumpIndicator = D8;

bool smartFlowListenActive = true;
bool isFirstBoot = true;

bool isWiFiSetupCompleted = false;
const int wifiManagerTimeout = 120; // Timeout for on demand config portal in seconds
unsigned long wifiConnectionStartTime = millis();

// Loop Interval milliseconds
const long buttonInterval = 10;  // Interval for button.tick() in milliseconds
const long sensorInterval = 250; // Interval for sensor readings in milliseconds
const long smartFlowInterval = 250; // Interval for smartFlow in milliseconds
const long wifiConnectionInterval = 500; // Interval for WiFi-reconnection in milliseconds

// Loop Previous milliseconds
unsigned long buttonPreviousMillis = 0;
unsigned long sensorPreviousMillis = 0;
unsigned long smartFlowPreviousMillis = 0;
unsigned long wifiConnectionPreviousMillis = 0;

struct Settings {
  char ssid[32];
  char password[64];
  IPAddress ip;
  IPAddress gateway;
  IPAddress subnet;
  IPAddress dns1;
  IPAddress dns2;
};
Settings settings;

                                          // trig | echo | height |
UltrasonicSensor sensor1(0, 4, 0.6);      // D3   | D2   | 0.6    |
UltrasonicSensor sensor2(2, 14, 0.6);     // D4   | D5   | 0.6    |
UltrasonicSensor sensor3(13, 12, 0.6);    // D7   | D6   | 0.6    |
int sensIterations = 10;

SmartFlowTank tank1(0, 90, -50, "Tank 1");
SmartFlowTank tank2(10, 100, 50, "Tank 2");
SmartFlowTank tank3(0, 100, 0, "Tank 3");

UltrasonicSensor sensors[] = {sensor1, sensor2, sensor3};
SmartFlowTank tanks[] = {tank1, tank2, tank3};


DNSServer dns;
AsyncWebServer server(80);
AsyncWiFiManager wm(&server, &dns);
WebSocketsServer webSocket = WebSocketsServer(81);

StaticJsonDocument<200> doc_tx;
StaticJsonDocument<200> doc_rx;
StaticJsonDocument<200> doc_stored;

OneButton button(A0, false); 

String state = "OFF"; // Initial Pump State
String wifiConnectionState = "DISCONNECTED";

String getPercentage() {
  String jsonString = "";
  JsonObject object = doc_tx.to<JsonObject>();

  object["name"] = "SENSOR_PERCENTAGE";
  object["sensor1"] = sensor1.percentage;
  object["sensor2"] = sensor2.percentage;
  object["sensor3"] = sensor3.percentage;
  serializeJson(doc_tx, jsonString);

  return String(jsonString);
}
String getRelayState() {
  String relayState = "OFF";
  digitalRead(relayPump) ? relayState = "ON" : relayState = "OFF";
  return relayState;
}

// Setup Functions
void initializePins() {
  pinMode(relayPump, OUTPUT);
  pinMode(buzzer, OUTPUT);
  pinMode(autoPumpIndicator, OUTPUT);
  pinMode(2, OUTPUT);
}
void mountFileSystem() {
  LittleFS.begin();
  if (!LittleFS.begin()) {
    Serial.println("File does not exist");
  } else if (!LittleFS.exists("/index.html")) {
    Serial.println("Failed to mount file system");
  } else {
    Serial.println("File system mounted successfully!");
  }
}
void handleButtonPress() {
  button.attachClick(singleclick);
  button.attachDoubleClick(doubleclick);
  button.attachLongPressStop(longclick);
}
bool loadSettings() {
  // Open settings file
  File file = LittleFS.open("/settings.json", "r");
  if (!file) {
    Serial.println("Failed to open settings file");
    return false;
  }

  // Read settings from file
  size_t size = file.size();
  if (size == 0) {
    Serial.println("Settings file is empty");
    file.close();
    return false;
  }

  // Allocate a buffer to store the JSON data
  std::unique_ptr<char[]> buf(new char[size]);
  file.readBytes(buf.get(), size);
  file.close();

  // Parse JSON data
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, buf.get());
  if (error) {
    Serial.println("Failed to parse JSON");
    return false;
  }

  // Copy settings from JSON to settings struct
  strcpy(settings.ssid, doc["ssid"]);
  strcpy(settings.password, doc["password"]);

  // WiFi Static Ip Config
  const char* ipStr = doc["ip"];
  const char* gatewayStr = doc["gateway"];
  const char* subnetStr = doc["subnet"];
  const char* dns1Str = doc["dns1"];
  const char* dns2Str = doc["dns2"];

  IPAddress ip, gateway, subnet, dns1, dns2;
  if (!ip.fromString(ipStr) || !gateway.fromString(gatewayStr) ||
    !subnet.fromString(subnetStr) || !dns1.fromString(dns1Str) || !dns2.fromString(dns2Str)) {
    Serial.println("Failed to convert IP address strings");
    return false;
  }
  WiFi.config(ip, gateway, subnet, dns1, dns2);

  return true;
}

// IOT Connection Functions
void connectToWifi() {
  if (wifiConnectionState == "DISCONNECTED") {
    Serial.println("");
    Serial.print("Connecting to SSID: ");
    Serial.println(settings.ssid);
    Serial.print("Password: ");
    Serial.println(settings.password);

    Serial.println();

    // WiFi.config(settings.ip, settings.gateway, settings.subnet, settings.dns1, settings.dns2);
    WiFi.begin(settings.ssid, settings.password);
  }

  wifiConnectionState = "CONNECTING";
  if (millis() - wifiConnectionStartTime > 10000) {
    // If connection attempt takes more than 10 seconds, assume failure
    Serial.println("Failed to connect to WiFi. Enter setup mode.");
    wifiConnectionState = "FAILURE";
    return;
  }
  Serial.print(".");
}
void startWiFiManagerConfigPortal() {
  wm.resetSettings();

  IPAddress staticIP(192, 168, 0, 199); // Set your desired static IP address
  IPAddress gateway(192, 168, 0, 1);    // Set your gateway IP address
  IPAddress subnet(255, 255, 255, 0);   // Set your subnet mask
  IPAddress dns1(8, 8, 8, 8);           // Set your DNS server IP address
  IPAddress dns2(8, 8, 4, 4);           // Set your DNS server IP address
  wm.setSTAStaticIPConfig(staticIP, gateway, subnet, dns1, dns2);

  // set configportal timeout 
  wm.setConfigPortalTimeout(wifiManagerTimeout);

  if (!wm.startConfigPortal("WaveWatch", NULL, 2)) {
    Serial.println("failed to connect and hit timeout");
    delay(3000);
    // reset and try again, or maybe put it to deep sleep
    ESP.restart();
    delay(5000);
  }
  buzzerSFX(1);

  StaticJsonDocument<256> doc;
  doc["ssid"] = WiFi.SSID();
  doc["password"] = WiFi.psk();
  
  doc["ip"] = WiFi.localIP().toString();
  doc["gateway"] = WiFi.gatewayIP().toString();
  doc["subnet"] = WiFi.subnetMask().toString();
  doc["dns1"] = WiFi.dnsIP(0).toString();
  doc["dns2"] = WiFi.dnsIP(1).toString();

  isWiFiSetupCompleted = false;
  saveSettings(doc);
}
void handleWiFiConnected() {
  if (!isWiFiSetupCompleted) {
      wifiConnectionState = "CONNECTED";
      digitalWrite(2, LOW);

      Serial.println("");
      Serial.print("Connected to: ");
      Serial.println(WiFi.SSID());
      Serial.print("IP Address: ");
      Serial.println(WiFi.localIP());
      Serial.println("");

      initializeWebSocket();
      handleServerRequests();
      server.begin();
      MDNS.begin("wavewatch");
      Serial.println("WiFi Setup Completed!");

      isWiFiSetupCompleted = true;
    }
    webSocket.loop();
    MDNS.update();
}
void initializeWebSocket() {
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
}
void handleServerRequests() {
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(LittleFS, "/index.html", "text/html", false);          
  });
  server.on("/index.css", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(LittleFS, "/index.css", "text/css");
  });
  server.on("/index.js", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(LittleFS, "/index.js", "text/javascript");
  });
  server.on("/backend.js", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(LittleFS, "/backend.js", "text/javascript");
  });
  server.on("/sw.js", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(LittleFS, "/sw.js", "text/javascript");
  });
  server.on("/manifest.json", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(LittleFS, "/manifest.json", "application/json");
  });
  server.on("/settings.json", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(LittleFS, "/settings.json", "application/json");
  });
  server.on("/src/logo72.png", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(LittleFS, "/src/logo72.png", "image/png");
  });
  server.on("/src/logo512.png", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(LittleFS, "/src/logo512.png", "image/png");
  });
  server.on("/src/scrollAnchor.png", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(LittleFS, "/src/scrollAnchor.png", "image/png");
  });
  server.on("/percentage", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send_P(200, "text/plain", getPercentage().c_str());
  });
}


// Utility Functions
void buzzerSFX(int iterationCount) {
  for (unsigned i = 0; i < iterationCount; ++i) {
    digitalWrite(buzzer, HIGH);
    delay(1000);
    digitalWrite(buzzer, LOW);
    delay(1000);
  } 
}
void sendWSData(String name, String data, String reason = "") {
  String jsonString = "";
  JsonObject object = doc_tx.to<JsonObject>();
  object["name"] = name;
  object["data"] = data;
  if (reason) {
    object["reason"] = reason;
  }
  serializeJson(doc_tx, jsonString);
  Serial.println(jsonString);
  webSocket.broadcastTXT(jsonString);
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

        Serial.println(commandData);
        if (String(commandName) == "GET_PUMP_STATE") {
          sendWSData("GET_PUMP_STATE", getRelayState());
          return;
        }
        if (String(commandName) == "GET_SMART_FLOW_STATE") {
          sendWSData("GET_SMART_FLOW_STATE", smartFlowListenActive ? "ON" : "OFF");
          return;
        }
        if (String(commandName) == "PUMP_STATE") {
          setPumpState(String(commandData));
          smartFlowListenActive = false;
          return;
        }
        if (String(commandName) == "SMART_FLOW_STATE") {
          if (String(commandData) == "ON") {
            smartFlowListenActive = true;
          } else if (String(commandData) == "OFF") {
            smartFlowListenActive = false;
          }
          return;
        }
      }

      break;
  }
}
void saveSettings(StaticJsonDocument<256> doc) {
  File file = LittleFS.open("/settings.json", "w");
  if (!file) {
    Serial.println("Failed to open settings file for writing");
    return;
  }

  // Serialize JSON to file
  if (serializeJson(doc, file) == 0) {
    Serial.println("Failed to write JSON to settings file");
    file.close();
    return;
  }

  file.close();
  Serial.println("Settings updated successfully");  
}
void setPumpState(String state) {
  Serial.print("Pump Going To ");
  Serial.println(state);
  if (state == "OFF") {
    buzzerSFX(3);
    digitalWrite(relayPump, LOW);
  } else {
    buzzerSFX(2);
    digitalWrite(relayPump, HIGH);
  }
  sendWSData("PUMP_STATE", state);
}


String lastReason = "";
void smartFlowListen() {
  String reason = "";
  Serial.print("Adjusted Percentage [1, 2, 3]: ");

  // Tank Loop
  bool loopBreak = false;
  for (int i = 0; i < 3; i++) {
    SmartFlowTank &currentTank = tanks[i];

    currentTank.loop(sensors[i].percentage);
    Serial.print(sensors[i].percentage);
    if (i < 2) Serial.print(", ");

    // If any one tank has smartFlowPumpState as OFF, then never
    // run the code again but continue to currentTank.loop();
    if (!loopBreak && currentTank.smartFlowPumpState == "OFF") {
      state = currentTank.smartFlowPumpState;
      reason = currentTank.reason;
      loopBreak = true;
    }
  }
  Serial.println();
  

  // 3 Tank Priority Based Smart Flow Mode
  // Do Not Run If State Was Already Set To OFF
  if (!loopBreak) {
    if (tanks[0].tolCondition) { // Tank 1
      reason = tanks[0].reason;

      if (tanks[1].tolCondition) {
        if (lastReason.indexOf(tanks[1].name) != -1) { // Tank 2
          reason = tanks[1].reason;
        }
        
        if (tanks[2].tolCondition) {
          if (lastReason.indexOf(tanks[2].name) != -1) { // Tank 3
            reason = tanks[2].reason;
          }
          state = "ON";
        }
      }
    }
  }

  if (getRelayState() == state) return;
  lastReason = reason;
  sendWSData("SMART_FLOW_STATE", state, reason);
  setPumpState(state);
}

void doubleclick () {
  if (getRelayState() == "ON") {
    Serial.println("Turining off the pump");
    setPumpState("OFF");
  } else if (getRelayState() == "OFF") {
    Serial.println("Turining on the pump");
    setPumpState("ON");
  }
  smartFlowListenActive = false;
}
void singleclick () {
  if (isFirstBoot) {
    isFirstBoot = false;
    return;
  }
  Serial.println("Single Clicked!");
  buzzerSFX(1);
  smartFlowListenActive = !smartFlowListenActive;
  Serial.printf("smartFlowListenActive: %d \n", smartFlowListenActive);
}
void longclick () {
  digitalWrite(autoPumpIndicator, LOW);
  buzzerSFX(4);
  startWiFiManagerConfigPortal();
}


// Loop Functions
void handleButtonLoop(unsigned long currentMillis) {
  // Button interval 10ms
  if (currentMillis - buttonPreviousMillis >= buttonInterval) {
    buttonPreviousMillis = currentMillis;
    button.tick(analogRead(button.pin()) / 1024);
  }
}
void handleSensorLoop(unsigned long currentMillis) {
  // Sensor interval 100ms
  if ((currentMillis - sensorPreviousMillis >= sensorInterval)) {
    sensorPreviousMillis = currentMillis;

    for (UltrasonicSensor &sensor : sensors) {
      sensor.sense();
      sensor.getPercentage(sensIterations);
    }
  }
}
void handleSmartFlowLoop(unsigned long currentMillis) {
  // Same interval as the sensors
  if ((currentMillis - smartFlowPreviousMillis >= smartFlowInterval)) {
    smartFlowPreviousMillis = currentMillis;
    if (smartFlowListenActive) {
      if (digitalRead(autoPumpIndicator) == LOW) {
        digitalWrite(autoPumpIndicator, HIGH);
        sendWSData("SMART_FLOW_STATE", "ON");
      }
      smartFlowListen();
    } else {
      if (digitalRead(autoPumpIndicator) == HIGH) {
        digitalWrite(autoPumpIndicator, LOW);
        sendWSData("SMART_FLOW_STATE", "OFF");
      }
    }
  }
}
void handleWiFiLoop(unsigned long currentMillis) {
  if (WiFi.status() == WL_CONNECTED) {
      handleWiFiConnected();
  } else {
    if (!(wifiConnectionState == "FAILURE") and (currentMillis - wifiConnectionPreviousMillis >= wifiConnectionInterval)) {
      wifiConnectionPreviousMillis = currentMillis;
      connectToWifi();
    }
    digitalWrite(2, HIGH);
  } 
}


void setup() {
  delay(5000); // For Testing purposses only!!!

  Serial.begin(115200);
  initializePins();
  mountFileSystem();
  handleButtonPress();
  getRelayState();

  loadSettings();
}
void loop() {
  unsigned long currentMillis = millis();

  handleButtonLoop(currentMillis);
  handleSensorLoop(currentMillis);
  handleSmartFlowLoop(currentMillis);
  handleWiFiLoop(currentMillis);
}