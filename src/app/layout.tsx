import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { SensorProvider } from "@/lib/SensorContext";

export const metadata: Metadata = {
  title: "AccelCloud — Accelerometer Telemetry",
  description:
    "Real-time accelerometer telemetry dashboard with activity detection. Cloud Computing Project — Kelompok 3.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#060a14] text-slate-100 antialiased bg-grid">
        <SensorProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 min-h-screen overflow-x-hidden">
              {children}
            </main>
          </div>
        </SensorProvider>
      </body>
    </html>
  );
}
