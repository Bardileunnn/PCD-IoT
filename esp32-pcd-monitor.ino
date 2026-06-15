/*
 * ESP32 DevKit - Auto Fan Control & Battery Monitor
 * =================================================
 * Based on corrected schematic "Feature IoT" + "Port Konektor Sensor & Proteksi ESD"
 *
 * Circuit overview:
 *
 * [1] Temperature Sensor (J5 - 3-pin connector):
 *     - Pin 1: GND
 *     - Pin 2: TEMP_DATA → through R9 (4.7kΩ pull-up to +3.3V) → GPIO5
 *     - Pin 3: +3.3V
 *     - Protected by U3 (SRV05-4 ESD protection IC) on connector lines
 *
 * [2] Fan Control (Q4 S8050 NPN transistor, low-side switch):
 *     - Collector → J6 (J_FAN) pin 1
 *     - Base → through R12 (1kΩ) → GPIO1
 *     - Emitter → GND
 *     - D5 (1N4007) flyback diode across J6 pins 1-2
 *     - IMPORTANT: NPN = active HIGH (GPIO HIGH → fan ON, GPIO LOW → fan OFF)
 *
 * [3] Battery Voltage Sense (voltage divider + filter):
 *     - R10 = 100kΩ (VIN_BUCK to BAT_SENSE node)
 *     - R11 = 10kΩ   (BAT_SENSE node to GND)
 *     - C10 = 100nF (BAT_SENSE to GND, noise filter)
 *     - BAT_SENSE → GPIO35
 *     - Divider ratio: (100k + 10k) / 10k = 11.0x
 *
 * [4] ESD Protection (U3 - SRV05-4):
 *     - 4-channel ESD protection IC on connector port
 *     - VCC → +3.3V, GND → GND
 *     - Protects TEMP_DATA and BAT_SENSE signal lines
 *
 * [5] MQTT Topics (aligned with web dashboard):
 *     - pcd/monitoring/suhu      → publish temperature (°C)
 *     - pcd/monitoring/baterai   → publish battery percentage (0-100)
 *     - pcd/monitoring/charging  → publish charging status ("1" / "0")
 *     - pcd/monitoring/kipas     → publish fan status ("ON" / "OFF")
 *     - pcd/monitoring/beban     → publish load/current
 *     - pcd/monitoring/status    → publish device status JSON
 *     - pcd/kontrol/engine       → subscribe: "START" / "STOP" / "AUTO"
 *
 * NOTE: GPIO1 = TX Serial, digunakan untuk kontrol kipas.
 *       Serial debug TIDAK dipakai agar tidak konflik.
 *       Monitoring dilakukan via MQTT saja.
 */

#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ==================== PIN DEFINITIONS ====================
#define TEMP_SENSOR_PIN   5    // GPIO5 - Analog input (NTC via J5 connector)
#define FAN_RELAY_PIN     1    // GPIO1 - Digital output → R12 (1kΩ) → Q4 base
#define BATT_SENSE_PIN    35   // GPIO35 - Analog input ADC1_CH7 (BAT_SENSE via divider)

// ==================== TEMPERATURE CONFIG ====================
// NTC Thermistor parameters (adjust to match your actual thermistor)
#define NTC_R0            10000.0   // Resistance at 25°C (Ohms)
#define NTC_B             3950.0    // B-constant (Kelvin)
#define NTC_T0            298.15    // 25°C in Kelvin
#define SERIES_RESISTOR   4700.0    // R9 = 4.7kΩ pull-up resistor (from schematic)
#define VCC               3.3       // Supply voltage for thermistor divider

// ==================== BATTERY CONFIG ====================
// Voltage divider: R10=100kΩ (top), R11=10kΩ (bottom)
// V_adc = Vbat × R11/(R10+R11) = Vbat × 10/110 = Vbat / 11
// So: Vbat = V_adc × 11
#define VDIV_RATIO        11.0      // (100k + 10k) / 10k
#define ADC_RESOLUTION    4095.0    // ESP32 12-bit ADC
#define ADC_VREF          3.3       // ADC reference voltage

