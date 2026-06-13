// src/lib/mqttClient.ts
import mqtt from "mqtt";
import { useState, useEffect } from "react";

// Konfigurasi MQTT
const MQTT_BROKER = "wss://mqtt.flespi.io:443";
const MQTT_OPTIONS: mqtt.IClientOptions = {
  clientId: `agv_dashboard_${Math.random().toString(16).slice(2, 8)}`,
  username: "WwzfsYSW5Z3fJk235kiZqtaY3cbYaGJQZXfUDkwcDdh2MmgOo9wysfQg307eGBoy", // Flespi Token
  clean: true,
  connectTimeout: 4000,
  reconnectPeriod: 1000,
  keepalive: 15,
};

// Topic MQTT — konsisten dengan pcd/monitoring/*
export const MQTT_TOPICS = {
  SUHU: "pcd/monitoring/suhu",
  BATERAI: "pcd/monitoring/baterai",
  CHARGING: "pcd/monitoring/charging",
  KIPAS: "pcd/monitoring/kipas",
  BEBAN: "pcd/monitoring/beban",
  STATUS: "pcd/monitoring/status",
  KONTROL_ENGINE: "pcd/kontrol/engine",
} as const;

// Buat koneksi MQTT
export const mqttClient = mqtt.connect(MQTT_BROKER, MQTT_OPTIONS);

// Connection status tracking
let _isConnected = false;
const _listeners = new Set<(connected: boolean) => void>();

function notifyListeners() {
  _listeners.forEach((fn) => fn(_isConnected));
}

// Event: Connected
mqttClient.on("connect", () => {
  console.log("✅ MQTT Connected (HiveMQ WS)");
  console.log(`📡 Client ID: ${MQTT_OPTIONS.clientId}`);
  _isConnected = true;
  notifyListeners();

  // Subscribe ke semua topic monitoring
  const topics = [
    MQTT_TOPICS.SUHU,
    MQTT_TOPICS.BATERAI,
    MQTT_TOPICS.CHARGING,
    MQTT_TOPICS.KIPAS,
    MQTT_TOPICS.BEBAN,
    MQTT_TOPICS.STATUS,
  ];

  topics.forEach((topic) => {
    mqttClient.subscribe(topic, { qos: 1 }, (err) => {
      if (err) {
        console.error(`❌ Failed to subscribe to ${topic}:`, err);
      } else {
        console.log(`✅ Subscribed to ${topic}`);
      }
    });
  });
});

// Event: Error
mqttClient.on("error", (err) => {
  console.error("❌ MQTT Connection Error:", err);
  _isConnected = false;
  notifyListeners();
});

// Event: Offline
mqttClient.on("offline", () => {
  console.warn("⚠️ MQTT Client is offline");
  _isConnected = false;
  notifyListeners();
});

// Event: Reconnect
mqttClient.on("reconnect", () => {
  console.log("🔄 MQTT Reconnecting...");
});

// Event: Close
mqttClient.on("close", () => {
  console.log("🔌 MQTT Connection closed");
  _isConnected = false;
  notifyListeners();
});

// Event: Message (untuk debugging)
mqttClient.on("message", (topic, message) => {
  console.log(`📩 [${topic}] ${message.toString()}`);
});

// React Hook: useMqttStatus — reactive connection status
export function useMqttStatus(): boolean {
  const [connected, setConnected] = useState(_isConnected);

  useEffect(() => {
    const handler = (c: boolean) => setConnected(c);
    _listeners.add(handler);
    // Sync current state
    setConnected(_isConnected);
    return () => {
      _listeners.delete(handler);
    };
  }, []);

  return connected;
}

// Cleanup function (optional, untuk unmount)
export const disconnectMQTT = () => {
  if (mqttClient.connected) {
    mqttClient.end(false, {}, () => {
      console.log("👋 MQTT Disconnected");
    });
  }
};