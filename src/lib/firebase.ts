// ============================================
// Firebase Configuration — Real-time Mode (§8)
// ============================================

import { initializeApp, getApps } from "firebase/app";
import { getDatabase, ref, onValue, set, off } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAxCFJKAD27YTj_8n6cQlDTByuK1u7yIrM",
  authDomain: "laravel-6bc9c.firebaseapp.com",
  projectId: "laravel-6bc9c",
  storageBucket: "laravel-6bc9c.firebasestorage.app",
  messagingSenderId: "1026178991059",
  appId: "1:1026178991059:web:55ff4d8fc8cadf2922a526",
  measurementId: "G-E24PHL2EW5",
  databaseURL: "https://laravel-6bc9c-default-rtdb.asia-southeast1.firebasedatabase.app",
};

// Initialize Firebase (singleton)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const database = getDatabase(app);

export { database, ref, onValue, set, off };

// ─── Helper: Subscribe to real-time accel data ───
export function subscribeAccelLatest(
  deviceId: string,
  callback: (data: { x: number; y: number; z: number; t: string } | null) => void
) {
  const dbRef = ref(database, `telemetry/accel/latest/${deviceId}`);
  onValue(dbRef, (snapshot) => {
    const val = snapshot.val();
    callback(val);
  });
  return () => off(dbRef);
}

// ─── Helper: Write accel data to Firebase ───
export async function writeAccelToFirebase(
  deviceId: string,
  data: { x: number; y: number; z: number; t: string }
) {
  const dbRef = ref(database, `telemetry/accel/latest/${deviceId}`);
  await set(dbRef, data);
}
