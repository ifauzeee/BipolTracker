#define TINY_GSM_MODEM_SIM808
#define TINY_GSM_RX_BUFFER 1024

#include <TinyGsmClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

const char server[] = "72.61.141.118";
const int port = 3000;
const String resource = "/api/track";

#define MODEM_RX_PIN 26
#define MODEM_TX_PIN 27
#define MQ2_PIN 34
#define I2C_SDA 21
#define I2C_SCL 22

const char apn[] = "M2MAUTOTRONIC";
const char user[] = "";
const char pass[] = "";

#define SerialMon Serial
#define SerialAT Serial2

TinyGsm modem(SerialAT);
TinyGsmClient client(modem);
LiquidCrystal_I2C lcd(0x27, 16, 2);

float lat = 0, lon = 0, speed = 0, alt = 0;
int vsat = 0, usat = 0, mq2Value = 0;
unsigned long lastSendTime = 0;
const long sendInterval = 10000;

void setup() {
  SerialMon.begin(115200);
  delay(100);

  Wire.begin(I2C_SDA, I2C_SCL);
  lcd.init();
  lcd.backlight();
  lcd.print("System Start");

  SerialAT.begin(9600, SERIAL_8N1, MODEM_RX_PIN, MODEM_TX_PIN);
  delay(3000);

  if (!modem.restart()) {
    lcd.clear();
    lcd.print("Modem Error");
    while (true);
  }

  modem.enableGPS();
  
  if (!modem.gprsConnect(apn, user, pass)) {
    lcd.setCursor(0, 1);
    lcd.print("GPRS Fail");
    delay(2000);
  } else {
    lcd.setCursor(0, 1);
    lcd.print("Connected");
    delay(1000);
  }
}

void loop() {
  modem.getGPS(&lat, &lon, &speed, &alt, &vsat, &usat);
  mq2Value = analogRead(MQ2_PIN);

  static unsigned long lastLcdUpdate = 0;
  if (millis() - lastLcdUpdate > 1000) {
    lastLcdUpdate = millis();
    lcd.clear();
    lcd.setCursor(0, 0);
    if (lat != 0) {
      lcd.print("L:"); lcd.print(lat, 4);
      lcd.print(" S:"); lcd.print((int)speed);
    } else {
      lcd.print("GPS Search...");
    }
    lcd.setCursor(0, 1);
    lcd.print("Gas:"); lcd.print(mq2Value);
  }

  if (millis() - lastSendTime > sendInterval) {
    lastSendTime = millis();

    if (modem.isGprsConnected()) {
      sendDataToVPS(lat, lon, mq2Value, speed);
    } else {
      modem.gprsConnect(apn, user, pass);
    }
  }
  modem.maintain();
}

void sendDataToVPS(float flat, float flon, int fgas, float fspeed) {
  String postData = "{";
  postData += "\"bus_id\":\"BUS-01\",";
  postData += "\"latitude\":