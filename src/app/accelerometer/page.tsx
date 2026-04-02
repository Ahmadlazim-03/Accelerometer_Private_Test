"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Activity, Play, Square, Send, Smartphone,
  Wifi, WifiOff, RotateCcw, TrendingUp,
  Filter, Crosshair, Flame, Maximize, Minimize2
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip,
} from "recharts";
import { sendAccelBatch, getAccelLatest, type AccelSample } from "@/lib/api";
import { lowPassFilter, resetFilter, calculateMagnitude, setCalibration, clearCalibration, applyCalibration, getCalibrationOffset } from "@/lib/sensor";
import { writeAccelToFirebase } from "@/lib/firebase";

const MAX_PTS = 60;
interface Pt { time: string; x: number; y: number; z: number; mag: number }

export default function AccelerometerPage() {
  const getInitialDeviceId = () => {
    if (typeof window !== "undefined") return localStorage.getItem("accel_device_id") || "dev-001";
    return "dev-001";
  };
  const getInitialInterval = () => {
    if (typeof window !== "undefined") return Number(localStorage.getItem("accel_batch_interval")) || 3;
    return 3;
  };

  const [isActive, setIsActive] = useState(false);
  const [reading, setReading] = useState({ x: 0, y: 0, z: 0 });
  const [chartData, setChartData] = useState<Pt[]>([]);
  const [batchCount, setBatchCount] = useState(0);
  const [totalSamples, setTotalSamples] = useState(0);
  const [deviceId, setDeviceId] = useState(getInitialDeviceId);
  const [autoSend, setAutoSend] = useState(false);
  const [sendInterval, setSendInterval] = useState(getInitialInterval);
  const [statusMsg, setStatusMsg] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [serverData, setServerData] = useState<AccelSample | null>(null);
  const [bufferLen, setBufferLen] = useState(0);
  const [filterEnabled, setFilterEnabled] = useState(false);
  const [calibrated, setCalibrated] = useState(false);
  const samplesRef = useRef<AccelSample[]>([]);
  const autoRef = useRef<NodeJS.Timeout | null>(null);
  const demoRef = useRef<NodeJS.Timeout | null>(null);
  const demoV = useRef({ x: 0.1, y: 0.02, z: 9.81 });

  const processReading = useCallback((rawX: number, rawY: number, rawZ: number) => {
    let x = rawX, y = rawY, z = rawZ;

    // Apply calibration (§9.3)
    if (calibrated) {
      const cal = applyCalibration({ x, y, z });
      x = cal.x; y = cal.y; z = cal.z;
    }

    // Apply Low-Pass Filter (§9.1)
    if (filterEnabled) {
      const f = lowPassFilter({ x, y, z });
      x = +f.x.toFixed(4); y = +f.y.toFixed(4); z = +f.z.toFixed(4);
    }

    return { x, y, z };
  }, [filterEnabled, calibrated]);

  const addPt = useCallback((x: number, y: number, z: number) => {
    const mag = calculateMagnitude(x, y, z);
    const now = new Date();
    const time = `${now.getMinutes()}:${now.getSeconds().toString().padStart(2, "0")}`;
    setChartData((p) => {
      const n = [...p, { time, x: +x.toFixed(3), y: +y.toFixed(3), z: +z.toFixed(3), mag: +mag.toFixed(3) }];
      return n.length > MAX_PTS ? n.slice(n.length - MAX_PTS) : n;
    });
  }, []);

  const onMotion = useCallback((e: DeviceMotionEvent) => {
    const a = e.accelerationIncludingGravity;
    if (!a) return;
    const rawX = +(a.x ?? 0).toFixed(4), rawY = +(a.y ?? 0).toFixed(4), rawZ = +(a.z ?? 0).toFixed(4);
    const { x, y, z } = processReading(rawX, rawY, rawZ);
    setReading({ x, y, z });
    addPt(x, y, z);
    samplesRef.current.push({ t: new Date().toISOString(), x, y, z });
    setBufferLen(samplesRef.current.length);
  }, [addPt, processReading]);

  const start = useCallback(async () => {
    resetFilter();
    if ("DeviceMotionEvent" in window) {
      const DME = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
      if (typeof DME.requestPermission === "function") {
        try {
          if ((await DME.requestPermission()) === "granted") {
            window.addEventListener("devicemotion", onMotion);
            setIsActive(true);
            setStatusMsg("📡 Sensor aktif");
            return;
          }
        } catch { /* fall through to demo */ }
      } else {
        let got = false;
        const t = (ev: DeviceMotionEvent) => { if (ev.accelerationIncludingGravity?.x !== null) got = true; };
        window.addEventListener("devicemotion", t);
        await new Promise(r => setTimeout(r, 500));
        window.removeEventListener("devicemotion", t);
        if (got) {
          window.addEventListener("devicemotion", onMotion);
          setIsActive(true);
          setStatusMsg("📡 Sensor aktif");
          return;
        }
      }
    }
    // Demo Mode
    setStatusMsg("🎮 Demo Mode — simulasi data");
    setIsActive(true);
    demoRef.current = setInterval(() => {
      const v = demoV.current;
      v.x += (Math.random() - 0.5) * 0.4; v.y += (Math.random() - 0.5) * 0.4; v.z += (Math.random() - 0.5) * 0.15;
      v.x = Math.max(-5, Math.min(5, v.x)); v.y = Math.max(-5, Math.min(5, v.y)); v.z = Math.max(7, Math.min(12, v.z));
      const { x, y, z } = processReading(+v.x.toFixed(4), +v.y.toFixed(4), +v.z.toFixed(4));
      setReading({ x, y, z });
      addPt(x, y, z);
      samplesRef.current.push({ t: new Date().toISOString(), x, y, z });
      setBufferLen(samplesRef.current.length);
    }, 100);
  }, [onMotion, addPt, processReading]);

  const stop = useCallback(() => {
    window.removeEventListener("devicemotion", onMotion);
    if (demoRef.current) { clearInterval(demoRef.current); demoRef.current = null; }
    setIsActive(false); setStatusMsg("⏸ Dihentikan");
  }, [onMotion]);

  const send = useCallback(async () => {
    const s = [...samplesRef.current]; samplesRef.current = []; setBufferLen(0);
    if (!s.length) { setStatusMsg("⚠️ Tidak ada sampel"); return; }
    setStatusMsg(`📤 Mengirim ${s.length} sampel...`);
    try {
      const r = await sendAccelBatch(deviceId, s);
      if (r.ok) {
        setBatchCount(c => c + 1);
        setTotalSamples(c => c + (r.data?.accepted ?? s.length));
        setStatusMsg(`✅ ${r.data?.accepted ?? s.length} sampel diterima`);
        setIsConnected(true);
        // Also write latest to Firebase for real-time (§8)
        const last = s[s.length - 1];
        try { await writeAccelToFirebase(deviceId, last); } catch { /* Firebase write optional */ }
      } else {
        setStatusMsg(`❌ ${r.error}`);
        setIsConnected(false);
        samplesRef.current = [...s, ...samplesRef.current];
        setBufferLen(samplesRef.current.length);
      }
    } catch (e) {
      setStatusMsg(`❌ ${e}`);
      setIsConnected(false);
      samplesRef.current = [...s, ...samplesRef.current];
      setBufferLen(samplesRef.current.length);
    }
  }, [deviceId]);

  const fetchLatest = useCallback(async () => {
    try {
      const r = await getAccelLatest(deviceId);
      if (r.ok && r.data) { setServerData(r.data); setIsConnected(true); }
    } catch { /* silent */ }
  }, [deviceId]);

  const handleCalibrate = () => {
    setCalibration({ x: reading.x, y: reading.y, z: reading.z });
    setCalibrated(true);
    setStatusMsg("🎯 Kalibrasi berhasil — offset disimpan");
  };

  const handleClearCalibration = () => {
    clearCalibration();
    setCalibrated(false);
    setStatusMsg("🔄 Kalibrasi direset");
  };

  useEffect(() => {
    if (autoSend && isActive) autoRef.current = setInterval(send, sendInterval * 1000);
    return () => { if (autoRef.current) { clearInterval(autoRef.current); autoRef.current = null; } };
  }, [autoSend, isActive, send, sendInterval]);

  useEffect(() => () => {
    window.removeEventListener("devicemotion", onMotion);
    if (demoRef.current) clearInterval(demoRef.current);
  }, [onMotion]);

  const mag = calculateMagnitude(reading.x, reading.y, reading.z);
  const calOffset = getCalibrationOffset();

  const tooltipStyle = { background: "#0d1321", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", fontSize: "11px", color: "#e2e8f0" };

  const [hideUI, setHideUI] = useState(false);
  const [invertX, setInvertX] = useState(false);
  const [invertY, setInvertY] = useState(false);

  // --- 3D Rotation Math (Smooth Euler) ---
  const mX = invertX ? -reading.x : reading.x;
  const mY = invertY ? -reading.y : reading.y;
  const pitch = Math.atan2(reading.z, mY) * (180 / Math.PI);
  const rawRoll = Math.atan2(-mX, Math.sqrt(mY * mY + reading.z * reading.z)) * (180 / Math.PI);

  return (
    <div className="relative w-full h-[calc(100vh-2rem)] overflow-hidden bg-[#060a14] flex flex-col items-center justify-center perspective-[1200px]">
      
      {/* Zen Mode Toggle — always visible */}
      <button 
        onClick={() => setHideUI(!hideUI)}
        className={`absolute top-3 right-3 z-[60] flex items-center justify-center w-9 h-9 rounded-full border transition-all backdrop-blur-md active:scale-90 ${
          hideUI
            ? "bg-cyan-500/20 border-cyan-500/40 shadow-lg shadow-cyan-500/20"
            : "bg-white/5 border-white/10 hover:bg-white/10"
        }`}
        title={hideUI ? "Tampilkan UI" : "Sembunyikan UI (Zen Mode)"}
      >
        {hideUI ? <Maximize className="text-cyan-400" size={16} /> : <Minimize2 className="text-slate-400" size={16} />}
      </button>

      {/* Floating Header Controls */}
      <div className={`absolute top-3 left-3 right-14 z-50 transition-all duration-500 delay-75 ${hideUI ? "opacity-0 pointer-events-none -translate-y-4" : "opacity-100"}`}>
        <div className="glass-card px-2.5 py-2 md:px-5 md:py-3 flex flex-wrap items-center gap-1.5 md:gap-4">
          {/* Device ID */}
          <div className="flex items-center gap-1">
            <Smartphone size={12} className="text-cyan-400" />
            <span className="text-[10px] md:text-sm font-bold text-white font-mono">{deviceId}</span>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-1 ml-auto">
            {!isActive ? (
              <button onClick={start} className="flex items-center gap-1 bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 px-2 py-0.5 md:px-4 md:py-1.5 rounded-md text-[10px] md:text-sm font-semibold hover:bg-cyan-500/25 active:scale-95 transition-all">
                <Play size={10} /> Start
              </button>
            ) : (
              <button onClick={stop} className="flex items-center gap-1 bg-rose-500/15 text-rose-400 border border-rose-500/25 px-2 py-0.5 md:px-4 md:py-1.5 rounded-md text-[10px] md:text-sm font-semibold hover:bg-rose-500/25 active:scale-95 transition-all">
                <Square size={10} /> Stop
              </button>
            )}
            <button onClick={send} disabled={!isActive} className="flex items-center gap-1 bg-violet-500/15 text-violet-400 border border-violet-500/25 disabled:opacity-30 px-2 py-0.5 md:px-4 md:py-1.5 rounded-md text-[10px] md:text-sm font-semibold hover:bg-violet-500/25 active:scale-95 transition-all">
              <Send size={10} /> Send
            </button>
          </div>

          {/* Compact Stats */}
          <div className="flex items-center gap-2 text-[9px] md:text-xs font-mono w-full mt-0.5 md:mt-0 pt-1 md:pt-0 border-t md:border-t-0 border-white/[0.06]">
            <span className="text-slate-500">P</span><span className="text-cyan-400 font-bold">{pitch.toFixed(0)}°</span>
            <span className="text-slate-500 ml-1">R</span><span className="text-violet-400 font-bold">{rawRoll.toFixed(0)}°</span>
            <span className="ml-auto text-amber-400 truncate max-w-[100px] md:max-w-[200px] text-[9px]">{statusMsg || "Ready"}</span>
          </div>
        </div>
      </div>

      {/* Floating Bottom Controls */}
      <div className={`absolute bottom-3 left-3 right-3 z-50 transition-all duration-500 delay-75 ${hideUI ? "opacity-0 pointer-events-none translate-y-4" : "opacity-100"}`}>
        <div className="glass-card px-2 py-1.5 md:px-3 md:py-2.5 flex flex-wrap items-center gap-1.5 md:gap-2">
          <button onClick={() => setInvertY(!invertY)} className={`px-2 py-1 rounded-md text-[9px] md:text-xs font-semibold transition-all ${invertY ? "bg-indigo-500/30 text-white border border-indigo-500/50" : "bg-black/40 text-slate-400 border border-white/10"}`}>
            Flip Y
          </button>
          <button onClick={() => setInvertX(!invertX)} className={`px-2 py-1 rounded-md text-[9px] md:text-xs font-semibold transition-all ${invertX ? "bg-indigo-500/30 text-white border border-indigo-500/50" : "bg-black/40 text-slate-400 border border-white/10"}`}>
            Flip X
          </button>
          <button onClick={() => { setFilterEnabled(!filterEnabled); if (!filterEnabled) resetFilter(); }} className={`flex items-center gap-0.5 px-2 py-1 rounded-md text-[9px] md:text-xs font-semibold transition-all ${filterEnabled ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-black/40 text-slate-400 border border-white/10"}`}>
            <Filter size={9} /> LPF
          </button>
          {!calibrated ? (
            <button onClick={handleCalibrate} disabled={!isActive} className="flex items-center gap-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 disabled:opacity-30 px-2 py-1 rounded-md text-[9px] md:text-xs font-semibold active:scale-95 transition-all ml-auto">
              <Crosshair size={9} /> Cal
            </button>
          ) : (
            <button onClick={handleClearCalibration} className="flex items-center gap-0.5 bg-rose-500/15 text-rose-400 border border-rose-500/25 px-2 py-1 rounded-md text-[9px] md:text-xs font-semibold active:scale-95 transition-all ml-auto">
              <Crosshair size={9} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* The 3D CSS Phone Model */}
      <div className="w-full h-full flex items-center justify-center pointer-events-none">
        {/* Ambient glow behind phone */}
        <div className="absolute w-[300px] h-[500px] rounded-full bg-cyan-500/5 blur-[80px] pointer-events-none" />
        
        {/* Scale wrapper — shrinks the whole 3D model proportionally on mobile */}
        <div className="scale-[0.55] sm:scale-[0.65] md:scale-[0.85] lg:scale-100">
          <div 
            className="relative w-[280px] h-[560px] preserve-3d"
            style={{ 
              transform: `rotateX(${pitch}deg) rotateZ(${rawRoll}deg)`,
            }}
          >
            {/* ── Front Face (Screen) ── */}
            <div className="absolute inset-0 bg-[#0a0f1e] border-[3px] border-slate-600/80 rounded-[2.8rem] shadow-[inset_0_0_30px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden translate-z-[10px]">
              {/* Dynamic Island */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-10 flex items-center justify-center gap-3 shadow-lg">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-800 ring-1 ring-slate-700" />
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/30" />
              </div>
              
              {/* Screen Content */}
              <div className="flex-1 bg-gradient-to-b from-indigo-950/60 via-[#080d1a] to-cyan-950/40 px-5 pt-14 pb-6 flex flex-col items-center">
                {/* Status bar */}
                <div className="w-full flex items-center justify-between text-[8px] text-slate-500 font-mono mb-auto">
                  <span>9:41</span>
                  <div className="flex items-center gap-1">
                    <div className="flex gap-[1px]">{[4,6,8,10].map(h => <div key={h} className="w-[3px] rounded-sm bg-slate-600" style={{height: h}} />)}</div>
                    <span>5G</span>
                  </div>
                </div>

                {/* Main telemetry display */}
                <div className="flex-1 flex flex-col items-center justify-center w-full">
                  <Activity className={`${isActive ? 'text-emerald-400 pulse-ring' : 'text-slate-700'} mb-4`} size={36} />
                  <h2 className="text-base font-bold text-white/90 mb-1 tracking-wide">Live Telemetry</h2>
                  <p className="text-[9px] text-slate-500 mb-5">{isActive ? "Streaming data..." : "Sensor off"}</p>
                  
                  <div className="w-full space-y-2">
                    {[
                      { label: "X", value: reading.x, color: "cyan" },
                      { label: "Y", value: reading.y, color: "violet" },
                      { label: "Z", value: reading.z, color: "amber" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-black/50 border border-white/[0.04] rounded-xl px-3 py-2 flex justify-between items-center">
                        <span className={`text-${color}-400 font-bold text-[10px] tracking-[0.2em]`}>{label}</span>
                        <span className="text-white/80 font-mono text-xs tabular-nums">{value.toFixed(3)}</span>
                      </div>
                    ))}
                    <div className="bg-black/60 border border-rose-500/15 rounded-xl px-3 py-2.5 flex justify-between items-center mt-1">
                      <span className="text-slate-500 text-[10px] font-bold tracking-wider">MAG</span>
                      <span className="text-rose-400 font-mono font-bold text-sm tabular-nums">{mag.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Home Indicator */}
                <div className="w-28 h-1 bg-white/15 rounded-full mt-auto" />
              </div>
            </div>

            {/* ── Back Face (Casing) ── */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800 border-[3px] border-slate-500/60 rounded-[2.8rem] shadow-[inset_0_2px_15px_rgba(255,255,255,0.08)] -translate-z-[10px] rotate-y-180 backface-hidden">
              {/* Camera Module */}
              <div className="absolute top-6 left-6 w-[72px] h-[72px] bg-slate-800/90 rounded-2xl border border-slate-600/50 shadow-xl p-1.5 grid grid-cols-2 gap-1">
                {[1,2,3].map(i => (
                  <div key={i} className="rounded-full bg-black shadow-inner flex items-center justify-center aspect-square">
                    <div className={`w-2.5 h-2.5 rounded-full ${i === 3 ? 'bg-emerald-900/50' : 'bg-slate-800'} ring-1 ${i === 3 ? 'ring-emerald-700/30' : 'ring-slate-700/50'}`} />
                  </div>
                ))}
                <div className="flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-amber-100/80 shadow-[0_0_8px_rgba(254,243,199,0.6)]" />
                </div>
              </div>
              {/* Logo */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-15 flex flex-col items-center gap-1">
                 <Smartphone size={32} className="text-slate-300" />
                 <span className="font-bold text-slate-300 tracking-[0.3em] uppercase text-[8px]">AccelCloud</span>
              </div>
            </div>

            {/* ── Left Side Edge ── */}
            <div className="absolute top-0 left-0 w-[20px] h-[560px] bg-gradient-to-b from-slate-500 via-slate-600 to-slate-500 rounded-l-lg -translate-x-[10px] rotate-y-[-90deg] origin-left">
               <div className="absolute top-[140px] left-0 w-[2px] h-10 bg-slate-800 rounded-r-sm shadow-sm" />
               <div className="absolute top-[190px] left-0 w-[2px] h-10 bg-slate-800 rounded-r-sm shadow-sm" />
            </div>

            {/* ── Right Side Edge ── */}
            <div className="absolute top-0 right-0 w-[20px] h-[560px] bg-gradient-to-b from-slate-500 via-slate-600 to-slate-500 rounded-r-lg translate-x-[10px] rotate-y-[90deg] origin-right">
               <div className="absolute top-[180px] right-0 w-[2px] h-14 bg-slate-800 rounded-l-sm shadow-sm" />
            </div>

            {/* ── Top Edge ── */}
            <div className="absolute top-0 left-0 w-[280px] h-[20px] bg-slate-500 rounded-t-[2.8rem] -translate-y-[10px] rotate-x-[90deg] origin-top" />

            {/* ── Bottom Edge ── */}
            <div className="absolute bottom-0 left-0 w-[280px] h-[20px] bg-slate-600 rounded-b-[2.8rem] translate-y-[10px] rotate-x-[-90deg] origin-bottom flex items-center justify-center gap-3">
               <div className="flex gap-1">{[1,2,3].map(i => <div key={i} className="w-1 h-1 bg-black/60 rounded-full" />)}</div>
               <div className="w-6 h-[3px] bg-black/50 rounded-full" />
               <div className="flex gap-1">{[1,2,3].map(i => <div key={i} className="w-1 h-1 bg-black/60 rounded-full" />)}</div>
            </div>

          </div>
        </div>
      </div>
      
      {/* 3D CSS helper styles */}
      <style dangerouslySetInnerHTML={{__html: `
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg) translateZ(10px); }
        .rotate-y-\\[-90deg\\] { transform: rotateY(-90deg); }
        .rotate-y-\\[90deg\\] { transform: rotateY(90deg); }
        .rotate-x-\\[90deg\\] { transform: rotateX(90deg); }
        .rotate-x-\\[-90deg\\] { transform: rotateX(-90deg); }
        .translate-z-\\[10px\\] { transform: translateZ(10px); }
        .-translate-z-\\[10px\\] { transform: translateZ(-10px); }
      `}} />

    </div>
  );
}
