/**
 * Praktik Komputasi Awan — Kelompok 3
 * Modul 1, 2, 3 API Backend (Google Apps Script)
 * Versi: 1.0
 */

// Konfigurasi Sistem
const SHEET_ID = "1Rdrr-BDB7_WSA6I7J09NO3UF7OtBWtZ1VInQOkfm3UY";
const API_KEY = "AIzaSyAutHxPgmdER4jgQIAdg1m5Y39aDqwSNeo";

// Utilitas: Standard Response
function successResponse(data) {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(message) {
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: message }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Router Utama (doPost)
function doPost(e) {
  try {
    const path = e.parameter.path || "";
    // Jika path tidak ada di parameter, kita asumsikan routing dari pathInfo (Deployment)
    // Berhubung GAS web app sering repot dengan path, kita gunakan e.postData.contents
    
    // Validasi Body
    if (!e.postData || !e.postData.contents) {
      return errorResponse("Empty request body");
    }
    
    const body = JSON.parse(e.postData.contents);
    
    // Auth Check
    const reqApiKey = body.api_key || e.parameter.api_key;
    if (reqApiKey !== API_KEY) {
      return errorResponse("unauthorized");
    }
    
    // Karena kita tidak memiliki path routing murni di doPost URL biasa, 
    // kita akan mengirimkan 'action' di payload atau menentukan endpoint dari stuktur payload.
    // Namun sesuai SRS API payload standar, kita perlu mendeteksi dari payload.
    
    // Modul 1: Generate QR
    if (body.hasOwnProperty('course_id') && body.hasOwnProperty('session_id') && !body.hasOwnProperty('user_id') && !body.hasOwnProperty('qr_token')) {
      return handleGenerateQR(body);
    }
    
    // Modul 1: Check-in
    if (body.hasOwnProperty('qr_token') && body.hasOwnProperty('user_id') && body.hasOwnProperty('course_id')) {
      return handleCheckIn(body);
    }
    
    // Modul 2: Accelerometer (Batch)
    if (body.hasOwnProperty('device_id') && body.hasOwnProperty('samples') && Array.isArray(body.samples)) {
      return handleAccelBatch(body);
    }
    
    // Modul 3: GPS
    if (body.hasOwnProperty('device_id') && body.hasOwnProperty('lat') && body.hasOwnProperty('lng')) {
      return handleGPS(body);
    }

    return errorResponse("Invalid endpoint or missing fields");
  } catch (error) {
    return errorResponse(error.toString());
  }
}

// Router Utama (doGet)
function doGet(e) {
  try {
    const action = e.parameter.action;
    
    // Auth Check
    if (e.parameter.api_key !== API_KEY) {
      return errorResponse("unauthorized");
    }
    
    // Modul 1: Status
    if (action === "presence_status") {
      return handlePresenceStatus(e.parameter);
    }
    
    // Modul 2: Latest Accel & History Accel
    if (action === "accel_latest") {
      return handleAccelLatest(e.parameter);
    }
    if (action === "accel_history") {
      return handleAccelHistory(e.parameter);
    }
    
    // Modul 3: Latest GPS & History GPS
    if (action === "gps_latest") {
      return handleGPSLatest(e.parameter);
    }
    if (action === "gps_history") {
      return handleGPSHistory(e.parameter);
    }

    return errorResponse("Invalid action parameter for GET request");
  } catch (error) {
    return errorResponse(error.toString());
  }
}


// ==============================================================================
// MODUL 1: PRESENSI QR DINAMIS
// ==============================================================================

function handleGenerateQR(body) {
  const ts = body.ts || new Date().toISOString();
  // Generate random token
  const token = "TKN-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  
  // Expire dalam 2 menit
  const expireDate = new Date(new Date(ts).getTime() + 2 * 60000);
  const expires_at = expireDate.toISOString();
  
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName("tokens");
  if (!sheet) return errorResponse("Sheet 'tokens' not found");
  
  // qr_token, course_id, session_id, expires_at, created_at
  sheet.appendRow([token, body.course_id, body.session_id, expires_at, ts]);
  
  return successResponse({
    qr_token: token,
    expires_at: expires_at
  });
}

function handleCheckIn(body) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const tokensSheet = ss.getSheetByName("tokens");
  const presenceSheet = ss.getSheetByName("presence");
  
  if (!tokensSheet || !presenceSheet) return errorResponse("Database sheets missing");
  
  // Validasi token
  const tokensData = tokensSheet.getDataRange().getValues();
  let validToken = false;
  let isExpired = true;
  
  for (let i = 1; i < tokensData.length; i++) {
    // [0] qr_token, [1] course_id, [2] session_id, [3] expires_at
    if (tokensData[i][0] === body.qr_token && tokensData[i][1] === body.course_id && tokensData[i][2] === body.session_id) {
      validToken = true;
      const expireTime = new Date(tokensData[i][3]).getTime();
      const reqTime = new Date(body.ts).getTime();
      
      if (reqTime <= expireTime) {
        isExpired = false;
      }
      break;
    }
  }
  
  if (!validToken) return errorResponse("token_invalid");
  if (isExpired) return errorResponse("token_expired");
  
  const presence_id = "PR-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  
  // presence_id, user_id, device_id, course_id, session_id, qr_token, ts
  presenceSheet.appendRow([
    presence_id, 
    body.user_id, 
    body.device_id, 
    body.course_id, 
    body.session_id, 
    body.qr_token, 
    body.ts
  ]);
  
  return successResponse({
    presence_id: presence_id,
    status: "checked_in"
  });
}

