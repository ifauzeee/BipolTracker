#include <WiFi.h>
#include <HTTPClient.h>
#include <TinyGPS++.h>

const char* ssid = "GANTI_DENGAN_NAMA_WIFI";
const char* password = "GANTI_DENGAN_PASSWORD_WIFI";
const char* serverUrl = "http://IP_SERVER_ATAU_DOMAIN:3000/api/track";
const char* busId = "BUS-01";

const int RXPin = 16;
const int TXPin = 17;
const int GASPin = 34;

TinyGPSPlus gps;
HardwareSerial gpsSerial(2);

void setup() {
  Serial.begin(115200);
  gpsSerial.begin(9600, SERIAL_8N1, RXPin, TXPin);
  pinMode(GASPin, INPUT);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
  }
}

void loop() {
  while (gpsSerial.available() > 0) {
    if (gps.encode(gpsSerial.read())) {
      if (gps.location.isValid()) {
        sendData();
        delay(3000);
      }
    }
  }
  
  if (millis() > 5000 && gps.charsProcessed() < 10) {
    delay(1000);
  }
}

void sendData() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    float lat = gps.location.lat();
    float lng = gps.location.lng();
    float spd = gps.speed.kmph();
    int gas = analogRead(GASPin);

    String json = "{";
    json += "\"bus_id\":\"" + String(busId) + "\",";
    json += "\"latitude\":" + String(lat, 6) + ",";
    json += "\"longitude\":" + String(lng, 6) + ",";
    json += "\"speed\":" + String(spd) + ",";
    json += "\"gas_level\":" + String(gas);
    json += "}";

    int httpResponseCode = http.POST(json);
    http.end();
  }
}