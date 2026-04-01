"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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

export default function DashboardPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [time, setTime] = useState("");
  const [deviceId, setDeviceId] = useState("dev-001");
  const [totalSamples, setTotalSamples] = useState(0);
  const [lastAccel, setLastAccel] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

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
      setTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  /* Waveform canvas */
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d")!;
    let frame = 0;
    let raf: number;
    const draw = () => {
      cvs.width = cvs.offsetWidth * 2;
      cvs.height = cvs.offsetHeight * 2;
      ctx.scale(2, 2);
      const w = cvs.offsetWidth;
      const h = cvs.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      const drawWave = (
        color: string,
        amp: number,
        freq: number,
        phase: number
      ) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        for (let x = 0; x <= w; x++) {
          const y =
            h / 2 + Math.sin((x * freq) / w + frame * 0.02 + phase) * amp;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };

      drawWave("rgba(6,182,212,0.4)", 20, 12, 0);
      drawWave("rgba(139,92,246,0.3)", 15, 16, 2);
      drawWave("rgba(245,158,11,0.25)", 10, 20, 4);
      frame++;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

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

      {/* Waveform */}
      <div className="glass-card p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Signal Preview
            </h2>
            <p className="text-xs text-slate-500">
              Live waveform visualization
            </p>
          </div>
          <Link
            href="/accelerometer"
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
          >
            Open Live Sensor <ArrowRight size={12} />
          </Link>
        </div>
        <canvas
          ref={canvasRef}
          className="w-full rounded-lg"
          style={{ height: "160px", background: "rgba(0,0,0,0.2)" }}
        />
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
