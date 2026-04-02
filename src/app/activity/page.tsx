"use client";

import { useState, useEffect, useRef } from "react";
import { PersonStanding, Activity, Zap, TrendingUp } from "lucide-react";
import { calculateMagnitude, detectActivity, getActivityColor, getActivityEmoji, type ActivityStatus } from "@/lib/sensor";
import Stickman from "@/components/Stickman";
import { useSensorContext } from "@/lib/SensorContext";

export default function ActivityPage() {
  const { reading, isActive } = useSensorContext();
  
  const [magnitude, setMagnitude] = useState(9.81);
  const [activity, setActivity] = useState<ActivityStatus>("idle");
  const [activityLabel, setActivityLabel] = useState("Diam");
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  // Smoothing buffer — prevents jittery activity switching
  const magHistoryRef = useRef<number[]>([]);

  useEffect(() => {
    if (isActive) {
      const rawMag = calculateMagnitude(reading.x, reading.y, reading.z);
      
      // Moving Average (5 samples) for smooth transitions
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
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <PersonStanding className="text-emerald-400" size={22} />
            Activity <span className="gradient-text">Detection</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Real-time via Global Sensor Context</p>
        </div>
        {!isActive && (
          <div className="glass-card px-3 py-1.5 border-rose-500/30 bg-rose-500/10 shrink-0">
            <span className="text-[10px] md:text-xs font-semibold text-rose-400">Nyalakan Sensor di Sidebar</span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Left: Stickman + Activity */}
        <div className="glass-card p-6 md:p-8 flex flex-col items-center justify-center min-h-[400px] md:min-h-[450px] relative overflow-hidden">
          {/* Background glow */}
          <div 
            className="absolute inset-0 opacity-10 blur-3xl transition-colors duration-1000"
            style={{ background: `radial-gradient(circle at center, ${activityColor}, transparent 70%)` }}
          />
          
          {/* Activity Badge */}
          <div
            className="relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold mb-6 transition-all duration-500"
            style={{
              background: `${activityColor}15`,
              border: `1px solid ${activityColor}40`,
              color: activityColor,
              boxShadow: isActive ? `0 0 20px ${activityColor}20` : "none",
            }}
          >
            <span className="text-lg">{activityEmoji}</span>
            <span>{activityLabel}</span>
          </div>

          {/* Stickman */}
          <div className="relative z-10 mb-6">
            <Stickman activity={isActive ? activity : "idle"} color={isActive ? activityColor : "#475569"} />
          </div>

          {/* Magnitude Display */}
          <div className="relative z-10 text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1">Magnitude</p>
            <p 
              className="text-4xl md:text-5xl font-bold font-mono tabular-nums transition-colors duration-500" 
              style={{ color: isActive ? activityColor : "#475569" }}
            >
              {isActive ? magnitude.toFixed(2) : "0.00"}
            </p>
            <p className="text-xs text-slate-500 mt-1">m/s²</p>
          </div>

          {/* Last Update */}
          {lastUpdate && isActive && (
            <p className="relative z-10 text-[10px] text-slate-600 mt-4">Update: {lastUpdate}</p>
          )}
        </div>

        {/* Right: Details */}
        <div className="space-y-4">
          
          {/* XYZ Real-time Values */}
          <div className="glass-card p-4 md:p-5">
            <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-white/[0.06] flex items-center gap-1.5">
              <Activity size={12} className="text-cyan-400" />
              Real-time Vectors
            </h3>
            <div className="space-y-3">
              {[
                { label: "X", value: isActive ? reading.x : 0, color: "#06b6d4" },
                { label: "Y", value: isActive ? reading.y : 0, color: "#8b5cf6" },
                { label: "Z", value: isActive ? reading.z : 0, color: "#f59e0b" },
              ].map((axis) => (
                <div key={axis.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400 font-semibold">{axis.label}-Axis</span>
                    <span className="font-mono font-bold tabular-nums" style={{ color: isActive ? axis.color : "#475569" }}>
                      {axis.value.toFixed(4)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-black/30 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.abs(axis.value) * 5)}%`,
                        background: isActive ? axis.color : "#334155",
                        boxShadow: isActive ? `0 0 6px ${axis.color}50` : "none",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Magnitude Gauge */}
          <div className="glass-card p-4 md:p-5">
            <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-white/[0.06] flex items-center gap-1.5">
              <TrendingUp size={12} className="text-emerald-400" />
              Magnitude Gauge
            </h3>
            <div className="relative w-full h-5 bg-black/30 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                style={{
                  width: `${isActive ? gaugePercent : 0}%`,
                  background: `linear-gradient(90deg, #10b981, #06b6d4, #f59e0b, #ef4444)`,
                  boxShadow: isActive ? `0 0 12px ${activityColor}30` : "none",
                }}
              />
              {/* Threshold markers */}
              <div className="absolute inset-0 flex items-center pointer-events-none">
                <div className="absolute left-[15%] w-px h-full bg-white/10" />
                <div className="absolute left-[18%] w-px h-full bg-white/10" />
                <div className="absolute left-[33%] w-px h-full bg-white/10" />
                <div className="absolute left-[67%] w-px h-full bg-white/10" />
              </div>
            </div>
            <div className="flex justify-between text-[9px] text-slate-600 mt-1.5 px-0.5">
              <span>Diam</span>
              <span>Berjalan</span>
              <span>Berlari</span>
              <span>Melompat</span>
            </div>
          </div>

          {/* Threshold Reference */}
          <div className="glass-card p-4 md:p-5">
            <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-white/[0.06] flex items-center gap-1.5">
              <Zap size={12} className="text-amber-400" />
              Threshold Reference
            </h3>
            <div className="space-y-2">
              {[
                { label: "Diam (Idle)", range: "9.5 – 10.5", color: "#10b981", emoji: "🧍", key: "idle" },
                { label: "Berjalan (Walking)", range: "11 – 15", color: "#06b6d4", emoji: "🚶", key: "walking" },
                { label: "Berlari (Running)", range: "16 – 25", color: "#f59e0b", emoji: "🏃", key: "running" },
                { label: "Melompat (Jumping)", range: "> 25", color: "#ef4444", emoji: "🤸", key: "jumping" },
              ].map((t) => (
                <div 
                  key={t.key} 
                  className={`flex items-center justify-between text-xs p-2 rounded-lg transition-all duration-300 ${
                    isActive && activity === t.key ? "bg-white/[0.04] scale-[1.02]" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{t.emoji}</span>
                    <span className="text-slate-300">{t.label}</span>
                  </div>
                  <span
                    className="font-mono tabular-nums transition-colors duration-300"
                    style={{ color: isActive && activity === t.key ? t.color : "#64748b" }}
                  >
                    {t.range}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
