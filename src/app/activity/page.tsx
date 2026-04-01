"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PersonStanding, Wifi, WifiOff, RotateCcw, Zap, Radio } from "lucide-react";
import { getAccelLatest } from "@/lib/api";
import { calculateMagnitude, detectActivity, getActivityColor, getActivityEmoji, type ActivityStatus } from "@/lib/sensor";
import { subscribeAccelLatest } from "@/lib/firebase";
import Stickman from "@/components/Stickman";

export default function ActivityPage() {
  const [deviceId, setDeviceId] = useState("dev-001");
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [z, setZ] = useState(0);
  const [magnitude, setMagnitude] = useState(9.81);
  const [activity, setActivity] = useState<ActivityStatus>("idle");
  const [activityLabel, setActivityLabel] = useState("Diam");
  const [isConnected, setIsConnected] = useState(false);
  const [useFirebase, setUseFirebase] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDeviceId(localStorage.getItem("accel_device_id") || "dev-001");
      setUseFirebase(localStorage.getItem("accel_firebase_enabled") === "true");
    }
  }, []);

  const processSensorData = useCallback((dataX: number, dataY: number, dataZ: number) => {
    setX(dataX);
    setY(dataY);
    setZ(dataZ);
    const mag = calculateMagnitude(dataX, dataY, dataZ);
    setMagnitude(mag);
    const result = detectActivity(mag);
    setActivity(result.status);
    setActivityLabel(result.label);
    setLastUpdate(new Date().toLocaleTimeString("id-ID"));
  }, []);

  // Polling GAS mode (§8 Versi A)
  const fetchFromGAS = useCallback(async () => {
    try {
      const res = await getAccelLatest(deviceId);
      if (res.ok && res.data) {
        processSensorData(res.data.x, res.data.y, res.data.z);
        setIsConnected(true);
      }
    } catch {
      setIsConnected(false);
    }
  }, [deviceId, processSensorData]);

  // Start/stop data fetching based on mode
  useEffect(() => {
    // Clean up previous
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }

    if (!useFirebase) {
      // Versi A: Polling GAS setiap 3 detik
      fetchFromGAS();
      pollingRef.current = setInterval(fetchFromGAS, 3000);
    } else {
      // Versi B: Firebase Real-time
      unsubRef.current = subscribeAccelLatest(deviceId, (data) => {
        if (data) {
          processSensorData(data.x, data.y, data.z);
          setIsConnected(true);
        }
      });
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (unsubRef.current) unsubRef.current();
    };
  }, [useFirebase, deviceId, fetchFromGAS, processSensorData]);

  const activityColor = getActivityColor(activity);
  const activityEmoji = getActivityEmoji(activity);

  // Gauge percentage (0-100) mapped from magnitude
  const gaugePercent = Math.min(100, Math.max(0, ((magnitude - 5) / 30) * 100));

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <PersonStanding className="text-emerald-400" size={24} />
            Activity <span className="gradient-text">Detection</span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Deteksi aktivitas berdasarkan magnitude akselerometer (§6)</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Firebase toggle */}
          <div className="glass-card px-3 py-1.5 flex items-center gap-2">
            <Radio size={12} className={useFirebase ? "text-amber-400" : "text-slate-600"} />
            <span className="text-[10px] text-slate-400">Firebase</span>
            <button
              onClick={() => {
                const next = !useFirebase;
                setUseFirebase(next);
                localStorage.setItem("accel_firebase_enabled", String(next));
              }}
              className={`w-8 h-4 rounded-full relative transition-colors ${useFirebase ? "bg-amber-500" : "bg-white/10"}`}
            >
              <div className={`absolute top-[2px] w-3 h-3 rounded-full bg-white shadow transition-transform ${useFirebase ? "translate-x-[18px]" : "translate-x-[2px]"}`} />
            </button>
          </div>
          <div className="glass-card px-3 py-1.5 flex items-center gap-2 text-xs">
            {isConnected ? <Wifi size={12} className="text-emerald-400" /> : <WifiOff size={12} className="text-slate-600" />}
            <span className={isConnected ? "text-emerald-400" : "text-slate-600"}>
              {useFirebase ? "Firebase" : "Polling GAS"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Stickman + Activity */}
        <div className="glass-card p-8 flex flex-col items-center justify-center min-h-[450px]">
          {/* Activity Badge */}
          <div
            className="activity-badge mb-8"
            style={{
              background: `${activityColor}15`,
              border: `1px solid ${activityColor}40`,
              color: activityColor,
            }}
          >
            <span className="text-xl">{activityEmoji}</span>
            <span>{activityLabel}</span>
          </div>

          {/* Stickman */}
          <div className="mb-8">
            <Stickman activity={activity} color={activityColor} />
          </div>

          {/* Magnitude Display */}
          <div className="text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Magnitude</p>
            <p className="text-4xl font-bold font-mono tabular-nums" style={{ color: activityColor }}>
              {magnitude.toFixed(2)}
            </p>
            <p className="text-xs text-slate-500 mt-1">m/s²</p>
          </div>
        </div>

        {/* Right: Details */}
        <div className="space-y-4">
          {/* XYZ Values */}
          <div className="glass-card p-5">
            <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-4 pb-2 border-b border-white/[0.06]">
              Sensor Values
            </h3>
            <div className="space-y-4">
              {[
                { label: "X-Axis", value: x, color: "#06b6d4" },
                { label: "Y-Axis", value: y, color: "#8b5cf6" },
                { label: "Z-Axis", value: z, color: "#f59e0b" },
              ].map((axis) => (
                <div key={axis.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">{axis.label}</span>
                    <span className="font-mono font-bold" style={{ color: axis.color }}>
                      {axis.value.toFixed(4)} m/s²
                    </span>
                  </div>
                  <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.abs(axis.value) * 5)}%`,
                        background: axis.color,
                        boxShadow: `0 0 8px ${axis.color}60`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Magnitude Gauge */}
          <div className="glass-card p-5">
            <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-4 pb-2 border-b border-white/[0.06]">
              Magnitude Gauge
            </h3>
            <div className="relative w-full h-6 bg-black/30 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                style={{
                  width: `${gaugePercent}%`,
                  background: `linear-gradient(90deg, #10b981, #06b6d4, #f59e0b, #ef4444)`,
                  boxShadow: `0 0 12px ${activityColor}40`,
                }}
              />
              {/* Threshold markers */}
              <div className="absolute inset-0 flex items-center">
                <div className="absolute left-[15%] w-px h-full bg-white/20" title="9.5" />
                <div className="absolute left-[18%] w-px h-full bg-white/20" title="10.5" />
                <div className="absolute left-[33%] w-px h-full bg-white/20" title="15.0" />
                <div className="absolute left-[67%] w-px h-full bg-white/20" title="25.0" />
              </div>
            </div>
            <div className="flex justify-between text-[9px] text-slate-600 mt-1.5 px-1">
              <span>Diam</span>
              <span>Berjalan</span>
              <span>Berlari</span>
              <span>Melompat</span>
            </div>
          </div>

          {/* Threshold Reference */}
          <div className="glass-card p-5">
            <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-white/[0.06]">
              Threshold (§6)
            </h3>
            <div className="space-y-2">
              {[
                { label: "Diam (Idle)", range: "9.5 – 10.5", color: "#10b981", emoji: "🧍" },
                { label: "Berjalan (Walking)", range: "11.0 – 15.0", color: "#06b6d4", emoji: "🚶" },
                { label: "Berlari (Running)", range: "16.0 – 25.0", color: "#f59e0b", emoji: "🏃" },
                { label: "Melompat (Jumping)", range: "> 25.0", color: "#ef4444", emoji: "🤸" },
              ].map((t) => (
                <div key={t.label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span>{t.emoji}</span>
                    <span className="text-slate-300">{t.label}</span>
                  </div>
                  <span className="font-mono text-slate-500" style={{ color: activity === t.label.split(" ")[0].toLowerCase() ? t.color : undefined }}>
                    {t.range}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Connection Info */}
          <div className="glass-card p-5">
            <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-white/[0.06]">
              Connection
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Device ID</span>
                <span className="text-cyan-400 font-mono">{deviceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mode</span>
                <span className={useFirebase ? "text-amber-400" : "text-violet-400"}>
                  {useFirebase ? "Firebase Real-time" : "Polling GAS (3s)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Last Update</span>
                <span className="text-slate-300 font-mono">{lastUpdate || "—"}</span>
              </div>
            </div>
            <button
              onClick={fetchFromGAS}
              className="w-full mt-3 flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-slate-300 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-white/10 active:scale-95 transition-all"
            >
              <RotateCcw size={12} /> Refresh Manual
            </button>
          </div>
        </div>
      </div>

      {/* Formula */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} className="text-amber-400" />
          <h3 className="text-sm font-semibold text-white">Algoritma Magnitudo</h3>
        </div>
        <div className="bg-black/30 rounded-xl p-4 font-mono text-sm text-center">
          <span className="text-slate-400">Magnitude (A) = </span>
          <span className="text-cyan-400">√</span>
          <span className="text-slate-300">(</span>
          <span className="text-cyan-400">x²</span>
          <span className="text-slate-500"> + </span>
          <span className="text-violet-400">y²</span>
          <span className="text-slate-500"> + </span>
          <span className="text-amber-400">z²</span>
          <span className="text-slate-300">)</span>
          <span className="text-slate-600"> = </span>
          <span className="text-rose-400 font-bold">{magnitude.toFixed(4)}</span>
          <span className="text-slate-500 text-xs ml-2">m/s²</span>
        </div>
      </div>
    </div>
  );
}
