"use client";

import type { ActivityStatus } from "@/lib/sensor";

interface StickmanProps {
  activity: ActivityStatus;
  color?: string;
}

export default function Stickman({ activity, color = "#06b6d4" }: StickmanProps) {
  const stateClass = {
    idle: "stickman-idle",
    walking: "stickman-walking",
    running: "stickman-running",
    jumping: "stickman-jumping",
    unknown: "stickman-idle",
  }[activity];

  return (
    <div className="stickman-container" style={{ color }}>
      <div className={`stickman ${stateClass}`}>
        {/* Head */}
        <div className="stickman-head" />
        {/* Body */}
        <div className="stickman-body" />
        {/* Arms */}
        <div className="stickman-arms">
          <div className="stickman-arm-l" />
          <div className="stickman-arm-r" />
        </div>
        {/* Legs */}
        <div className="stickman-legs">
          <div className="stickman-leg-l" />
          <div className="stickman-leg-r" />
        </div>
      </div>
    </div>
  );
}