function handlePresenceStatus(param) {
  if (!param.user_id || !param.course_id || !param.session_id) {
    return errorResponse("Missing user_id, course_id, or session_id");
  }
  
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName("presence");
  const data = sheet.getDataRange().getValues();
  
  for (let i = data.length - 1; i >= 1; i--) {
    // presence_id, user_id, device_id, course_id, session_id, qr_token, ts
    if (data[i][1] == param.user_id && data[i][3] == param.course_id && data[i][4] == param.session_id) {
      return successResponse({
        user_id: param.user_id,
        course_id: param.course_id,
        session_id: param.session_id,
        status: "checked_in",
        last_ts: data[i][6]
      });
    }
  }
  
  return successResponse({
    user_id: param.user_id,
    course_id: param.course_id,
    session_id: param.session_id,
    status: "not_present"
  });
}

// ==============================================================================
// MODUL 2: ACCELEROMETER TELEMETRY
// ==============================================================================

function handleAccelBatch(body) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName("accel");
  if (!sheet) return errorResponse("Sheet 'accel' not found");
  
  const device_id = body.device_id;
  const ts_batch = body.ts;
  const samples = body.samples;
  
  const rows = [];
  samples.forEach(function(sample) {
    // device_id, ts_batch, t, x, y, z
    rows.push([device_id, ts_batch, sample.t, sample.x, sample.y, sample.z]);
  });
  
  // Batch insert jika memungkinkan (GAS belum punya appendRows native selain pakai range)
  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }
  
  return successResponse({ accepted: rows.length });
}

function handleAccelLatest(param) {
  if (!param.device_id) return errorResponse("Missing device_id");
  
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName("accel");
  const data = sheet.getDataRange().getValues();
  
  // Cari dari baris terakhir
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] == param.device_id) {
      return successResponse({
        t: data[i][2],
        x: data[i][3],
        y: data[i][4],
        z: data[i][5]
      });
    }
  }
  
  return errorResponse("device_not_found");
}

function handleAccelHistory(param) {
  if (!param.device_id) return errorResponse("Missing device_id");
  const limit = parseInt(param.limit) || 200;
  
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName("accel");
  const data = sheet.getDataRange().getValues();
  
  const items = [];
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] == param.device_id) {
      items.push({
        t: data[i][2],
        x: data[i][3],
        y: data[i][4],
        z: data[i][5]
      });
      if (items.length >= limit) break;
    }
  }
  
  return successResponse({
    device_id: param.device_id,
    items: items.reverse()
  });
}

// ==============================================================================
// MODUL 3: GPS TRACKING
// ==============================================================================

function handleGPS(body) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName("gps");
  if (!sheet) return errorResponse("Sheet 'gps' not found");
  
  // device_id, ts, lat, lng, accuracy_m
  sheet.appendRow([body.device_id, body.ts, body.lat, body.lng, body.accuracy_m || 0]);
  
  return successResponse({ accepted: true });
}

function handleGPSLatest(param) {
  if (!param.device_id) return errorResponse("Missing device_id");
  
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName("gps");
  const data = sheet.getDataRange().getValues();
  
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] == param.device_id) {
      return successResponse({
        ts: data[i][1],
        lat: data[i][2],
        lng: data[i][3],
        accuracy_m: data[i][4]
      });
    }
  }
  
  return errorResponse("device_not_found");
}

function handleGPSHistory(param) {
  if (!param.device_id) return errorResponse("Missing device_id");
  const limit = parseInt(param.limit) || 200;
  
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName("gps");
  const data = sheet.getDataRange().getValues();
  
  const items = [];
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] == param.device_id) {
      items.push({
        ts: data[i][1],
        lat: data[i][2],
        lng: data[i][3]
      });
      if (items.length >= limit) break;
    }
  }
  
  return successResponse({
    device_id: param.device_id,
    items: items.reverse()
  });
}
