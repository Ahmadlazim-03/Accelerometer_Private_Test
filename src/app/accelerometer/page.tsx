"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Activity, Play, Square, Send, Smartphone,
  Wifi, WifiOff, RotateCcw, TrendingUp,
  Filter, Crosshair, Flame,
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

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="text-cyan-400" size={20} />
            Live Sensor Monitor
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Real-time accelerometer telemetry &amp; cloud sync</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass-card px-3 py-1.5 flex items-center gap-2 text-xs">
            {isConnected ? <Wifi size={12} className="text-emerald-400" /> : <WifiOff size={12} className="text-slate-600" />}
            <span className={isConnected ? "text-emerald-400" : "text-slate-600"}>{isConnected ? "Synced" : "Local"}</span>
          </div>
          <div className={`w-2.5 h-2.5 rounded-full ${isActive ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] pulse-ring" : "bg-slate-600"}`} />
        </div>
      </div>

      {/* Controls */}
      <div className="glass-card p-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-1.5">
          <Smartphone size={13} className="text-slate-500" />
          <input type="text" value={deviceId} onChange={e => setDeviceId(e.target.value)} className="bg-transparent text-sm text-cyan-400 font-mono font-semibold w-20 outline-none" />
        </div>
        <div className="w-px h-6 bg-white/10" />
        {!isActive ? (
          <button onClick={start} className="flex items-center gap-1.5 bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-cyan-500/25 active:scale-95 transition-all">
            <Play size={14} /> Start
          </button>
        ) : (
          <button onClick={stop} className="flex items-center gap-1.5 bg-rose-500/15 text-rose-400 border border-rose-500/25 px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-rose-500/25 active:scale-95 transition-all">
            <Square size={14} /> Stop
          </button>
        )}
        <button onClick={send} disabled={!isActive} className="flex items-center gap-1.5 bg-violet-500/15 text-violet-400 border border-violet-500/25 disabled:opacity-30 px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-violet-500/25 active:scale-95 transition-all">
          <Send size={14} /> Send Batch
        </button>
        <button onClick={fetchLatest} className="flex items-center gap-1.5 bg-white/5 text-slate-300 border border-white/10 px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-white/10 active:scale-95 transition-all">
          <RotateCcw size={14} /> Fetch
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-slate-400 hidden md:block truncate max-w-xs">{statusMsg || "Ready"}</span>
          <div className="w-px h-5 bg-white/10" />
          <span className="text-[10px] text-slate-500 font-semibold">Auto</span>
          <button onClick={() => setAutoSend(!autoSend)} className={`w-8 h-4 rounded-full relative transition-colors ${autoSend ? "bg-cyan-500" : "bg-white/10"}`}>
            <div className={`absolute top-[2px] w-3 h-3 rounded-full bg-white shadow transition-transform ${autoSend ? "translate-x-[18px]" : "translate-x-[2px]"}`} />
          </button>
          <select value={sendInterval} onChange={e => setSendInterval(+e.target.value)} className="bg-black/20 text-[10px] text-slate-300 border border-white/10 rounded px-1.5 py-1 outline-none">
            <option value={2}>2s</option><option value={3}>3s</option><option value={5}>5s</option>
          </select>
        </div>
      </div>

      {/* Processing Options: Filter & Calibrate */}
      <div className="glass-card p-3 flex flex-wrap items-center gap-4">
        <button onClick={() => { setFilterEnabled(!filterEnabled); if (!filterEnabled) resetFilter(); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterEnabled ? "bg-amber-500/15 text-amber-400 border border-amber-500/25" : "bg-white/5 text-slate-400 border border-white/10"}`}>
          <Filter size={12} /> Low-Pass Filter {filterEnabled ? "ON" : "OFF"}
        </button>
        <div className="w-px h-5 bg-white/10" />
        {!calibrated ? (
          <button onClick={handleCalibrate} disabled={!isActive} className="flex items-center gap-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 disabled:opacity-30 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-emerald-500/25 active:scale-95 transition-all">
            <Crosshair size={12} /> Kalibrasi
          </button>
        ) : (
          <button onClick={handleClearCalibration} className="flex items-center gap-1.5 bg-rose-500/15 text-rose-400 border border-rose-500/25 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-rose-500/25 active:scale-95 transition-all">
            <Crosshair size={12} /> Reset Kalibrasi
          </button>
        )}
        {calibrated && (
          <span className="text-[10px] text-slate-500 font-mono">
            offset: [{calOffset.x.toFixed(2)}, {calOffset.y.toFixed(2)}, {calOffset.z.toFixed(2)}]
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5 text-[10px] text-slate-500">
          <Flame size={11} className="text-rose-400" />
          <span>Mag: <span className="text-rose-400 font-mono font-bold">{mag.toFixed(2)}</span></span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
        {[
          { label: "X-Axis", val: reading.x.toFixed(4), unit: "m/s²", color: "text-cyan-400", dot: "bg-cyan-400" },
          { label: "Y-Axis", val: reading.y.toFixed(4), unit: "m/s²", color: "text-violet-400", dot: "bg-violet-400" },
          { label: "Z-Axis", val: reading.z.toFixed(4), unit: "m/s²", color: "text-amber-400", dot: "bg-amber-400" },
          { label: "Magnitude", val: mag.toFixed(3), unit: "vector", color: "text-rose-400", dot: "bg-rose-400" },
          { label: "Buffer", val: String(bufferLen), unit: "pending", color: "text-cyan-400", dot: "bg-cyan-400" },
        ].map(m => (
          <div key={m.label} className="glass-card p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <div className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{m.label}</span>
            </div>
            <p className={`text-lg font-bold font-mono tabular-nums ${m.color}`}>{m.val}</p>
            <p className="text-[9px] text-slate-600 mt-0.5">{m.unit}</p>
          </div>
        ))}
      </div>

      {/* Charts + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Charts */}
        <div className="lg:col-span-3 space-y-4">
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <TrendingUp size={14} className="text-cyan-400" /> Sensor Stream
              </h2>
              <div className="flex items-center gap-3 text-[10px] font-mono">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-400" /> X</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-400" /> Y</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Z</span>
              </div>
            </div>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#475569" }} stroke="rgba(255,255,255,0.06)" />
                  <YAxis tick={{ fontSize: 9, fill: "#475569" }} stroke="rgba(255,255,255,0.06)" domain={["dataMin - 1", "dataMax + 1"]} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="x" stroke="#06b6d4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="y" stroke="#8b5cf6" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="z" stroke="#f59e0b" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
              <Activity size={14} className="text-rose-400" /> Force Magnitude
            </h2>
            <div className="h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="time" hide />
                  <YAxis tick={{ fontSize: 9, fill: "#475569" }} stroke="rgba(255,255,255,0.06)" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="mag" stroke="#f43f5e" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sketchfab 3D Smartphone (§5 Opsi B) */}
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
              <Smartphone size={14} className="text-violet-400" /> 3D Smartphone Model
            </h2>
            <div className="rounded-xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
              <iframe
                title="Phone 3D Model"
                frameBorder="0"
                allowFullScreen
                allow="autoplay; fullscreen; xr-spatial-tracking"
                src="https://sketchfab.com/models/5c53e579e1ec49d0a68a380316c252dc/embed"
                className="w-full h-full"
                style={{ minHeight: "300px" }}
              />
            </div>
            <p className="text-[10px] text-slate-600 mt-2 text-center">
              3D Model oleh <a href="https://sketchfab.com/lorenzo.brewer" target="_blank" rel="nofollow" className="text-cyan-400 hover:underline">User2005</a> di <a href="https://sketchfab.com" target="_blank" rel="nofollow" className="text-cyan-400 hover:underline">Sketchfab</a>
            </p>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          <div className="glass-card p-4">
            <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-white/[0.06]">Session Stats</h3>
            <div className="space-y-3">
              <div className="bg-black/20 rounded-lg p-3">
                <p className="text-[10px] text-slate-500 mb-0.5">Samples Sent</p>
                <p className="text-lg font-bold text-white font-mono">{totalSamples}</p>
              </div>
              <div className="bg-black/20 rounded-lg p-3">
                <p className="text-[10px] text-slate-500 mb-0.5">Batches</p>
                <p className="text-lg font-bold text-white font-mono">{batchCount}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/[0.06]">
              <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Cloud Data</h3>
              <button onClick={fetchLatest} className="text-cyan-400 hover:text-cyan-300 p-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors">
                <RotateCcw size={11} />
              </button>
            </div>
            {serverData ? (
              <div className="space-y-2">
                {[
                  { k: "X", v: serverData.x.toFixed(4), c: "text-cyan-400" },
                  { k: "Y", v: serverData.y.toFixed(4), c: "text-violet-400" },
                  { k: "Z", v: serverData.z.toFixed(4), c: "text-amber-400" },
                ].map(d => (
                  <div key={d.k} className="flex justify-between text-xs font-mono">
                    <span className={d.c}>{d.k}</span>
                    <span className="text-slate-300">{d.v}</span>
                  </div>
                ))}
                <div className="pt-2 mt-1 border-t border-white/[0.06]">
                  <p className="text-[9px] text-slate-500">Last sync</p>
                  <p className="text-[10px] text-slate-400 font-mono">{new Date(serverData.t).toLocaleTimeString()}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic text-center py-3">No data yet</p>
            )}
          </div>

          {/* Processing Info */}
          <div className="glass-card p-4">
            <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-white/[0.06]">Processing</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Filter</span>
                <span className={filterEnabled ? "text-amber-400" : "text-slate-600"}>{filterEnabled ? "Active (α=0.2)" : "Off"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kalibrasi</span>
                <span className={calibrated ? "text-emerald-400" : "text-slate-600"}>{calibrated ? "Active" : "Off"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
