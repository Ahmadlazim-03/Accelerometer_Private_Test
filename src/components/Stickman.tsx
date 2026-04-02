"use client";

import type { ActivityStatus } from "@/lib/sensor";

interface StickmanProps {
  activity: ActivityStatus;
  color?: string;
}

export default function Stickman({ activity, color = "#06b6d4" }: StickmanProps) {
  // Animation class mapping
  const isIdle = activity === "idle" || activity === "unknown";
  const isWalking = activity === "walking";
  const isRunning = activity === "running";
  const isJumping = activity === "jumping";

  return (
    <div className="relative w-[160px] h-[200px] flex items-center justify-center">
      {/* Ground shadow */}
      <div
        className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-[50%] bg-current opacity-10 transition-all duration-500"
        style={{
          width: isJumping ? 30 : 60,
          height: isJumping ? 4 : 8,
          transform: `translateX(-50%) ${isJumping ? "scale(0.5)" : "scale(1)"}`,
          color,
        }}
      />
      
      {/* SVG Stickman */}
      <svg
        viewBox="0 0 100 140"
        className="w-[120px] h-[160px] transition-transform duration-500"
        style={{
          transform: isJumping ? "translateY(-20px)" : "translateY(0)",
          filter: `drop-shadow(0 0 8px ${color}30)`,
        }}
      >
        {/* Head */}
        <circle
          cx="50"
          cy="22"
          r="14"
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          className="transition-colors duration-300"
        >
          {(isWalking || isRunning) && (
            <animate attributeName="cy" values="22;20;22" dur={isRunning ? "0.3s" : "0.6s"} repeatCount="indefinite" />
          )}
          {isJumping && (
            <animate attributeName="cy" values="22;18;22" dur="0.5s" repeatCount="indefinite" />
          )}
        </circle>

        {/* Eyes */}
        <circle cx="45" cy="20" r="1.5" fill={color} opacity="0.7" />
        <circle cx="55" cy="20" r="1.5" fill={color} opacity="0.7" />
        
        {/* Smile / Expression */}
        {isIdle && <path d="M45 26 Q50 29 55 26" fill="none" stroke={color} strokeWidth="1.5" opacity="0.5" />}
        {isWalking && <path d="M44 26 Q50 30 56 26" fill="none" stroke={color} strokeWidth="1.5" opacity="0.6" />}
        {isRunning && <circle cx="50" cy="27" r="2.5" fill={color} opacity="0.4" />}
        {isJumping && <path d="M43 25 Q50 32 57 25" fill="none" stroke={color} strokeWidth="2" opacity="0.7" />}

        {/* Spine / Body */}
        <line
          x1="50" y1="36" x2="50" y2="75"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
        >
          {(isWalking || isRunning) && (
            <animate attributeName="y2" values="75;73;75" dur={isRunning ? "0.3s" : "0.6s"} repeatCount="indefinite" />
          )}
        </line>

        {/* Left Arm */}
        <line
          x1="50" y1="45" x2={isIdle ? "30" : "25"} y2={isIdle ? "65" : "55"}
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          className="transition-all duration-200"
        >
          {isWalking && (
            <>
              <animate attributeName="x2" values="25;35;25" dur="0.6s" repeatCount="indefinite" />
              <animate attributeName="y2" values="60;50;60" dur="0.6s" repeatCount="indefinite" />
            </>
          )}
          {isRunning && (
            <>
              <animate attributeName="x2" values="20;40;20" dur="0.3s" repeatCount="indefinite" />
              <animate attributeName="y2" values="55;40;55" dur="0.3s" repeatCount="indefinite" />
            </>
          )}
          {isJumping && (
            <>
              <animate attributeName="x2" values="25;20;25" dur="0.5s" repeatCount="indefinite" />
              <animate attributeName="y2" values="30;25;30" dur="0.5s" repeatCount="indefinite" />
            </>
          )}
        </line>

        {/* Right Arm */}
        <line
          x1="50" y1="45" x2={isIdle ? "70" : "75"} y2={isIdle ? "65" : "55"}
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          className="transition-all duration-200"
        >
          {isWalking && (
            <>
              <animate attributeName="x2" values="75;65;75" dur="0.6s" repeatCount="indefinite" />
              <animate attributeName="y2" values="50;60;50" dur="0.6s" repeatCount="indefinite" />
            </>
          )}
          {isRunning && (
            <>
              <animate attributeName="x2" values="80;60;80" dur="0.3s" repeatCount="indefinite" />
              <animate attributeName="y2" values="40;55;40" dur="0.3s" repeatCount="indefinite" />
            </>
          )}
          {isJumping && (
            <>
              <animate attributeName="x2" values="75;80;75" dur="0.5s" repeatCount="indefinite" />
              <animate attributeName="y2" values="30;25;30" dur="0.5s" repeatCount="indefinite" />
            </>
          )}
        </line>

        {/* Left Leg */}
        <line
          x1="50" y1="75" x2={isIdle ? "35" : "30"} y2={isIdle ? "110" : "105"}
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
          className="transition-all duration-200"
        >
          {isWalking && (
            <>
              <animate attributeName="x2" values="30;50;30" dur="0.6s" repeatCount="indefinite" />
              <animate attributeName="y2" values="108;100;108" dur="0.6s" repeatCount="indefinite" />
            </>
          )}
          {isRunning && (
            <>
              <animate attributeName="x2" values="25;55;25" dur="0.3s" repeatCount="indefinite" />
              <animate attributeName="y2" values="105;90;105" dur="0.3s" repeatCount="indefinite" />
            </>
          )}
          {isJumping && (
            <>
              <animate attributeName="x2" values="35;30;35" dur="0.5s" repeatCount="indefinite" />
              <animate attributeName="y2" values="95;90;95" dur="0.5s" repeatCount="indefinite" />
            </>
          )}
        </line>

        {/* Right Leg */}
        <line
          x1="50" y1="75" x2={isIdle ? "65" : "70"} y2={isIdle ? "110" : "105"}
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
          className="transition-all duration-200"
        >
          {isWalking && (
            <>
              <animate attributeName="x2" values="70;50;70" dur="0.6s" repeatCount="indefinite" />
              <animate attributeName="y2" values="100;108;100" dur="0.6s" repeatCount="indefinite" />
            </>
          )}
          {isRunning && (
            <>
              <animate attributeName="x2" values="75;45;75" dur="0.3s" repeatCount="indefinite" />
              <animate attributeName="y2" values="90;105;90" dur="0.3s" repeatCount="indefinite" />
            </>
          )}
          {isJumping && (
            <>
              <animate attributeName="x2" values="65;70;65" dur="0.5s" repeatCount="indefinite" />
              <animate attributeName="y2" values="95;90;95" dur="0.5s" repeatCount="indefinite" />
            </>
          )}
        </line>

        {/* Feet (shoes) */}
        {isIdle && (
          <>
            <ellipse cx="35" cy="112" rx="6" ry="3" fill={color} opacity="0.6" />
            <ellipse cx="65" cy="112" rx="6" ry="3" fill={color} opacity="0.6" />
          </>
        )}

        {/* Jump particles */}
        {isJumping && (
          <>
            <circle cx="35" cy="120" r="2" fill={color} opacity="0.3">
              <animate attributeName="cy" values="120;125;120" dur="0.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3;0;0.3" dur="0.4s" repeatCount="indefinite" />
            </circle>
            <circle cx="50" cy="122" r="1.5" fill={color} opacity="0.2">
              <animate attributeName="cy" values="122;128;122" dur="0.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.2;0;0.2" dur="0.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="65" cy="120" r="2" fill={color} opacity="0.3">
              <animate attributeName="cy" values="120;126;120" dur="0.35s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3;0;0.3" dur="0.35s" repeatCount="indefinite" />
            </circle>
          </>
        )}

        {/* Running speed lines */}
        {isRunning && (
          <>
            <line x1="15" y1="45" x2="5" y2="45" stroke={color} strokeWidth="1.5" opacity="0.2">
              <animate attributeName="opacity" values="0.2;0;0.2" dur="0.3s" repeatCount="indefinite" />
            </line>
            <line x1="18" y1="55" x2="6" y2="55" stroke={color} strokeWidth="1.5" opacity="0.15">
              <animate attributeName="opacity" values="0.15;0;0.15" dur="0.4s" repeatCount="indefinite" />
            </line>
            <line x1="15" y1="65" x2="8" y2="65" stroke={color} strokeWidth="1.5" opacity="0.2">
              <animate attributeName="opacity" values="0.2;0;0.2" dur="0.35s" repeatCount="indefinite" />
            </line>
          </>
        )}
      </svg>
    </div>
  );
}
