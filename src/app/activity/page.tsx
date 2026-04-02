"use client";

import { useState, useEffect, useRef } from "react";
import { PersonStanding, Zap } from "lucide-react";
import { calculateMagnitude, detectActivity, getActivityColor, getActivityEmoji } from "@/lib/sensor";
import Stickman from "@/components/Stickman";

export default function ActivityPage() {
  const { reading, isActive, deviceId } : any = require("@/lib/SensorContext").useSensorContext();
  
  const [magnitude, setMagnitude] = useState(9.81);
  const [activity, setActivity] = useState<any>("idle");
  const [activityLabel, setActivityLabel] = useState("Diam");
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const magHistoryRef = useRef<number[]>([]);

  useEffect(() => {
    if (isActive) {
      const rawMag = calculateMagnitude(reading.x, reading.y, reading.z);
      
      // Moving Average (Smooth magnitude)
      magHistoryRef.current.push(rawMag);
      if (magHistoryRef.current.length > 5) magHistoryRef.current.shift();
      const smoothedMag = magHistoryRef.current.reduce((a, b) => a + b, 0) / magHistoryRef.current.length;
      
      setMagnitude(smoothedMag);
      const result = detectActivity(smoothedMag);
      setActivity(result.status);
      setActivityLabel(result.label);
      setLastUpdate(new Date().toLocaleTimeString("id-ID"));
    }
  }, [reading, isActive]);

  const activityColor = getActivityColor(activity);
  const activityEmoji = getActivityEmoji(activity);
  const gaugePercent = Math.min(100, Math.max(0, ((magnitude - 5) / 30) * 100));

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <PersonStanding className="text-emerald-400" size={24} />
            Activity <span className="gradient-text">Detection</span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Real-time Smooth Global Context</p>
        </div>
        {!isActive && (
          <div className="glass-card px-4 py-2 border-rose-500/30 bg-rose-500/10">
            <span className="text-xs font-semibold text-rose-400">Silakan Nyalakan Sensor di Sidebar!</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-8 flex flex-col items-center justify-center min-h-[450px]">
          <div className="activity-badge mb-8" style={{ background: `${activityColor}15`, border: `1px solid ${activityColor}40`, color: activityColor }}>
            <span className="text-xl">{activityEmoji}</span>
            <span>{activityLabel}</span>
          </div>

          <div className="mb-8 relative">
            <Stickman activity={isActive ? activity : "idle"} color={isActive ? activityColor : "#475569"} />
          </div>

          <div className="text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Magnitude</p>
            <p className="text-4xl font-bold font-mono tabular-nums" style={{ color: isActive ? activityColor : "#475569" }}>
              {isActive ? magnitude.toFixed(2) : "0.00"}
            </p>
            <p className="text-xs text-slate-500 mt-1">m/s²</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-4 pb-2 border-b border-white/[0.06]">
              Real-time Smoothing
            </h3>
            <div className="space-y-4">
              {[
                { label: "X-Axis", value: isActive ? reading.x : 0, color: "#06b6d4" },
                { label: "Y-Axis", value: isActive ? reading.y : 0, color: "#8b5cf6" },
                { label: "Z-Axis", value: isActive ? reading.z : 0, color: "#f59e0b" },
              ].map((axis) => (
                <div key={axis.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">{axis.label}</span>
                    <span className="font-mono font-bold" style={{ color: isActive ? axis.color : "#475569" }}>
                      {axis.value.toFixed(4)} m/s²
                    </span>
                  </div>
                  <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, Math.abs(axis.value) * 5)}%`, background: isActive ? axis.color : "#334155" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-4 pb-2 border-b border-white/[0.06]">
              Magnitude Gauge
            </h3>
            <div className="relative w-full h-6 bg-black/30 rounded-full overflow-hidden">
              <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-300" style={{ width: `${isActive ? gaugePercent : 0}%`, background: `linear-gradient(90deg, #10b981, #06b6d4, #f59e0b, #ef4444)` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
