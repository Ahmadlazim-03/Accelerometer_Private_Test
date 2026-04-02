"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Activity, Play, Square, Send, Smartphone,
  Wifi, WifiOff, RotateCcw, TrendingUp,
  Filter, Crosshair, Flame, RefreshCcw, Maximize, ScanCenter
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

  const [invertX, setInvertX] = useState(false);
  const [invertY, setInvertY] = useState(false);
  const [hideUI, setHideUI] = useState(false);

  // --- 3D Rotation Math (Vector Cross-Product) ---
  const mX = invertX ? -reading.x : reading.x;
  const mY = invertY ? -reading.y : reading.y;
  const mZ = reading.z;

  const magnitude = Math.sqrt(mX * mX + mY * mY + mZ * mZ) || 1;
  const ny = Math.max(-1, Math.min(1, mY / magnitude)); // Normalize and clamp
  const nx = mX / magnitude;
  const nz = mZ / magnitude;

  const axisX = nz;
  const axisY = 0;
  const axisZ = -nx;
  const angleDeg = Math.acos(ny) * (180 / Math.PI);

  // Variables for the UI Text Display
  const pitch = Math.atan2(mZ, mY) * (180 / Math.PI);
  const rawRoll = Math.atan2(-mX, Math.sqrt(mY * mY + mZ * mZ)) * (180 / Math.PI);

  return (
    <div className="relative w-full h-[calc(100vh-2rem)] overflow-hidden bg-[#060a14] flex flex-col items-center justify-center perspective-[1200px]">
      
      {/* Zen Mode Toggle (Always Visible) */}
      <button 
        onClick={() => setHideUI(!hideUI)}
        className="absolute top-6 right-6 z-[60] flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all backdrop-blur-md"
        title={hideUI ? "Tampilkan UI" : "Sembunyikan UI (Zen Mode)"}
      >
        {hideUI ? <Maximize className="text-slate-400" size={18} /> : <ScanCenter className="text-slate-400" size={18} />}
      </button>

      {/* Floating Header Controls */}
      <div className={`absolute top-6 left-6 right-20 z-50 flex flex-wrap items-center justify-between gap-4 transition-all duration-500 delay-75 ${hideUI ? "opacity-0 pointer-events-none -translate-y-4" : "opacity-100"}`}>
        <div className="glass-card px-5 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Smartphone size={16} className="text-cyan-400" />
            <span className="text-sm font-bold text-white font-mono">{deviceId}</span>
          </div>
          <div className="w-px h-5 bg-white/10" />
          {!isActive ? (
            <button onClick={start} className="flex items-center gap-1.5 bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-cyan-500/25 active:scale-95 transition-all">
              <Play size={14} /> Start Sensor
            </button>
          ) : (
            <button onClick={stop} className="flex items-center gap-1.5 bg-rose-500/15 text-rose-400 border border-rose-500/25 px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-rose-500/25 active:scale-95 transition-all">
              <Square size={14} /> Stop
            </button>
          )}
          <button onClick={send} disabled={!isActive} className="flex items-center gap-1.5 bg-violet-500/15 text-violet-400 border border-violet-500/25 disabled:opacity-30 px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-violet-500/25 active:scale-95 transition-all">
            <Send size={14} /> Send Batch
          </button>
        </div>

        <div className="glass-card px-5 py-3 flex items-center gap-4 text-xs font-mono">
          <div className="flex flex-col">
            <span className="text-slate-500">PITCH</span>
            <span className="text-cyan-400 font-bold">{pitch.toFixed(1)}°</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-500">ROLL</span>
            <span className="text-violet-400 font-bold">{rawRoll.toFixed(1)}°</span>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div className="flex flex-col">
            <span className="text-slate-500">STATUS</span>
            <span className="text-amber-400">{statusMsg || "Ready"}</span>
          </div>
        </div>
      </div>

      {/* Floating Settings & Calibrate */}
      <div className={`absolute bottom-6 left-6 z-50 flex flex-wrap items-center gap-3 transition-all duration-500 ${hideUI ? "opacity-0 pointer-events-none translate-y-[20px]" : "opacity-100"}`}>
        <div className="flex gap-2">
          <button onClick={() => setInvertY(!invertY)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all shadow-lg ${invertY ? "bg-indigo-500/30 text-white border border-indigo-500/50" : "bg-black/50 text-slate-400 border border-white/10"}`}>
            Flip Y (Berdiri)
          </button>
          <button onClick={() => setInvertX(!invertX)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all shadow-lg ${invertX ? "bg-indigo-500/30 text-white border border-indigo-500/50" : "bg-black/50 text-slate-400 border border-white/10"}`}>
            Flip X (Kanan-Kiri)
          </button>
        </div>
        <button onClick={() => { setFilterEnabled(!filterEnabled); if (!filterEnabled) resetFilter(); }} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-lg ${filterEnabled ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-amber-500/20" : "bg-black/50 text-slate-400 border border-white/10 backdrop-blur-md"}`}>
          <Filter size={14} /> LPF {filterEnabled ? "ON" : "OFF"}
        </button>
        {!calibrated ? (
          <button onClick={handleCalibrate} disabled={!isActive} className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 disabled:opacity-30 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-emerald-500/30 backdrop-blur-md active:scale-95 transition-all shadow-lg shadow-emerald-500/10">
            <Crosshair size={14} /> Zero Calibrate
          </button>
        ) : (
          <button onClick={handleClearCalibration} className="flex items-center gap-1.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-rose-500/30 backdrop-blur-md active:scale-95 transition-all shadow-lg shadow-rose-500/10">
            <Crosshair size={14} /> Reset Calibrate
          </button>
        )}
      </div>

      {/* The 3D CSS Phone Model */}
      <div className="w-full h-full flex items-center justify-center pointer-events-none">
        <div 
          className="relative w-[280px] h-[580px] preserve-3d"
          style={{ 
            transform: `rotate3d(${axisX}, ${axisY}, ${axisZ}, ${angleDeg}deg)`,
          }}
        >
          {/* Front Face (Screen) */}
          <div className="absolute inset-0 bg-[#0f172a] border-4 border-[#334155] rounded-[3rem] shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden translate-z-[12px]">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-[#334155] rounded-b-2xl shadow-md z-10 flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-800" />
              <div className="w-12 h-1.5 rounded-full bg-slate-800" />
            </div>
            
            {/* Screen Content */}
            <div className="flex-1 bg-gradient-to-br from-indigo-900/40 via-[#060a14] to-cyan-900/40 p-6 flex flex-col justify-center items-center text-center mt-8">
              <Activity className={`${isActive ? 'text-emerald-400 pulse-ring' : 'text-slate-600'} mb-6`} size={48} />
              <h2 className="text-xl font-bold text-white mb-2">Live Telemetry</h2>
              
              <div className="w-full space-y-3 mt-6">
                <div className="bg-black/40 border border-white/5 rounded-xl p-3 flex justify-between items-center text-sm shadow-inner">
                  <span className="text-cyan-400 font-semibold text-xs tracking-widest">X</span>
                  <span className="text-white font-mono">{reading.x.toFixed(3)}</span>
                </div>
                <div className="bg-black/40 border border-white/5 rounded-xl p-3 flex justify-between items-center text-sm shadow-inner">
                  <span className="text-violet-400 font-semibold text-xs tracking-widest">Y</span>
                  <span className="text-white font-mono">{reading.y.toFixed(3)}</span>
                </div>
                <div className="bg-black/40 border border-white/5 rounded-xl p-3 flex justify-between items-center text-sm shadow-inner">
                  <span className="text-amber-400 font-semibold text-xs tracking-widest">Z</span>
                  <span className="text-white font-mono">{reading.z.toFixed(3)}</span>
                </div>
                <div className="bg-black/60 border border-rose-500/20 rounded-xl p-4 flex justify-between items-center mt-4">
                  <span className="text-slate-400 text-xs font-bold uppercase">MAG</span>
                  <span className="text-rose-400 font-mono font-bold text-lg">{mag.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            {/* Home Indicator */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-white/20 rounded-full" />
          </div>

          {/* Back Face (Casing & Camera) */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900 border-4 border-[#334155] rounded-[3rem] shadow-[inset_0_0_10px_rgba(255,255,255,0.1)] -translate-z-[12px] rotate-y-180 flex items-start justify-end p-6 backface-hidden">
            {/* Camera Module */}
            <div className="w-24 h-24 bg-slate-800 rounded-3xl border border-slate-600 shadow-xl flex flex-wrap p-2 gap-2 relative">
              <div className="w-8 h-8 rounded-full bg-black shadow-inner flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-cyan-900/50 blur-[1px]" />
              </div>
              <div className="w-8 h-8 rounded-full bg-black shadow-inner flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-cyan-900/50 blur-[1px]" />
              </div>
              <div className="w-8 h-8 rounded-full bg-black shadow-inner flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-emerald-900/40 blur-[1px]" />
              </div>
              {/* Flash */}
              <div className="w-4 h-4 rounded-full bg-amber-100 shadow-[0_0_10px_rgba(254,243,199,0.8)] absolute bottom-4 right-4" />
            </div>
            {/* Logo placeholder */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20 flex flex-col items-center">
               <Smartphone size={40} className="text-slate-300" />
               <span className="font-bold text-slate-300 tracking-widest mt-2 uppercase text-xs">AccelCloud</span>
            </div>
          </div>

          {/* Left Side Edge */}
          <div className="absolute top-0 left-0 w-[24px] h-[580px] bg-slate-600 border-y-4 border-slate-500 rounded-l-[1rem] -translate-x-[12px] rotate-y-[-90deg] origin-left flex flex-col items-center justify-start pt-24 gap-4">
             {/* Volume Buttons */}
             <div className="w-1.5 h-12 bg-slate-800 rounded-r-md shadow-sm" />
             <div className="w-1.5 h-12 bg-slate-800 rounded-r-md shadow-sm" />
          </div>

          {/* Right Side Edge */}
          <div className="absolute top-0 right-0 w-[24px] h-[580px] bg-slate-600 border-y-4 border-slate-500 rounded-r-[1rem] translate-x-[12px] rotate-y-[90deg] origin-right flex flex-col items-center justify-start pt-32">
             {/* Power Button */}
             <div className="w-1.5 h-16 bg-slate-800 rounded-l-md shadow-sm" />
          </div>

          {/* Top Edge */}
          <div className="absolute top-0 left-0 w-[280px] h-[24px] bg-slate-500 border-x-4 border-slate-600 rounded-t-[3rem] -translate-y-[12px] rotate-x-[90deg] origin-top" />

          {/* Bottom Edge */}
          <div className="absolute bottom-0 left-0 w-[280px] h-[24px] bg-slate-700 border-x-4 border-slate-600 rounded-b-[3rem] translate-y-[12px] rotate-x-[-90deg] origin-bottom flex items-center justify-center gap-4">
             {/* Speaker Grills and Port */}
             <div className="flex gap-1.5">
               {[1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 bg-black rounded-full shadow-inner" />)}
             </div>
             <div className="w-8 h-1.5 bg-black rounded-full shadow-inner" />
             <div className="flex gap-1.5">
               {[1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 bg-black rounded-full shadow-inner" />)}
             </div>
          </div>

        </div>
      </div>
      
      {/* Visual styling global modifier just for this local component */}
      <style dangerouslySetInnerHTML={{__html: `
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg) translateZ(12px); }
        .rotate-y-\\[-90deg\\] { transform: rotateY(-90deg); }
        .rotate-y-\\[90deg\\] { transform: rotateY(90deg); }
        .rotate-x-\\[90deg\\] { transform: rotateX(90deg); }
        .rotate-x-\\[-90deg\\] { transform: rotateX(-90deg); }
        .translate-z-\\[12px\\] { transform: translateZ(12px); }
        .-translate-z-\\[12px\\] { transform: translateZ(-12px); }
      `}} />

    </div>
  );
}
