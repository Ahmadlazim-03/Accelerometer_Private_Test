// ============================================
// Sensor Processing — Accelerometer Module
// PRD §6: Activity Detection
// PRD §9.1: Low-Pass Filter
// PRD §9.3: Calibration (Zeroing)
// ============================================

export interface SensorXYZ {
  x: number;
  y: number;
  z: number;
}

// ─── Low-Pass Filter (§9.1) ───
const ALPHA = 0.2;
let smoothed: SensorXYZ = { x: 0, y: 0, z: 0 };
let filterInitialized = false;

export function lowPassFilter(raw: SensorXYZ): SensorXYZ {
  if (!filterInitialized) {
    smoothed = { ...raw };
    filterInitialized = true;
    return smoothed;
  }
  smoothed.x = ALPHA * raw.x + (1 - ALPHA) * smoothed.x;
  smoothed.y = ALPHA * raw.y + (1 - ALPHA) * smoothed.y;
  smoothed.z = ALPHA * raw.z + (1 - ALPHA) * smoothed.z;
  return { ...smoothed };
}

export function resetFilter() {
  filterInitialized = false;
  smoothed = { x: 0, y: 0, z: 0 };
}

// ─── Magnitude Calculation ───
export function calculateMagnitude(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z);
}

// ─── Calibration / Zeroing (§9.3) ───
let calibrationOffset: SensorXYZ = { x: 0, y: 0, z: 0 };

export function setCalibration(baseline: SensorXYZ) {
  calibrationOffset = { ...baseline };
}

export function clearCalibration() {
  calibrationOffset = { x: 0, y: 0, z: 0 };
}

export function applyCalibration(raw: SensorXYZ): SensorXYZ {
  return {
    x: raw.x - calibrationOffset.x,
    y: raw.y - calibrationOffset.y,
    z: raw.z - calibrationOffset.z,
  };
}

export function getCalibrationOffset(): SensorXYZ {
  return { ...calibrationOffset };
}

// ─── Activity Detection (§6) ───
export type ActivityStatus = "idle" | "walking" | "running" | "jumping" | "unknown";

export interface ActivityResult {
  status: ActivityStatus;
  label: string;
  magnitude: number;
}

export function detectActivity(magnitude: number): ActivityResult {
  if (magnitude >= 9.5 && magnitude <= 10.5) {
    return { status: "idle", label: "Diam", magnitude };
  } else if (magnitude > 10.5 && magnitude <= 15.0) {
    return { status: "walking", label: "Sedang Berjalan", magnitude };
  } else if (magnitude > 15.0 && magnitude <= 25.0) {
    return { status: "running", label: "Sedang Berlari!", magnitude };
  } else if (magnitude > 25.0) {
    return { status: "jumping", label: "Melompat / Guncangan!", magnitude };
  }
  return { status: "unknown", label: "Tidak Diketahui", magnitude };
}

// ─── Activity color mapping ───
export function getActivityColor(status: ActivityStatus): string {
  switch (status) {
    case "idle": return "#10b981";
    case "walking": return "#06b6d4";
    case "running": return "#f59e0b";
    case "jumping": return "#ef4444";
    default: return "#64748b";
  }
}

export function getActivityEmoji(status: ActivityStatus): string {
  switch (status) {
    case "idle": return "🧍";
    case "walking": return "🚶";
    case "running": return "🏃";
    case "jumping": return "🤸";
    default: return "❓";
  }
}
