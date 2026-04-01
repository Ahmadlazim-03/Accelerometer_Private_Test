# AccelCloud — Accelerometer Telemetry Dashboard

> Praktik Komputasi Awan — Kelompok 3

Real-time accelerometer telemetry dashboard with GPS tracking, built with Next.js and Google Apps Script backend.

## Features

- **Dashboard** — Real-time connection status, device info, and signal preview
- **Live Sensor Monitor** — Read accelerometer data from device hardware or demo mode, send batches to cloud, view live charts
- **Data History** — Fetch historical data from server, area/bar charts, data table with CSV export, auto-refresh
- **GPS Tracking** — Real-time location tracking with Leaflet map, marker + polyline visualization, auto-send GPS points
- **Settings** — Configure API endpoint, device ID, batch interval, and sample rate

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Maps | Leaflet + react-leaflet |
| Icons | Lucide React |
| Backend | Google Apps Script (Code.gs) |
| Storage | Google Sheets |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
cd Accelerometer_Kelompok-3
npm install
```

### Environment Setup

Copy `.env.example` to `.env` and fill in your values:

```env
NEXT_PUBLIC_BASE_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
NEXT_PUBLIC_API_KEY=your_api_key_here
```

> **Note**: You can also configure the Base URL from the Settings page in the app.

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Backend Setup (Google Apps Script)

1. Create a Google Sheet with 4 sheets: `tokens`, `presence`, `accel`, `gps`
2. Open Extensions > Apps Script
3. Paste the contents of `Code.gs`
4. Update `SHEET_ID` and `API_KEY` constants in `Code.gs`
5. Deploy as Web App:
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copy the deployment URL (ending in `/exec`) to your `.env`

### Sheet Column Headers

| Sheet | Columns |
|-------|---------|
| `tokens` | `qr_token`, `course_id`, `session_id`, `expires_at`, `created_at` |
| `presence` | `presence_id`, `user_id`, `device_id`, `course_id`, `session_id`, `qr_token`, `ts` |
| `accel` | `device_id`, `ts_batch`, `t`, `x`, `y`, `z` |
| `gps` | `device_id`, `ts`, `lat`, `lng`, `accuracy_m` |

## API Endpoints

All requests include `api_key` for authentication.

### POST — Send Data (doPost)

The backend routes requests based on payload structure:

| Module | Detection | Description |
|--------|-----------|-------------|
| Generate QR | `course_id` + `session_id` (no `user_id`/`qr_token`) | Generate dynamic QR token |
| Check-in | `qr_token` + `user_id` + `course_id` | Student attendance check-in |
| Accelerometer | `device_id` + `samples[]` | Send batch accelerometer data |
| GPS | `device_id` + `lat` + `lng` | Log GPS location point |

### GET — Fetch Data (doGet)

| Action | Params | Description |
|--------|--------|-------------|
| `presence_status` | `user_id`, `course_id`, `session_id` | Check attendance status |
| `accel_latest` | `device_id` | Get latest accelerometer reading |
| `accel_history` | `device_id`, `limit` | Get accelerometer history |
| `gps_latest` | `device_id` | Get latest GPS position |
| `gps_history` | `device_id`, `limit` | Get GPS track history |

### Response Format

**Success:**
```json
{ "ok": true, "data": { ... } }
```

**Error:**
```json
{ "ok": false, "error": "error_message" }
```

## Project Structure

```
Accelerometer_Kelompok-3/
├── Code.gs                 # Google Apps Script backend
├── src/
│   ├── app/
│   │   ├── page.tsx        # Dashboard
│   │   ├── accelerometer/  # Live sensor monitor
│   │   ├── history/        # Data history & charts
│   │   ├── gps/            # GPS tracking with map
│   │   ├── settings/       # Configuration page
│   │   ├── layout.tsx      # Root layout with sidebar
│   │   └── globals.css     # Global styles
│   ├── components/
│   │   └── Sidebar.tsx     # Navigation sidebar
│   └── lib/
│       ├── api.ts          # API client for all modules
│       ├── hooks.ts        # Custom React hooks (accelerometer, geolocation)
│       └── utils.ts        # Utility functions
├── .env                    # Environment variables (not committed)
├── .env.example            # Environment template
└── package.json
```

## Available Scripts

```bash
npm run dev     # Start development server
npm run build   # Build for production
npm run start   # Start production server
npm run lint    # Run ESLint
```

## Demo Checklist

- [x] Dashboard shows connection status and device info
- [x] Live sensor reads accelerometer (device or demo mode)
- [x] Batch send to cloud returns `ok: true` with accepted count
- [x] History page fetches server data with charts
- [x] GPS tracking shows marker and polyline on map
- [x] Settings page configures API endpoint and device
- [x] CSV export from history data

## License

Praktik Komputasi Awan — Kelompok 3, 2026

# Accelerometer_Private_Test
