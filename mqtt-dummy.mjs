// Script untuk publish data dummy ke HiveMQ Broker
// Jalankan: node mqtt-dummy.mjs

import mqtt from "mqtt";

const BROKER = "wss://broker.hivemq.com:8884/mqtt";
const client = mqtt.connect(BROKER, {
  clientId: `dummy_publisher_${Math.random().toString(16).slice(2, 8)}`,
  clean: true,
});

// Data dummy yang akan dikirim
let suhu = 28;
let baterai = 80;
let beban = 0;
let kipas = "OFF";
let charging = "0";
let status = "STOPPED";

client.on("connect", () => {
  console.log("✅ Connected to HiveMQ Broker!\n");
  console.log("📡 Mengirim data dummy setiap 2 detik...");
  console.log("   Tekan Ctrl+C untuk berhenti.\n");
  console.log("─".repeat(50));

  // Listen to engine controls from dashboard
  client.subscribe("pcd/kontrol/engine");
  client.on("message", (topic, message) => {
    if (topic === "pcd/kontrol/engine") {
      const command = message.toString();
      if (command === "START") status = "RUNNING";
      if (command === "STOP") status = "STOPPED";
      console.log(`\n⚙️ Command received: ${command} -> Engine is now ${status}\n`);
    }
  });

  setInterval(() => {
    // Simulasi perubahan data sensor
    suhu = +(25 + Math.random() * 15).toFixed(1);           // 25-40 °C
    baterai = Math.max(0, Math.min(100, baterai + (Math.random() > 0.5 ? 1 : -1)));  // naik-turun
    beban = +(Math.random() * 4.5).toFixed(2);               // 0-4.5 KG
    kipas = suhu > 35 ? "ON" : "OFF";                        // kipas nyala jika suhu > 35
    charging = baterai < 30 ? "1" : "0";                     // charging jika baterai < 30%

    // Publish ke semua topic
    client.publish("pcd/monitoring/suhu", String(suhu));
    client.publish("pcd/monitoring/baterai", String(baterai));
    client.publish("pcd/monitoring/beban", String(beban));
    client.publish("pcd/monitoring/kipas", kipas);
    client.publish("pcd/monitoring/charging", charging);
    client.publish("pcd/monitoring/status", status);

    const time = new Date().toLocaleTimeString("id-ID", { hour12: false });
    console.log(`[${time}] Suhu: ${suhu}°C | Baterai: ${baterai}% | Beban: ${beban}KG | Kipas: ${kipas} | Charging: ${charging} | Engine: ${status}`);
  }, 2000);
});

client.on("error", (err) => {
  console.error("❌ Error:", err.message);
});
