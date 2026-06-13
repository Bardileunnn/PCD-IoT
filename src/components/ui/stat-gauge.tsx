interface StatGaugeProps {
  value: number;
  max: number;
  unit: string;
  label: string;
  color?: "blue" | "green" | "red" | "orange" | "yellow";
}

export function StatGauge({ value, max, unit, label, color = "blue" }: StatGaugeProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const colorHex = color === "blue" ? "#00f3ff" : color === "green" ? "#00ff9d" : color === "red" ? "#ff0055" : color === "orange" ? "#ff9900" : "#ffff00";

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative w-32 h-32 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="64" cy="64" r="60" fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
          <circle
            cx="64" cy="64" r="60" fill="transparent" stroke={colorHex} strokeWidth="4"
            strokeDasharray={377} strokeDashoffset={377 - (377 * percentage) / 100}
            strokeLinecap="round" className="transition-all duration-1000 ease-out"
            style={{ filter: `drop-shadow(0 0 4px ${colorHex})` }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl font-mono font-bold text-white tracking-tighter">{value}</span>
          <span className="text-xs text-white/50 font-mono uppercase">{unit}</span>
        </div>
      </div>
      <span className="text-sm font-bold uppercase tracking-widest text-white/70">{label}</span>
    </div>
  );
}