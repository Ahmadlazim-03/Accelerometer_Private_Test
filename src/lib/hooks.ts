"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { AccelSample } from "./api";

// ─── Accelerometer Hook (§2: Sensor Reading) ───
export interface AccelReading {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

export function useAccelerometer() {
  const [reading, setReading] = useState<AccelReading>({ x: 0, y: 0, z: 0, timestamp: 0 });
  const [isSupported] = useState(
    () => typeof window !== "undefined" && "DeviceMotionEvent" in window
  );
  const [isActive, setIsActive] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const samplesRef = useRef<AccelSample[]>([]);
  
  const handleMotion = useCallback((event: DeviceMotionEvent) => {
    const acc = event.accelerationIncludingGravity;
    if (acc) {
      const ts = Date.now();
      const x = +(acc.x ?? 0).toFixed(4);
      const y = +(acc.y ?? 0).toFixed(4);
      const z = +(acc.z ?? 0).toFixed(4);
      
      // Simpan buffer tetap jalan
      samplesRef.current.push({
        t: new Date().toISOString(), x, y, z,
      });

      // Lepas throttler agar HP yang layarnya 60Hz (atau 120Hz)
      // dapat ter-update dengan responsif penuh!
      setReading({ x, y, z, timestamp: ts });
    }
  }, []);

  const requestPermission = useCallback(async () => {
    const DME = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    if (typeof DME.requestPermission === "function") {
      try {
        const permission = await DME.requestPermission();
        if (permission === "granted") {
          setPermissionGranted(true);
          return true;
        }
      } catch {
        return false;
      }
    } else {
      setPermissionGranted(true);
      return true;
    }
    return false;
  }, []);

  const start = useCallback(async () => {
    const granted = await requestPermission();
    if (granted) {
      window.addEventListener("devicemotion", handleMotion);
      setIsActive(true);
    }
  }, [requestPermission, handleMotion]);

  const stop = useCallback(() => {
    window.removeEventListener("devicemotion", handleMotion);
    setIsActive(false);
  }, [handleMotion]);

  const collectSamples = useCallback((): AccelSample[] => {
    const samples = [...samplesRef.current];
    samplesRef.current = [];
    return samples;
  }, []);

  useEffect(() => {
    return () => {
      window.removeEventListener("devicemotion", handleMotion);
    };
  }, [handleMotion]);

  return {
    reading,
    isSupported,
    isActive,
    permissionGranted,
    start,
    stop,
    collectSamples,
  };
}

// ─── Interval Hook ───
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}
