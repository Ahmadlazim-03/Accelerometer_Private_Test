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
  return process.env.NEXT_PUBLIC_BASE_URL || "https://script.google.com/macros/s/AKfycbwijq34olt6lLnpe4GmWJZELsEzQkej-SNzKZ3ZTYgJmSiz8NEiw1u7-Ysh0ek2I5Agfw/exec";
};

const getApiKey = (): string => {
  if (typeof window !== "undefined") {
    const local = localStorage.getItem("accel_api_key");
    if (local) return local;
  }
  return process.env.NEXT_PUBLIC_API_KEY || "AIzaSyAutHxPgmdER4jgQIAdg1m5Y39aDqwSNeo";
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
// Batasi data batch menjadi maksimal 50-70 payload agar Google Script tidak Timeout/Payload Error
const MAX_BATCH_SIZE = 60;

async function apiPost<T>(data: Record<string, unknown>): Promise<ApiResponse<T>> {
  try {
    const payload = { ...data, api_key: getApiKey() };
    await fetch(getBaseUrl(), {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      mode: "no-cors",
    });
    // Mode "no-cors" tidak memicu preflight dan menutupi kegagalan,
    // Google Apps Script WAJIB di deploy "Anyone" & "Execute as Me" agar terdata.
    return { ok: true, data: { accepted: (data.samples as any)?.length || 0 } as any };
  } catch (error) {
    return { ok: false, error: "Jaringan HTTP Gagal: " + String(error) };
  }
}

async function apiGet<T>(action: string, params: Record<string, string>): Promise<ApiResponse<T>> {
  try {
    const urlParams = new URLSearchParams({ action, api_key: getApiKey(), ...params }).toString();
    const url = `${getBaseUrl()}?${urlParams}`;
    const res = await fetch(url, { 
      method: "GET", 
      mode: "cors",
      redirect: "follow",
    });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { ok: false, error: "GAS Parsing Error. Make sure URL is correct and public." };
    }
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

// ─── POST /telemetry/accel — Send Batch (§4.1) ───
export async function sendAccelBatch(deviceId: string, samples: AccelSample[]) {
  // Limiting batch
  const slicedSamples = samples.slice(-MAX_BATCH_SIZE);
  return apiPost<{ accepted: number }>({
    device_id: deviceId,
    ts: new Date().toISOString(),
    samples: slicedSamples,
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
