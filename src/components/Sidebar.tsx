"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Activity,
  Menu,
  X,
  Cpu,
  ChevronRight,
  BarChart3,
  Settings,
  PersonStanding,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accelerometer", label: "Live Sensor", icon: Activity },
  { href: "/activity", label: "Activity", icon: PersonStanding },
  { href: "/history", label: "History", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 p-2.5 rounded-xl glass-card md:hidden"
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen flex flex-col py-6 transition-all duration-300 ease-in-out",
          "border-r border-white/[0.06]",
          "bg-[#060a14]/95 backdrop-blur-xl",
          collapsed ? "w-[72px]" : "w-[250px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex items-center gap-3 px-5 mb-10",
            collapsed && "justify-center px-3"
          )}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/20">
            <Cpu size={22} className="text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold gradient-text whitespace-nowrap">
                AccelCloud
              </h1>
              <p className="text-[10px] text-slate-500">
                Kelompok 3 — Telemetry
              </p>
            </div>
          )}
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 space-y-1">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  collapsed && "justify-center px-0",
                  isActive
                    ? "bg-cyan-500/10 text-cyan-400 shadow-[0_0_20px_-5px_rgba(6,182,212,0.3)]"
                    : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]"
                )}
              >
                <link.icon
                  size={20}
                  className={cn(
                    "shrink-0 transition-all duration-200 group-hover:scale-110",
                    isActive &&
                      "drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                  )}
                />
                {!collapsed && (
                  <span className="whitespace-nowrap">{link.label}</span>
                )}
                {!collapsed && isActive && (
                  <ChevronRight
                    size={14}
                    className="ml-auto text-cyan-400"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse Toggle (desktop only) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex items-center justify-center mx-3 py-2 rounded-xl text-slate-600 hover:text-slate-300 hover:bg-white/[0.04] transition-colors"
          aria-label="Toggle sidebar"
        >
          <ChevronRight
            size={18}
            className={cn(
              "transition-transform duration-300",
              collapsed ? "rotate-0" : "rotate-180"
            )}
          />
        </button>
      </aside>

      {/* Spacer for main content */}
      <div
        className={cn(
          "hidden md:block shrink-0 transition-all duration-300",
          collapsed ? "w-[72px]" : "w-[250px]"
        )}
      />
    </>
  );
}
