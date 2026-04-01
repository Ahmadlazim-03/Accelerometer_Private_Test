"use client";

import { useState, useEffect } from "react";
import { Save, Server, Smartphone, Clock, Info, ExternalLink, Radio, Shield } from "lucide-react";

export default function SettingsPage() {
  const [baseUrl, setBaseUrl] = useState("");
  const [deviceId, setDeviceId] = useState("dev-001");
  const [batchInterval, setBatchInterval] = useState(3);
  const [sampleRate, setSampleRate] = useState(100);
  const [firebaseEnabled, setFirebaseEnabled] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(
        localStorage.getItem("accel_base_url") ||
        process.env.NEXT_PUBLIC_BASE_URL ||
        "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
      );
      setDeviceId(localStorage.getItem("accel_device_id") || "dev-001");
      setBatchInterval(Number(localStorage.getItem("accel_batch_interval")) || 3);
      setSampleRate(Number(localStorage.getItem("accel_sample_rate")) || 100);
      setFirebaseEnabled(localStorage.getItem("accel_firebase_enabled") === "true");
      setLoaded(true);
    }
  }, []);

  const handleSave = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("accel_base_url", baseUrl);
      localStorage.setItem("accel_device_id", deviceId);
      localStorage.setItem("accel_batch_interval", String(batchInterval));
      localStorage.setItem("accel_sample_rate", String(sampleRate));
      localStorage.setItem("accel_firebase_enabled", String(firebaseEnabled));
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!loaded) return null;

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          <span className="gradient-text">Settings</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">Configure API endpoint and sensor parameters</p>
      </div>

      {/* Swap Test Notice (§7.1) */}
      <div className="glass-card border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex items-start gap-3">
          <Shield size={18} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-amber-400 mb-1">Swap Test Ready (§7.1)</h3>
            <p className="text-xs text-slate-400">
              Base URL disimpan di <code className="text-amber-400/80 bg-amber-500/10 px-1 py-0.5 rounded">localStorage</code> — tidak di-hardcode. 
              Dosen/penguji bisa mengganti URL ke kelompok lain untuk uji silang.
            </p>
          </div>
        </div>
      </div>

      {/* API Configuration */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
            <Server size={18} className="text-cyan-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">API Configuration</h2>
            <p className="text-xs text-slate-500">Google Apps Script endpoint</p>
          </div>
        </div>

        <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-2">
          Base URL
        </label>
        <input
          type="url"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-sm text-white font-mono outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all placeholder:text-slate-600"
          placeholder="https://script.google.com/macros/s/.../exec"
        />
        <p className="text-[10px] text-slate-600 mt-2 flex items-center gap-1">
          <Info size={10} />
          Paste URL deployment GAS yang berakhiran /exec
        </p>
      </div>

      {/* Device Settings */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
            <Smartphone size={18} className="text-violet-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Device Settings</h2>
            <p className="text-xs text-slate-500">Sensor configuration</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-2">
              Device ID
            </label>
            <input
              type="text"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-sm text-white font-mono outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all placeholder:text-slate-600"
              placeholder="dev-001"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-2">
                <Clock size={9} className="inline mr-1 -mt-0.5" />
                Batch Interval
              </label>
              <select
                value={batchInterval}
                onChange={(e) => setBatchInterval(Number(e.target.value))}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-violet-500/50 transition-all"
              >
                <option value={2}>2 seconds</option>
                <option value={3}>3 seconds</option>
                <option value={5}>5 seconds</option>
                <option value={10}>10 seconds</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-2">
                Sample Rate
              </label>
              <select
                value={sampleRate}
                onChange={(e) => setSampleRate(Number(e.target.value))}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-violet-500/50 transition-all"
              >
                <option value={50}>50ms (20 Hz)</option>
                <option value={100}>100ms (10 Hz)</option>
                <option value={200}>200ms (5 Hz)</option>
                <option value={500}>500ms (2 Hz)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Firebase Real-time (§8) */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <Radio size={18} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-white">Firebase Real-time (§8 Bonus)</h2>
            <p className="text-xs text-slate-500">Toggle antara Polling GAS vs Firebase WebSocket</p>
          </div>
          <button
            onClick={() => setFirebaseEnabled(!firebaseEnabled)}
            className={`w-12 h-6 rounded-full relative transition-colors ${firebaseEnabled ? "bg-amber-500" : "bg-white/10"}`}
          >
            <div className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow transition-transform ${firebaseEnabled ? "translate-x-[27px]" : "translate-x-[3px]"}`} />
          </button>
        </div>

        <div className={`rounded-xl p-4 transition-all ${firebaseEnabled ? "bg-amber-500/5 border border-amber-500/20" : "bg-black/20 border border-white/[0.06]"}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-2 h-2 rounded-full ${firebaseEnabled ? "bg-amber-400 pulse-ring" : "bg-slate-600"}`} />
            <span className={`text-xs font-semibold ${firebaseEnabled ? "text-amber-400" : "text-slate-500"}`}>
              {firebaseEnabled ? "Mode: Firebase Real-time (WebSocket)" : "Mode: Polling GAS (Default)"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {firebaseEnabled
              ? "Data sensor akan di-stream langsung dari Firebase Realtime Database menggunakan WebSocket. Lebih cepat dan efisien daripada polling."
              : "Data sensor ditarik dari Google Apps Script setiap beberapa detik menggunakan setInterval (Versi A). Cocok untuk testing standar."
            }
          </p>
          {firebaseEnabled && (
            <div className="mt-3 pt-3 border-t border-amber-500/15 space-y-1.5 text-[10px] font-mono text-slate-500">
              <p>Project: <span className="text-amber-400">laravel-6bc9c</span></p>
              <p>DB Path: <span className="text-amber-400">telemetry/accel/latest/&#123;device_id&#125;</span></p>
            </div>
          )}
        </div>
      </div>

      {/* API Reference */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
            <ExternalLink size={18} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">API Reference</h2>
            <p className="text-xs text-slate-500">Accelerometer endpoints (§4)</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="bg-black/20 border border-white/[0.06] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">POST</span>
              <span className="text-sm text-white font-mono">/exec</span>
            </div>
            <p className="text-xs text-slate-500">Kirim data batch accelerometer</p>
            <pre className="mt-2 text-[10px] text-slate-600 font-mono bg-black/20 p-2 rounded overflow-x-auto">
{`{ "device_id": "dev-001", "ts": "...", "samples": [{ "t": "...", "x": 0.12, "y": 0.01, "z": 9.70 }] }`}
            </pre>
          </div>
          <div className="bg-black/20 border border-white/[0.06] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded font-mono font-bold">GET</span>
              <span className="text-sm text-white font-mono">/exec?action=accel_latest&amp;device_id=...</span>
            </div>
            <p className="text-xs text-slate-500">Ambil data terbaru untuk device tertentu</p>
          </div>
          <div className="bg-black/20 border border-white/[0.06] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded font-mono font-bold">GET</span>
              <span className="text-sm text-white font-mono">/exec?action=accel_history&amp;device_id=...&amp;limit=200</span>
            </div>
            <p className="text-xs text-slate-500">Ambil riwayat data accelerometer</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${
          saved
            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
            : "bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20"
        }`}
      >
        {saved ? <>✓ Saved!</> : <><Save size={16} /> Save Settings</>}
      </button>
    </div>
  );
}