// Battery voltage-to-percentage mapping (Li-Ion cell)
#define BATT_V_MIN        3.0       // Voltage at 0% (discharged)
#define BATT_V_MAX        4.2       // Voltage at 100% (fully charged)
#define BATT_V_CHARGING   4.0       // Above this → likely charging

// ==================== FAN CONTROL CONFIG ====================
// Q4 (S8050) is NPN transistor — active HIGH:
//   GPIO HIGH → base pulled high → transistor ON  → fan ON
//   GPIO LOW  → base at 0V     → transistor OFF → fan OFF
#define FAN_ON            HIGH    // NPN: HIGH = ON
#define FAN_OFF           LOW     // NPN: LOW = OFF
#define TEMP_ON           35.0    // Turn fan ON when temp >= this (°C)
#define TEMP_OFF          30.0    // Turn fan OFF when temp <= this (°C) — hysteresis
#define BATT_LOW_VOLTAGE  3.0     // Don't run fan if battery below this (V)

// ==================== TIMING ====================
#define READ_INTERVAL_MS  2000      // Read sensors every 2 seconds
#define MQTT_INTERVAL_MS  5000      // Publish to MQTT every 5 seconds
#define MQTT_RECONNECT_MS 5000      // Retry MQTT every 5 seconds

// ==================== WIFI CONFIG ====================
// >>> GANTI DENGAN KREDENSIAL WIFI ANDA <<<
const char* WIFI_SSID     = "YOUR_WIFI_SSID";     // ← Ganti dengan nama WiFi
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";  // ← Ganti dengan password WiFi

// ==================== MQTT CONFIG ====================
// Menggunakan broker yang SAMA dengan web dashboard (Mosquitto test broker)
const char* MQTT_BROKER   = "test.mosquitto.org";  // Public Mosquitto test broker
const int   MQTT_PORT     = 1883;                   // TCP port (bukan WebSocket)
const char* MQTT_USER     = "";                     // No auth for test broker
const char* MQTT_PASS     = "";                     // No auth for test broker
const char* MQTT_CLIENT_ID = "esp32-pcd-monitor";

// ==================== MQTT TOPICS (MUST MATCH DASHBOARD) ====================
namespace MQTT_TOPICS {
  const char* SUHU           = "pcd/monitoring/suhu";
  const char* BATERAI        = "pcd/monitoring/baterai";
  const char* CHARGING       = "pcd/monitoring/charging";
  const char* KIPAS          = "pcd/monitoring/kipas";
  const char* BEBAN          = "pcd/monitoring/beban";
  const char* STATUS         = "pcd/monitoring/status";
  const char* KONTROL_ENGINE = "pcd/kontrol/engine";
}

// ==================== ENGINE MODE ====================
// Aligned with dashboard: START → RUNNING, STOP → STOPPED, AUTO → auto mode
enum EngineMode { MODE_AUTO, MODE_ON, MODE_OFF };
EngineMode engineMode = MODE_AUTO;  // Default: auto (temperature-based)

// Engine status string for dashboard (matches "RUNNING" / "STOPPED")
const char* getEngineStatusStr() {
  switch (engineMode) {
    case MODE_ON:   return "RUNNING";
    case MODE_OFF:  return "STOPPED";
    case MODE_AUTO:
    default:        return fanRunning ? "RUNNING" : "STOPPED";
  }
}

// ==================== GLOBAL STATE ====================
bool fanRunning = false;
unsigned long lastReadTime = 0;
unsigned long lastMqttPubTime = 0;
unsigned long lastMqttReconnect = 0;
float lastTemperature = 0.0;
float lastBatteryVoltage = 0.0;
int   lastBatteryPercent = 0;
bool  lastIsCharging = false;

WiFiClient espClient;
PubSubClient mqttClient(espClient);

void setup() {
  // Serial TIDAK dipakai — GPIO1 digunakan untuk kontrol kipas (Q4 base)
  // Monitoring via MQTT saja

  // Configure fan control pin (Q4 NPN: LOW = OFF at startup)
  pinMode(FAN_RELAY_PIN, OUTPUT);
  digitalWrite(FAN_RELAY_PIN, FAN_OFF);  // Fan OFF at start (NPN: LOW = off)

  // Configure ADC attenuation for full 0-3.3V range
  analogSetAttenuation(ADC_11db);

  // Connect to WiFi
  connectWiFi();

  // Setup MQTT
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(512);
}

