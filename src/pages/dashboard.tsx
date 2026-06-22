import { useState, useEffect, useRef } from "react";
import { Shell } from "@/components/layout/shell";
import { GlassCard } from "@/components/ui/glass-card";
import { NeonButton } from "@/components/ui/neon-button";
import { StatGauge } from "@/components/ui/stat-gauge";
import { Power, Activity, Cpu, Zap, Thermometer, Fan, Wifi, WifiOff, Terminal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { mqttClient, MQTT_TOPICS, useMqttStatus } from "@/lib/mqttClient";

export default function Dashboard() {

  const [agvStatus, setAgvStatus] = useState<"STOPPED" | "RUNNING">("STOPPED");
  const [battery, setBattery] = useState(0);
  const [load, setLoad] = useState(0);

  // ESP Monitoring States
  const [temperature, setTemperature] = useState(0);
  const [fanStatus, setFanStatus] = useState<"ON" | "OFF">("OFF");
  const [isCharging, setIsCharging] = useState(false);

  // Terminal Logs State
  const [logs, setLogs] = useState<{ time: string; msg: string }[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // MQTT Connection Status (reactive)
  const mqttConnected = useMqttStatus();

  // MQTT Message Handler — topic pcd/monitoring/*
  useEffect(() => {
    const handler = (topic: string, msg: Buffer) => {
      const v = msg.toString();

      switch (topic) {
        case MQTT_TOPICS.BEBAN:
          setLoad(+v);
          break;
        case MQTT_TOPICS.BATERAI:
          // ESP32 now publishes percentage (0-100), matching dashboard directly
          setBattery(+v);
          break;
        case MQTT_TOPICS.STATUS:
          // ESP32 publishes "RUNNING" / "STOPPED" as plain string
          // Also handles JSON fallback: {"device":"online"}
          try {
            const json = JSON.parse(v);
            // JSON status — ignore or handle device online
            if (json.device === "online") {
              // Device came online, don't change engine status
            }
          } catch {
            // Plain string status: "RUNNING" or "STOPPED"
            setAgvStatus(v === "RUNNING" ? "RUNNING" : "STOPPED");
          }
          break;
        case MQTT_TOPICS.SUHU:
          setTemperature(+v);
          break;
        case MQTT_TOPICS.KIPAS:
          setFanStatus(v === "1" || v === "ON" ? "ON" : "OFF");
          break;
        case MQTT_TOPICS.CHARGING:
          // ESP32 now publishes "1" or "0"
          setIsCharging(v === "1" || v === "TRUE" || v === "true" || v === "YES");
          break;
        case MQTT_TOPICS.LOGS:
          setLogs((prev) => {
            const now = new Date();
            const time = now.toLocaleTimeString("id-ID", { hour12: false });
            const newLogs = [...prev, { time, msg: v }];
            // Keep only the last 50 logs
            return newLogs.length > 50 ? newLogs.slice(newLogs.length - 50) : newLogs;
          });
          break;
      }
    };
    mqttClient.on("message", handler);
    return () => {
      mqttClient.off("message", handler);
    };
  }, []);

  const startEngine = () => {
    mqttClient.publish(MQTT_TOPICS.KONTROL_ENGINE, "START", { retain: false, qos: 0 });
  };

  const stopEngine = () => {
    mqttClient.publish(MQTT_TOPICS.KONTROL_ENGINE, "STOP", { retain: false, qos: 0 });
  };

  const toggleAgv = () => {
    setAgvStatus(prev => {
      if (prev === "STOPPED") {
        startEngine();
        return "RUNNING";
      } else {
        stopEngine();
        return "STOPPED";
      }
    });
  };

  return (
    <Shell className="p-4 md:p-8 space-y-6">

      {/* HEADER */}
      <GlassCard className="p-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4 bg-black/80 border-neon-blue/20">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-12 h-12 rounded-none border border-neon-blue/50 flex items-center justify-center bg-neon-blue/5">
              <Activity className="text-neon-blue w-6 h-6 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-[0.2em] text-white uppercase italic">Monitoring</h1>
              <div className={cn("h-2 w-2 rounded-full", mqttConnected ? "bg-neon-green animate-ping" : "bg-neon-red")} />
            </div>
            <p className="text-[10px] text-neon-blue font-mono uppercase opacity-70">
              Live Data Transmission • Protocol: MQTT_v5
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="hidden lg:flex gap-6 border-l border-white/10 pl-8">
            {/* MQTT Connection Status */}
            <div className="text-right">
              <p className="text-[10px] text-white/40 font-mono uppercase">MQTT</p>
              <div className="flex items-center gap-1.5 mt-1 justify-end">
                {mqttConnected ? (
                  <>
                    <Wifi className="w-3 h-3 text-neon-green" />
                    <span className="text-[10px] font-mono text-neon-green">ONLINE</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-neon-red" />
                    <span className="text-[10px] font-mono text-neon-red">OFFLINE</span>
                  </>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-white/40 font-mono uppercase">Signal</p>
              <div className="flex gap-1 mt-1">
                {[1,2,3,4].map(i => (
                  <div key={i} className={cn("w-1 h-3", mqttConnected ? "bg-neon-blue" : "bg-white/20", !mqttConnected && "opacity-30", mqttConnected && i > 3 && "opacity-30")} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* GRID (Neat 2x2 layout for 4 items) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

        {/* Temperature */}
        <GlassCard className="p-8 flex flex-col items-center justify-center min-h-[320px] bg-black/60 relative">
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-neon-orange/50" />
            <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Sensor: 3-Pin</span>
          </div>
          <StatGauge value={parseFloat(temperature.toFixed(1))} max={100} unit="°C" label="Temperature" color="orange" />
        </GlassCard>

        {/* Battery & Charging */}
        <GlassCard className="p-8 flex flex-col items-center justify-center min-h-[320px] bg-black/60 relative">
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <Zap className={cn("w-4 h-4", isCharging ? "text-neon-yellow animate-pulse" : "text-neon-green/50")} />
            <span className={cn("text-[10px] font-mono uppercase tracking-widest", isCharging ? "text-neon-yellow font-bold" : "text-white/30")}>
              {isCharging ? "CHARGING..." : "Cell: Li-on"}
            </span>
          </div>
          <div className="relative w-24 h-44 border-2 border-white/20 rounded-md p-1.5 mb-6">
            <div className="w-full h-full bg-white/5 rounded-sm relative overflow-hidden flex flex-col justify-end">
              <motion.div
                className={cn("w-full transition-all duration-700", battery < 20 ? "bg-neon-red" : isCharging ? "bg-neon-yellow" : "bg-neon-green")}
                style={{ height: `${Math.min(100, Math.max(0, battery))}%` }}
                animate={{ height: `${Math.min(100, Math.max(0, battery))}%` }}
              />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={cn("text-3xl font-black font-mono", isCharging && "text-black mix-blend-difference")}>
                {Math.round(battery)}%
              </span>
            </div>
          </div>
        </GlassCard>

        {/* Fan Status */}
        <GlassCard className="p-8 flex flex-col items-center justify-center min-h-[320px] bg-black/60 relative">
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <Fan className={cn("w-4 h-4", fanStatus === "ON" ? "text-neon-blue animate-spin" : "text-white/30")} />
            <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Cooling: J_Fan</span>
          </div>
          <div className="flex flex-col items-center justify-center gap-6">
            <motion.div 
              animate={{ rotate: fanStatus === "ON" ? 360 : 0 }} 
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className={cn("p-6 rounded-full border border-white/10", fanStatus === "ON" ? "bg-neon-blue/10 border-neon-blue/30" : "bg-white/5")}
            >
              <Fan className={cn("w-20 h-20", fanStatus === "ON" ? "text-neon-blue" : "text-white/20")} />
            </motion.div>
            <span className={cn(
              "text-2xl font-black font-mono tracking-widest",
              fanStatus === "ON" ? "text-neon-blue drop-shadow-[0_0_8px_rgba(0,243,255,0.8)]" : "text-white/30"
            )}>
              {fanStatus}
            </span>
          </div>
        </GlassCard>

        {/* Engine Control */}
        <GlassCard className="p-8 flex flex-col justify-between min-h-[320px] bg-white/5 border-neon-blue/10">
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <span className="text-[10px] font-mono text-white/40 uppercase">Engine Status</span>
              <span className={cn(
                "text-[10px] font-mono px-2 py-0.5 rounded",
                agvStatus === "RUNNING" ? "bg-neon-green/20 text-neon-green" : "bg-neon-red/20 text-neon-red"
              )}>
                {agvStatus}
              </span>
            </div>
            <div className="text-[10px] font-mono text-white/40 uppercase">
              Operator: <span className="text-neon-blue">ADMIN</span>
            </div>
          </div>

          <NeonButton
            onClick={toggleAgv}
            variant={agvStatus === "RUNNING" ? "red" : "green"}
            className="w-full h-24 flex items-center justify-center gap-4 text-2xl"
          >
            <Power className={cn("w-8 h-8", agvStatus === "RUNNING" && "animate-spin-slow")} />
            {agvStatus === "RUNNING" ? "STOP" : "START"}
          </NeonButton>
        </GlassCard>

      </div>

      {/* VIRTUAL SERIAL MONITOR */}
      <GlassCard className="p-4 bg-black/90 border-white/10 flex flex-col h-64">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-neon-blue" />
            <span className="text-xs font-mono text-neon-blue uppercase tracking-widest">Virtual Serial Monitor</span>
          </div>
          <button 
            onClick={() => setLogs([])}
            className="text-[10px] font-mono text-white/30 hover:text-white/80 transition-colors uppercase"
          >
            Clear
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 pr-2">
          {logs.length === 0 ? (
            <div className="text-[10px] font-mono text-white/20 italic">Awaiting incoming logs...</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="font-mono text-[10px] sm:text-xs">
                <span className="text-white/40">[{log.time}]</span>{" "}
                <span className="text-neon-green">{log.msg}</span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </GlassCard>

      {/* SYSTEM STATUS */}
      <GlassCard className="p-4 bg-black/90 border-white/5">
        <div className="flex gap-4 font-mono text-[10px]">
          <span className="text-neon-green">[SYSTEM]</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={`${agvStatus}-${mqttConnected}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-white/60"
            >
              {!mqttConnected
                ? "> ⚠ MQTT Disconnected. Attempting reconnection to broker.hivemq.com..."
                : agvStatus === "RUNNING"
                ? `> Engine initiated by ADMIN. Commencing line follow protocol...`
                : "> Engine standby. Awaiting operator command."}
            </motion.span>
          </AnimatePresence>
        </div>
      </GlassCard>

    </Shell>
  );
}