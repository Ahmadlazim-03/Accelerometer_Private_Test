"use client";

import { useState, useEffect } from "react";
import { Save, Server, Smartphone, Clock, Info, ExternalLink, Radio, Shield, ArrowLeftRight, Copy, Check, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const [baseUrl, setBaseUrl] = useState("");
  const [deviceId, setDeviceId] = useState("dev-001");
  const [batchInterval, setBatchInterval] = useState(3);
  const [sampleRate, setSampleRate] = useState(100);
  const [firebaseEnabled, setFirebaseEnabled] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Swap Test state
  const [swapUrl, setSwapUrl] = useState("");
  const [swapHistory, setSwapHistory] = useState<{ url: string; label: string; date: string }[]>([]);
  const [swapActive, setSwapActive] = useState(false);
  const [originalUrl, setOriginalUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [swapTestResult, setSwapTestResult] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = localStorage.getItem("accel_base_url") ||
        process.env.NEXT_PUBLIC_BASE_URL ||
        "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";
      setBaseUrl(url);
      setOriginalUrl(localStorage.getItem("accel_original_url") || url);
      setDeviceId(localStorage.getItem("accel_device_id") || "dev-001");
      setBatchInterval(Number(localStorage.getItem("accel_batch_interval")) || 3);
      setSampleRate(Number(localStorage.getItem("accel_sample_rate")) || 100);
      setFirebaseEnabled(localStorage.getItem("accel_firebase_enabled") === "true");
      setSwapActive(localStorage.getItem("accel_swap_active") === "true");
      try {
        const hist = JSON.parse(localStorage.getItem("accel_swap_history") || "[]");
        setSwapHistory(hist);
      } catch { /* ignore */ }
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
      if (!swapActive) {
        localStorage.setItem("accel_original_url", baseUrl);
        setOriginalUrl(baseUrl);
      }
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSwapActivate = async () => {
    if (!swapUrl.trim() || !swapUrl.includes("script.google.com")) {
      setSwapTestResult("❌ URL tidak valid — harus berisi script.google.com");
      return;
    }
    // Save original first
    if (!swapActive) {
      localStorage.setItem("accel_original_url", baseUrl);
      setOriginalUrl(baseUrl);
    }
    // Set the swap URL as active
    setBaseUrl(swapUrl);
    localStorage.setItem("accel_base_url", swapUrl);
    localStorage.setItem("accel_swap_active", "true");
    setSwapActive(true);

    // Add to history
    const entry = {
      url: swapUrl,
      label: swapUrl.split("/s/")[1]?.substring(0, 20) || "Unknown",
      date: new Date().toLocaleString("id-ID"),
    };
    const newHist = [entry, ...swapHistory.filter(h => h.url !== swapUrl)].slice(0, 5);
    setSwapHistory(newHist);
    localStorage.setItem("accel_swap_history", JSON.stringify(newHist));

    // Test the URL
    setSwapTestResult("⏳ Menguji koneksi...");
    try {
      await fetch(swapUrl, { method: "POST", body: JSON.stringify({ device_id: "test-swap", samples: [] }), headers: { "Content-Type": "text/plain;charset=utf-8" }, mode: "no-cors" });
      setSwapTestResult("✅ Swap berhasil! Sekarang telemetri dikirim ke URL baru.");
    } catch {
      setSwapTestResult("⚠️ Fetch gagal, tapi mungkin tetap bisa (no-cors).");
    }
    setSwapUrl("");
  };

  const handleSwapRevert = () => {
    setBaseUrl(originalUrl);
    localStorage.setItem("accel_base_url", originalUrl);
    localStorage.setItem("accel_swap_active", "false");
    setSwapActive(false);
    setSwapTestResult("🔄 Dikembalikan ke URL asli Anda.");
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(baseUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSwapFromHistory = (url: string) => {
    setSwapUrl(url);
  };

  const handleClearHistory = () => {
    setSwapHistory([]);
    localStorage.removeItem("accel_swap_history");
  };

  if (!loaded) return null;

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">
          <span className="gradient-text">Settings</span>
        </h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1">Configure API endpoint and sensor parameters</p>
      </div>

      {/* ═══════════ SWAP TEST SECTION ═══════════ */}
      <div className={`glass-card p-5 transition-all ${swapActive ? "border-amber-500/30 bg-amber-500/5" : ""}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <ArrowLeftRight size={18} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              Swap Test — Uji Silang GAS
              {swapActive && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold animate-pulse">SWAP AKTIF</span>}
            </h2>
            <p className="text-xs text-slate-500">Tukar URL GAS dengan teman untuk uji silang (§7.1)</p>
          </div>
        </div>

        {/* Current URL display */}
        <div className="mb-4 bg-black/20 border border-white/[0.06] rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">URL Aktif Sekarang</span>
            <button onClick={handleCopyUrl} className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors">
              {copied ? <><Check size={10} /> Copied!</> : <><Copy size={10} /> Salin</>}
            </button>
          </div>
          <p className="text-xs text-white font-mono break-all leading-relaxed">{baseUrl}</p>
          {swapActive && (
            <p className="text-[10px] text-amber-400 mt-1">⚡ Sedang menggunakan URL swap — bukan URL asli Anda</p>
          )}
        </div>

        {/* Swap input */}
        <div className="flex gap-2 mb-3">
          <input
            type="url"
            value={swapUrl}
            onChange={(e) => setSwapUrl(e.target.value)}
            className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white font-mono outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all placeholder:text-slate-600"
            placeholder="Paste URL GAS teman di sini..."
          />
          <button
            onClick={handleSwapActivate}
            className="flex items-center gap-1.5 bg-amber-500/15 text-amber-400 border border-amber-500/25 px-4 py-2.5 rounded-lg text-xs font-semibold hover:bg-amber-500/25 active:scale-95 transition-all shrink-0"
          >
            <ArrowLeftRight size={13} /> Swap
          </button>
        </div>

        {/* Revert button */}
        {swapActive && (
          <button
            onClick={handleSwapRevert}
            className="w-full flex items-center justify-center gap-1.5 bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 py-2 rounded-lg text-xs font-semibold hover:bg-indigo-500/25 active:scale-95 transition-all mb-3"
          >
            🔄 Kembalikan ke URL Asli Saya
          </button>
        )}

        {/* Test result */}
        {swapTestResult && (
          <div className="text-xs text-slate-400 bg-black/20 rounded-lg px-3 py-2 mb-3">{swapTestResult}</div>
        )}

        {/* Swap History */}
        {swapHistory.length > 0 && (
          <div className="border-t border-white/[0.06] pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Riwayat Swap</span>
              <button onClick={handleClearHistory} className="text-[10px] text-slate-600 hover:text-rose-400 transition-colors flex items-center gap-1">
                <Trash2 size={9} /> Hapus
              </button>
            </div>
            <div className="space-y-1.5">
              {swapHistory.map((h, i) => (
                <button
                  key={i}
                  onClick={() => handleSwapFromHistory(h.url)}
                  className="w-full text-left bg-black/15 hover:bg-black/30 border border-white/[0.04] rounded-lg px-3 py-2 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white font-mono truncate max-w-[200px]">{h.label}...</span>
                    <span className="text-[9px] text-slate-600">{h.date}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* API Configuration */}
      <div className="glass-card p-5">
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