void loop() {
  // ---- MAINTAIN MQTT CONNECTION ----
  if (!mqttClient.connected()) {
    reconnectMQTT();
  }
  mqttClient.loop();

  unsigned long now = millis();

  // ---- READ SENSORS (every READ_INTERVAL_MS) ----
  if (now - lastReadTime >= READ_INTERVAL_MS) {
    lastReadTime = now;

    // Read temperature
    lastTemperature = readTemperature();

    // Read battery voltage & convert to percentage
    lastBatteryVoltage = readBatteryVoltage();
    lastBatteryPercent = voltageToPercent(lastBatteryVoltage);

    // Charging detection
    lastIsCharging = (lastBatteryVoltage > BATT_V_CHARGING);

    // Fan control logic
    updateFanControl();
  }

  // ---- PUBLISH TO MQTT (every MQTT_INTERVAL_MS) ----
  if (now - lastMqttPubTime >= MQTT_INTERVAL_MS) {
    lastMqttPubTime = now;
    publishMQTT();
  }
}

// ==================== SENSOR FUNCTIONS ====================

float readTemperature() {
  int raw = analogRead(TEMP_SENSOR_PIN);
  float voltage = (raw / ADC_RESOLUTION) * ADC_VREF;

  // NTC voltage divider: R9 (4.7kΩ) pull-up to +3.3V, NTC to GND
  // V_adc = VCC × R_ntc / (R9 + R_ntc)
  // => R_ntc = R9 × V_adc / (VCC - V_adc)
  if (voltage >= (VCC - 0.01)) {
    return -40.0;  // NTC shorted / very hot (resistance ≈ 0)
  }
  if (voltage <= 0.01) {
    return 999.0;  // NTC open circuit / disconnected
  }

  float rNTC = SERIES_RESISTOR * voltage / (VCC - voltage);

  // Steinhart-Hart simplified (B-parameter equation)
  // 1/T = 1/T0 + (1/B) × ln(R/R0)
  float tempK = 1.0 / ((1.0 / NTC_T0) + (1.0 / NTC_B) * log(rNTC / NTC_R0));
  float tempC = tempK - 273.15;

  return tempC;
}

float readBatteryVoltage() {
  int raw = analogRead(BATT_SENSE_PIN);
  float adcVoltage = (raw / ADC_RESOLUTION) * ADC_VREF;
  float batteryVoltage = adcVoltage * VDIV_RATIO;

  return batteryVoltage;
}

// Convert battery voltage to percentage (0-100)
// Linear mapping: BATT_V_MIN (3.0V) = 0%, BATT_V_MAX (4.2V) = 100%
int voltageToPercent(float voltage) {
  if (voltage <= BATT_V_MIN) return 0;
  if (voltage >= BATT_V_MAX) return 100;
  float pct = ((voltage - BATT_V_MIN) / (BATT_V_MAX - BATT_V_MIN)) * 100.0;
  return (int)(pct + 0.5);  // Round to nearest integer
}

// ==================== FAN CONTROL ====================

void updateFanControl() {
  switch (engineMode) {
    case MODE_AUTO:
      // Automatic mode: temperature-based with hysteresis
      if (lastBatteryVoltage < BATT_LOW_VOLTAGE) {
        fanRunning = false;
      } else if (lastTemperature >= TEMP_ON) {
        fanRunning = true;
      } else if (lastTemperature <= TEMP_OFF) {
        fanRunning = false;
      }
      break;

    case MODE_ON:
      // Manual ON: force fan on (unless battery critically low)
      if (lastBatteryVoltage < BATT_LOW_VOLTAGE) {
        fanRunning = false;
      } else {
        fanRunning = true;
      }
      break;

    case MODE_OFF:
      // Manual OFF: force fan off
      fanRunning = false;
      break;
  }

  digitalWrite(FAN_RELAY_PIN, fanRunning ? FAN_ON : FAN_OFF);
}

