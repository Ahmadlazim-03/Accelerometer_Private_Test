"use client";

import React, { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useAccelerometer } from "./hooks";
import { sendAccelBatch } from "./api";
import { writeAccelToFirebase } from "./firebase";

type SensorContextType = ReturnType<typeof useAccelerometer> & {
  deviceId: string;
  setDeviceId: (id: string) => void;
  autoSend: boolean;
  setAutoSend: (val: boolean) => void;
  sendInterval: number;
  setSendInterval: (val: number) => void;
  statusMsg: string;
  setStatusMsg: (msg: string) => void;
  totalSamples: number;
  batchCount: number;
  sendManual: () => Promise<void>;
};

const SensorContext = createContext<SensorContextType | null>(null);

export function SensorProvider({ children }: { children: ReactNode }) {
  const sensor = useAccelerometer();

  // Settings from localStorage or defaults
  const [deviceId, setDeviceId] = useState("dev-001");
  const [autoSend, setAutoSend] = useState(false);
  const [sendInterval, setSendInterval] = useState(3);
  
  const [statusMsg, setStatusMsg] = useState("");
  const [totalSamples, setTotalSamples] = useState(0);
  const [batchCount, setBatchCount] = useState(0);

  // Auto-load config
  useEffect(() => {
    if (typeof window !== "undefined") {
      setDeviceId(localStorage.getItem("accel_device_id") || "dev-001");
      setAutoSend(localStorage.getItem("accel_auto_send") === "true");
      setSendInterval(Number(localStorage.getItem("accel_batch_interval")) || 3);
    }
  }, []);

  // Sync settings when changed
  useEffect(() => {
    localStorage.setItem("accel_device_id", deviceId);
    localStorage.setItem("accel_auto_send", String(autoSend));
    localStorage.setItem("accel_batch_interval", String(sendInterval));
  }, [deviceId, autoSend, sendInterval]);

  const sendBatch = async () => {
    const s = sensor.collectSamples();
    if (!s.length) return;
    setStatusMsg(`📤 Mengirim ${s.length} sampel...`);

    try {
      const res = await sendAccelBatch(deviceId, s);
      if (res.ok) {
        setBatchCount(c => c + 1);
        setTotalSamples(c => c + (res.data?.accepted ?? s.length));
        setStatusMsg(`✅ ${res.data?.accepted ?? s.length} diterima GAS`);
        
        // Also push real-time to Firebase
        const last = s[s.length - 1];
        try { await writeAccelToFirebase(deviceId, last); } catch {}
      } else {
        setStatusMsg(`❌ GAS Error: ${res.error}`);
        // Jika gagal, abaikan saja untuk mencegah memori penuh.
      }
    } catch (e) {
      setStatusMsg(`❌ Network Error: ${e}`);
    }
  };

  const sendManual = async () => {
    await sendBatch();
  };

  // Background Auto-Send Loop (The exact fix for "pindah menu Hp off")
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (sensor.isActive && autoSend) {
      intervalId = setInterval(sendBatch, sendInterval * 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [sensor.isActive, autoSend, sendInterval, deviceId]);

  return (
    <SensorContext.Provider value={{
      ...sensor,
      deviceId, setDeviceId,
      autoSend, setAutoSend,
      sendInterval, setSendInterval,
      statusMsg, setStatusMsg,
      totalSamples, batchCount,
      sendManual
    }}>
      {children}
    </SensorContext.Provider>
  );
}

export function useSensorContext() {
  const context = useContext(SensorContext);
  if (!context) throw new Error("useSensorContext must be used within a SensorProvider");
  return context;
}
