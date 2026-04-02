"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Activity,
  BarChart3,
  Clock,
  ArrowRight,
  Zap,
  Database,
  Wifi,
  WifiOff,
  PersonStanding,
} from "lucide-react";
import Link from "next/link";
import { getAccelLatest } from "@/lib/api";
import { useSensorContext } from "@/lib/SensorContext";
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip
} from "recharts";

const MAX_PTS = 50;

export default function DashboardPage() {
  const [time, setTime] = useState("");
  const [deviceId, setDeviceId] = useState("dev-001");
  const [totalSamples, setTotalSamples] = useState(0);
  const [lastAccel, setLastAccel] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Global Sensor Context
  const { reading, isActive } = useSensorContext();
  const [chartData, setChartData] = useState<{ time: string; x: number; y: number; z: number }[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDeviceId(localStorage.getItem("accel_device_id") || "dev-001");
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const accelRes = await getAccelLatest(deviceId);
      if (accelRes.ok && accelRes.data) {
        setLastAccel(new Date(accelRes.data.t).toLocaleTimeString("id-ID"));
        setIsConnected(true);
        setTotalSamples((prev) => prev + 1);
      }
    } catch {
      setIsConnected(false);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 10000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  /* Clock */
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  /* Capture real-time data for Dashboard preview */
  useEffect(() => {
    if (isActive) {
      const now = new Date();
      const tStr = `${now.getMinutes()}:${now.getSeconds().toString().padStart(2, "0")}`;
      setChartData(prev => {
        const newData = [...prev, { time: tStr, x: reading.x, y: reading.y, z: reading.z }];
        return newData.length > MAX_PTS ? newData.slice(newData.length - MAX_PTS) : newData;
      });
    }
  }, [reading, isActive]);

  const stats = [
    {
      label: "Device ID",
      value: deviceId,
      sub: "Active",
      icon: Zap,
      color: "text-violet-400",
      bg: "bg-violet-500/10",
    },
    {
      label: "Last Accel",
      value: lastAccel || "—",
      sub: "Timestamp",
      icon: Activity,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
    },
    {
      label: "Connection",
      value: isConnected ? "Online" : "Offline",
      sub: "Server",
      icon: Database,
      color: isConnected ? "text-emerald-400" : "text-slate-500",
      bg: isConnected ? "bg-emerald-500/10" : "bg-slate-500/10",
    },
    {
      label: "Total Batches",
      value: String(totalSamples),
      sub: "This session",
      icon: BarChart3,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs text-cyan-400 font-semibold tracking-widest uppercase mb-1">
            Accelerometer Telemetry
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Dashboard <span className="gradient-text">Overview</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor sensor data from your devices in real-time
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass-card px-3 py-2 flex items-center gap-2">
            {isConnected ? (
              <Wifi size={14} className="text-emerald-400" />
            ) : (
              <WifiOff size={14} className="text-slate-600" />
            )}
            <span
              className={`text-xs font-semibold ${isConnected ? "text-emerald-400" : "text-slate-500"}`}
            >
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
          <div className="glass-card px-4 py-2 flex items-center gap-2">
            <Clock size={14} className="text-cyan-400" />
            <span className="text-sm font-mono text-white tabular-nums">
              {time}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div
                className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}
              >
                <s.icon size={18} className={s.color} />
              </div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                {s.sub}
              </span>
            </div>
            <p
              className={`text-lg font-bold font-mono tabular-nums mb-1 ${s.color}`}
            >
              {s.value}
            </p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Waveform Realtime Graph */}
      <div className="glass-card p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Signal Preview
            </h2>
            <p className="text-xs text-slate-500">
              Live acceleration vector visualization
            </p>
          </div>
          <Link
            href="/accelerometer"
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
          >
            Open Live Sensor <ArrowRight size={12} />
          </Link>
        </div>
        <div className="w-full rounded-lg relative overflow-hidden" style={{ height: "160px", background: "rgba(0,0,0,0.2)" }}>
          {isActive ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 0, left: -40, bottom: 0 }}>
                <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={false} stroke="none" />
                <Line type="monotone" dataKey="x" stroke="#06b6d4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="y" stroke="#8b5cf6" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="z" stroke="#f59e0b" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
             <div className="absolute inset-0 flex items-center justify-center flex-col gap-2">
               <Activity className="text-slate-600" size={24} />
               <span className="text-xs text-slate-500 font-semibold">Sensor Inactive</span>
               <span className="text-[10px] text-slate-600">Turn on from the sidebar to preview graph</span>
             </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/accelerometer"
          className="glass-card p-5 group hover:border-cyan-500/30 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
              <Activity size={22} className="text-cyan-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white mb-0.5">
                Live Sensor
              </h3>
              <p className="text-xs text-slate-500">
                Read &amp; send accelerometer batches
              </p>
            </div>
            <ArrowRight
              size={16}
              className="text-slate-600 group-hover:text-cyan-400 transition-colors"
            />
          </div>
        </Link>

        <Link
          href="/activity"
          className="glass-card p-5 group hover:border-emerald-500/30 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
              <PersonStanding size={22} className="text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white mb-0.5">
                Activity Detection
              </h3>
              <p className="text-xs text-slate-500">
                Stickman animation &amp; magnitude
              </p>
            </div>
            <ArrowRight
              size={16}
              className="text-slate-600 group-hover:text-emerald-400 transition-colors"
            />
          </div>
        </Link>

        <Link
          href="/history"
          className="glass-card p-5 group hover:border-violet-500/30 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
              <BarChart3 size={22} className="text-violet-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white mb-0.5">
                Data History
              </h3>
              <p className="text-xs text-slate-500">
                Charts, analytics &amp; export
              </p>
            </div>
            <ArrowRight
              size={16}
              className="text-slate-600 group-hover:text-violet-400 transition-colors"
            />
          </div>
        </Link>
      </div>

      {/* Footer */}
      <p className="text-center text-[10px] text-slate-700 mt-10">
        Praktik Komputasi Awan — Kelompok 3 · Accelerometer Telemetry · 2026
      </p>
    </div>
  );
}
