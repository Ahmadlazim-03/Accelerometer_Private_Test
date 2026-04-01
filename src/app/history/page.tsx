"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3, RefreshCw, Smartphone, Download, Trash2,
  Clock, AlertCircle, CheckCircle2,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip, BarChart, Bar,
} from "recharts";
import { getAccelLatest, getAccelHistory, type AccelSample } from "@/lib/api";

interface HistoryEntry extends AccelSample {
  mag: number;
  localTime: string;
}

export default function HistoryPage() {
  const getInitialDeviceId = () => {
    if (typeof window !== "undefined") return localStorage.getItem("accel_device_id") || "dev-001";
    return "dev-001";
  };

  const [deviceId, setDeviceId] = useState(getInitialDeviceId);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchMode, setFetchMode] = useState<"local" | "server">("local");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastFetch, setLastFetch] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(100);

  const fetchLatest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAccelLatest(deviceId);
      if (res.ok && res.data) {
        const d = res.data;
        const entry: HistoryEntry = {
          ...d,
          mag: Math.sqrt(d.x ** 2 + d.y ** 2 + d.z ** 2),
          localTime: new Date(d.t).toLocaleTimeString("id-ID"),
        };
        setHistory((prev) => [...prev, entry].slice(-50));
        setLastFetch(new Date().toLocaleTimeString("id-ID"));
        setFetchMode("local");
      } else {
        setError(res.error || "Gagal mengambil data");
      }
    } catch {
      setError("Koneksi gagal");
    }
    setLoading(false);
  }, [deviceId]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAccelHistory(deviceId, limit);
      if (res.ok && res.data?.items) {
        const entries: HistoryEntry[] = res.data.items.map((item) => {
          const mag = Math.sqrt(item.x ** 2 + item.y ** 2 + item.z ** 2);
          return {
            t: item.t,
            x: item.x,
            y: item.y,
            z: item.z,
            mag,
            localTime: new Date(item.t).toLocaleTimeString("id-ID"),
          };
        });
        setHistory(entries);
        setLastFetch(new Date().toLocaleTimeString("id-ID"));
        setFetchMode("server");
      } else {
        setError(res.error || "Tidak ada data di server");
      }
    } catch {
      setError("Koneksi gagal");
    }
    setLoading(false);
  }, [deviceId, limit]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      if (fetchMode === "server") fetchHistory();
      else fetchLatest();
    }, 5000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchMode, fetchHistory, fetchLatest]);

  const avgMag = history.length > 0 ? history.reduce((s, h) => s + h.mag, 0) / history.length : 0;
  const maxMag = history.length > 0 ? Math.max(...history.map(h => h.mag)) : 0;
  const minMag = history.length > 0 ? Math.min(...history.map(h => h.mag)) : 0;
  const avgX = history.length > 0 ? history.reduce((s, h) => s + h.x, 0) / history.length : 0;
  const avgY = history.length > 0 ? history.reduce((s, h) => s + h.y, 0) / history.length : 0;
  const avgZ = history.length > 0 ? history.reduce((s, h) => s + h.z, 0) / history.length : 0;

  const tooltipStyle = { background: "#0d1321", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", fontSize: "11px", color: "#e2e8f0" };

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Sensor <span className="gradient-text">History</span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">View and analyze historical accelerometer readings</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass-card flex items-center gap-2 px-3 py-2">
            <Smartphone size={13} className="text-slate-500" />
            <input
              type="text" value={deviceId} onChange={(e) => setDeviceId(e.target.value)}
              className="bg-transparent text-sm text-white w-24 outline-none font-mono" placeholder="device-id"
            />
          </div>
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}
            className="bg-black/20 text-xs text-slate-300 border border-white/10 rounded-lg px-2 py-2 outline-none">
            <option value={50}>50 rows</option>
            <option value={100}>100 rows</option>
            <option value={200}>200 rows</option>
            <option value={500}>500 rows</option>
          </select>
          <button onClick={fetchLatest} disabled={loading}
            className="flex items-center gap-2 bg-violet-500/15 text-violet-400 border border-violet-500/25 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-violet-500/25 active:scale-95 disabled:opacity-50 transition-all">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Latest
          </button>
          <button onClick={fetchHistory} disabled={loading}
            className="flex items-center gap-2 bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-cyan-500/25 active:scale-95 disabled:opacity-50 transition-all">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> History
          </button>
          <button onClick={() => { setHistory([]); setError(null); setLastFetch(null); }}
            className="flex items-center gap-2 bg-white/5 border border-white/10 text-white px-3 py-2 rounded-lg text-sm hover:bg-white/10 active:scale-95 transition-all">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="glass-card px-3 py-1.5 flex items-center gap-2">
          <Clock size={12} className="text-slate-500" />
          <span className="text-slate-400">Mode:</span>
          <span className={fetchMode === "server" ? "text-cyan-400 font-semibold" : "text-violet-400 font-semibold"}>
            {fetchMode === "server" ? "Server Data" : "Local Accumulation"}
          </span>
        </div>
        {lastFetch && (
          <div className="glass-card px-3 py-1.5 flex items-center gap-2">
            <CheckCircle2 size={12} className="text-emerald-400" />
            <span className="text-slate-400">Last fetch:</span>
            <span className="text-emerald-400 font-mono">{lastFetch}</span>
          </div>
        )}
        <button onClick={() => setAutoRefresh(!autoRefresh)}
          className={`glass-card px-3 py-1.5 flex items-center gap-2 cursor-pointer transition-colors ${autoRefresh ? "border-cyan-500/30 bg-cyan-500/10" : ""}`}>
          <RefreshCw size={12} className={autoRefresh ? "text-cyan-400 animate-spin" : "text-slate-500"} />
          <span className={autoRefresh ? "text-cyan-400" : "text-slate-400"}>Auto-refresh 5s</span>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="glass-card border-rose-500/20 bg-rose-500/5 p-3 flex items-center gap-2">
          <AlertCircle size={14} className="text-rose-400 shrink-0" />
          <span className="text-sm text-rose-300">{error}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Records", val: String(history.length), color: "text-white" },
          { label: "Avg Magnitude", val: avgMag.toFixed(2), color: "text-cyan-400" },
          { label: "Max Magnitude", val: maxMag.toFixed(2), color: "text-rose-400" },
          { label: "Min Magnitude", val: minMag.toFixed(2), color: "text-emerald-400" },
          { label: "Avg X/Y/Z", val: `${avgX.toFixed(1)}/${avgY.toFixed(1)}/${avgZ.toFixed(1)}`, color: "text-amber-400" },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4 text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">{s.label}</p>
            <p className={`text-xl font-bold font-mono tabular-nums ${s.color}`}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Charts or Empty */}
      {history.length > 0 ? (
        <>
          {/* Area Chart */}
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
              <BarChart3 size={14} className="text-violet-400" /> Axis Values Over Time
            </h2>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="gX" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gY" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gZ" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="localTime" tick={{ fontSize: 9, fill: "#475569" }} stroke="rgba(255,255,255,0.06)" />
                  <YAxis tick={{ fontSize: 9, fill: "#475569" }} stroke="rgba(255,255,255,0.06)" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="x" stroke="#06b6d4" fill="url(#gX)" strokeWidth={2} />
                  <Area type="monotone" dataKey="y" stroke="#8b5cf6" fill="url(#gY)" strokeWidth={2} />
                  <Area type="monotone" dataKey="z" stroke="#f59e0b" fill="url(#gZ)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-white mb-3">Magnitude Distribution</h2>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="localTime" tick={{ fontSize: 9, fill: "#475569" }} stroke="rgba(255,255,255,0.06)" />
                  <YAxis tick={{ fontSize: 9, fill: "#475569" }} stroke="rgba(255,255,255,0.06)" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="mag" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table */}
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Data Table</h2>
              <button
                onClick={() => {
                  const csv = ["timestamp,x,y,z,magnitude", ...history.map(h => `${h.t},${h.x},${h.y},${h.z},${h.mag.toFixed(4)}`)].join("\n");
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = `accel_${deviceId}_${Date.now()}.csv`; a.click();
                }}
                className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <Download size={12} /> Export CSV
              </button>
            </div>
            <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#0d1321]">
                  <tr className="text-[10px] text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-2.5 text-left">#</th>
                    <th className="px-4 py-2.5 text-left">Time</th>
                    <th className="px-4 py-2.5 text-right">X</th>
                    <th className="px-4 py-2.5 text-right">Y</th>
                    <th className="px-4 py-2.5 text-right">Z</th>
                    <th className="px-4 py-2.5 text-right">Mag</th>
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().map((h, i) => (
                    <tr key={i} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-2 text-slate-600 font-mono text-xs">{history.length - i}</td>
                      <td className="px-4 py-2 text-slate-400 font-mono text-xs">{h.localTime}</td>
                      <td className="px-4 py-2 text-right text-cyan-400 font-mono text-xs">{h.x.toFixed(4)}</td>
                      <td className="px-4 py-2 text-right text-violet-400 font-mono text-xs">{h.y.toFixed(4)}</td>
                      <td className="px-4 py-2 text-right text-amber-400 font-mono text-xs">{h.z.toFixed(4)}</td>
                      <td className="px-4 py-2 text-right text-rose-400 font-mono text-xs">{h.mag.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="glass-card p-14 text-center">
          <BarChart3 size={40} className="text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-400 mb-1">No Data Yet</h3>
          <p className="text-sm text-slate-600 max-w-sm mx-auto">
            Start the sensor on the <span className="text-cyan-400">Live Sensor</span> page and send batches, then fetch the latest data here.
          </p>
        </div>
      )}
    </div>
  );
}
