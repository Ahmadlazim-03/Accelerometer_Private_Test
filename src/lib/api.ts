// ============================================
// API Client — Accelerometer Telemetry
// PRD §4: Endpoint Specification
// PRD §7.1: Dynamic URL (NO hardcode)
// ============================================

const getBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    const local = localStorage.getItem("accel_base_url");
    if (local) return local;
  }
  return process.env.NEXT_PUBLIC_BASE_URL || "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";
};

const getApiKey = (): string => {
  if (typeof window !== "undefined") {
    const local = localStorage.getItem("accel_api_key");
    if (local) return local;
  }
  return process.env.NEXT_PUBLIC_API_KEY || "";
};

// ─── Types ───
export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface AccelSample {
  t: string;
  x: number;
  y: number;
  z: number;
}

// ─── Internal Helpers ───
async function apiPost<T>(data: Record<string, unknown>): Promise<ApiResponse<T>> {
  try {
    const payload = { ...data, api_key: getApiKey() };
    const res = await fetch(getBaseUrl(), {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      mode: "cors",
    });
    return await res.json();
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

async function apiGet<T>(action: string, params: Record<string, string>): Promise<ApiResponse<T>> {
  try {
    const urlParams = new URLSearchParams({ action, api_key: getApiKey(), ...params }).toString();
    const url = `${getBaseUrl()}?${urlParams}`;
    const res = await fetch(url, { method: "GET", mode: "cors" });
    return await res.json();
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

// ─── POST /telemetry/accel — Send Batch (§4.1) ───
export async function sendAccelBatch(deviceId: string, samples: AccelSample[]) {
  return apiPost<{ accepted: number }>({
    device_id: deviceId,
    ts: new Date().toISOString(),
    samples,
  });
}

// ─── GET /telemetry/accel/latest (§4.2) ───
export async function getAccelLatest(deviceId: string) {
  return apiGet<AccelSample>("accel_latest", { device_id: deviceId });
}

// ─── GET /telemetry/accel/history ───
export async function getAccelHistory(deviceId: string, limit = 200) {
  return apiGet<{
    device_id: string;
    items: AccelSample[];
  }>("accel_history", { device_id: deviceId, limit: limit.toString() });
}