// ==================== WIFI FUNCTIONS ====================

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    attempts++;
  }
  // WiFi status will be reported via MQTT once connected
}

// ==================== MQTT FUNCTIONS ====================

void reconnectMQTT() {
  unsigned long now = millis();
  if (now - lastMqttReconnect < MQTT_RECONNECT_MS) return;
  lastMqttReconnect = now;

  // Reconnect WiFi first if needed
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.reconnect();
    return;
  }

  bool connected;
  if (strlen(MQTT_USER) > 0) {
    connected = mqttClient.connect(MQTT_CLIENT_ID, MQTT_USER, MQTT_PASS);
  } else {
    connected = mqttClient.connect(MQTT_CLIENT_ID);
  }

  if (connected) {
    // Subscribe to control topic
    mqttClient.subscribe(MQTT_TOPICS::KONTROL_ENGINE);

    // Publish online status (JSON format matching dashboard)
    mqttClient.publish(MQTT_TOPICS::STATUS, "{\"device\":\"online\"}", true);
  }
  // Retry handled by timer
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // Convert payload to string
  char msg[64];
  int len = min((unsigned int)63, length);
  memcpy(msg, payload, len);
  msg[len] = '\0';

  // Handle engine control commands — aligned with dashboard
  if (strcmp(topic, MQTT_TOPICS::KONTROL_ENGINE) == 0) {
    String cmd = String(msg);
    cmd.toUpperCase();

    if (cmd == "START" || cmd == "ON") {
      engineMode = MODE_ON;
    } else if (cmd == "STOP" || cmd == "OFF") {
      engineMode = MODE_OFF;
    } else if (cmd == "AUTO") {
      engineMode = MODE_AUTO;
    }
    // Commands processed silently — status published via MQTT
  }
}

void publishMQTT() {
  if (!mqttClient.connected()) return;

  char payload[256];

  // Publish temperature (float as string, e.g., "28.5")
  dtostrf(lastTemperature, 1, 1, payload);
  mqttClient.publish(MQTT_TOPICS::SUHU, payload);

  // Publish battery PERCENTAGE (0-100 integer, matching dashboard)
  snprintf(payload, sizeof(payload), "%d", lastBatteryPercent);
  mqttClient.publish(MQTT_TOPICS::BATERAI, payload);

  // Publish fan status ("ON" / "OFF" — matching dashboard)
  mqttClient.publish(MQTT_TOPICS::KIPAS, fanRunning ? "ON" : "OFF");

  // Publish charging status ("1" / "0" — matching dashboard expects)
  mqttClient.publish(MQTT_TOPICS::CHARGING, lastIsCharging ? "1" : "0");

  // Publish load (estimated from fan state)
  float bebanAmps = fanRunning ? 0.15 : 0.0;  // ~150mA when fan running (adjust as needed)
  dtostrf(bebanAmps, 1, 2, payload);
  mqttClient.publish(MQTT_TOPICS::BEBAN, payload);

  // Publish engine status as plain string ("RUNNING" / "STOPPED")
  // This is what the dashboard checks on the STATUS topic
  mqttClient.publish(MQTT_TOPICS::STATUS, getEngineStatusStr());

  // Also publish full device info as JSON on a separate retained message
  StaticJsonDocument<256> doc;
  doc["suhu"]      = round(lastTemperature * 10.0) / 10.0;
  doc["baterai"]   = lastBatteryPercent;
  doc["baterai_v"] = round(lastBatteryVoltage * 100.0) / 100.0;
  doc["kipas"]     = fanRunning ? "ON" : "OFF";
  doc["charging"]  = lastIsCharging ? 1 : 0;
  doc["beban"]     = round(bebanAmps * 100.0) / 100.0;
  doc["mode"]      = engineMode == MODE_AUTO ? "AUTO" : (engineMode == MODE_ON ? "ON" : "OFF");
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["uptime"]    = millis() / 1000;

  char jsonPayload[256];
  serializeJson(doc, jsonPayload, sizeof(jsonPayload));
  // JSON info available on status/json subtopic for advanced use
  mqttClient.publish("pcd/monitoring/status/json", jsonPayload);
}
