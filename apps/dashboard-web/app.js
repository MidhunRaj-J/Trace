const dom = {
  userId: document.getElementById("userId"),
  ingestionUrl: document.getElementById("ingestionUrl"),
  scoringUrl: document.getElementById("scoringUrl"),
  baselineWindow: document.getElementById("baselineWindow"),
  realtimeMinutes: document.getElementById("realtimeMinutes"),
  longitudinalDays: document.getElementById("longitudinalDays"),
  seedBtn: document.getElementById("seedBtn"),
  seedLongBtn: document.getElementById("seedLongBtn"),
  startRealtimeBtn: document.getElementById("startRealtimeBtn"),
  stopRealtimeBtn: document.getElementById("stopRealtimeBtn"),
  refreshBtn: document.getElementById("refreshBtn"),
  resetBtn: document.getElementById("resetBtn"),
  typingPad: document.getElementById("typingPad"),
  realtimeStats: document.getElementById("realtimeStats"),
  summary: document.getElementById("summary"),
  status: document.getElementById("status"),
  latestSignals: document.getElementById("latestSignals"),
  compositeRisk: document.getElementById("compositeRisk"),
  trendDirection: document.getElementById("trendDirection"),
  canvas: document.getElementById("trendCanvas"),
};

const realtimeState = {
  active: false,
  startedAtMs: 0,
  endsAtMs: 0,
  sentEvents: 0,
  sendErrors: 0,
  keyDownMap: new Map(),
  lastKeyUpMs: null,
  tickTimer: null,
  voiceTimer: null,
};

function setStatus(text) {
  dom.status.textContent = text;
}

function rng(seed) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

function getConfig() {
  return {
    userId: dom.userId.value.trim(),
    ingestionUrl: dom.ingestionUrl.value.trim().replace(/\/$/, ""),
    scoringUrl: dom.scoringUrl.value.trim().replace(/\/$/, ""),
    baselineWindow: Number(dom.baselineWindow.value || 7),
    realtimeMinutes: Number(dom.realtimeMinutes.value || 5),
    longitudinalDays: Number(dom.longitudinalDays.value || 180),
  };
}

async function apiJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed (${response.status}): ${body}`);
  }
  return response.json();
}

function buildDemoMonth(dayCount = 30) {
  const random = rng(1707);
  const startTs = Date.now() - dayCount * 24 * 60 * 60 * 1000;
  const rows = [];

  for (let i = 0; i < dayCount; i += 1) {
    const driftStep = i > 18 ? (i - 18) * 1.6 : 0;
    const dwellMs = 101 + driftStep + (random() * 6 - 3);
    const flightMs = 76 + driftStep * 0.65 + (random() * 5 - 2.5);
    const voiceJitter = 0.011 + driftStep * 0.0009 + (random() * 0.002 - 0.001);
    rows.push({
      dayIndex: i,
      timestampMs: startTs + i * 24 * 60 * 60 * 1000,
      dwellMs: Number(dwellMs.toFixed(3)),
      flightMsPrev: Number(flightMs.toFixed(3)),
      voiceJitter: Number(Math.max(0, voiceJitter).toFixed(5)),
      voiceShimmer: Number((0.021 + driftStep * 0.001 + (random() * 0.002 - 0.001)).toFixed(5)),
      voiceQuality: Number((0.96 - i * 0.005 + (random() * 0.03 - 0.015)).toFixed(3)),
    });
  }

  return rows;
}

function buildLongitudinalScenario(dayCount = 180) {
  const random = rng(2404);
  const startTs = Date.now() - dayCount * 24 * 60 * 60 * 1000;
  const rows = [];

  for (let i = 0; i < dayCount; i += 1) {
    let driftStep = 0;
    if (i > Math.floor(dayCount * 0.35) && i <= Math.floor(dayCount * 0.7)) {
      driftStep = (i - Math.floor(dayCount * 0.35)) * 0.45;
    } else if (i > Math.floor(dayCount * 0.7)) {
      const firstSlope = (Math.floor(dayCount * 0.7) - Math.floor(dayCount * 0.35)) * 0.45;
      driftStep = firstSlope + (i - Math.floor(dayCount * 0.7)) * 0.2;
    }

    const dwellMs = 98 + driftStep + (random() * 7 - 3.5);
    const flightMs = 72 + driftStep * 0.6 + (random() * 6 - 3);
    rows.push({
      dayIndex: i,
      timestampMs: startTs + i * 24 * 60 * 60 * 1000,
      dwellMs: Number(dwellMs.toFixed(3)),
      flightMsPrev: Number(flightMs.toFixed(3)),
      voiceQuality: Number((0.95 - driftStep * 0.006 + (random() * 0.04 - 0.02)).toFixed(3)),
    });
  }

  return rows;
}

async function uploadScenario(points, label) {
  const cfg = getConfig();
  if (cfg.userId.length < 8) {
    setStatus("User ID hash must be at least 8 characters.");
    return;
  }

  setStatus(`${label}: resetting existing user data...`);
  await apiJson(`${cfg.ingestionUrl}/v1/users/${cfg.userId}`, { method: "DELETE" });

  setStatus(`${label}: uploading ${points.length} days...`);
  for (const row of points) {
    await apiJson(`${cfg.ingestionUrl}/v1/keystroke/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id_hash: cfg.userId,
        session_id: `session_${row.dayIndex.toString().padStart(3, "0")}`,
        timestamp_ms: row.timestampMs,
        dwell_ms: row.dwellMs,
        flight_ms_prev: row.flightMsPrev,
      }),
    });

    await apiJson(`${cfg.ingestionUrl}/v1/voice/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id_hash: cfg.userId,
        prompt_id: "weekly_ah",
        recorded_at_ms: row.timestampMs,
        sample_rate_hz: 16000,
        duration_s: 5.0,
        f0_series_hz: [128.2, 130.3, 129.8],
        rms_series: [0.29, 0.31, 0.28],
        environment_quality_score: Math.max(0, Math.min(1, row.voiceQuality)),
      }),
    });
  }

  setStatus(`${label}: upload complete.`);
  await refreshAnalytics();
}

async function seedDemoData() {
  const points = buildDemoMonth(30);
  await uploadScenario(points, "Demo month");
}

async function seedLongitudinalData() {
  const cfg = getConfig();
  const dayCount = Math.max(30, Math.min(365, cfg.longitudinalDays));
  const points = buildLongitudinalScenario(dayCount);
  await uploadScenario(points, `Longitudinal scenario (${dayCount} days)`);
}

async function fetchUserData() {
  const cfg = getConfig();
  const [summary, keystrokeData, voiceData] = await Promise.all([
    apiJson(`${cfg.ingestionUrl}/v1/users/${cfg.userId}/summary`),
    apiJson(`${cfg.ingestionUrl}/v1/users/${cfg.userId}/keystroke/events?limit=120`),
    apiJson(`${cfg.ingestionUrl}/v1/users/${cfg.userId}/voice/sessions?limit=120`),
  ]);
  return { summary, keystrokeData, voiceData };
}

async function scoreSeries(series) {
  const cfg = getConfig();
  return apiJson(`${cfg.scoringUrl}/v1/trend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      series,
      baseline_window: cfg.baselineWindow,
    }),
  });
}

function compositeSeries(keyRisks, voiceRisks, voiceQualitySeries, hasKey, hasVoice) {
  const len = Math.max(keyRisks.length, voiceRisks.length);
  const out = [];
  for (let i = 0; i < len; i += 1) {
    const keyRisk = keyRisks[i] ?? 0;
    const voiceRisk = voiceRisks[i] ?? 0;

    if (hasKey && !hasVoice) {
      out.push(keyRisk);
      continue;
    }
    if (!hasKey && hasVoice) {
      out.push(voiceRisk);
      continue;
    }

    const voiceWeight = 0.5 * Math.max(0, Math.min(1, voiceQualitySeries[i] ?? 1));
    const keyWeight = 1 - voiceWeight;
    out.push((keyRisk * keyWeight) + (voiceRisk * voiceWeight));
  }
  return out;
}

function drawGrid(ctx, width, height) {
  ctx.strokeStyle = "#ddd3bf";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i += 1) {
    const y = 20 + i * ((height - 40) / 5);
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(width - 20, y);
    ctx.stroke();
  }
}

function plotSeries(ctx, values, color, width, height) {
  if (!values.length) {
    return;
  }

  const left = 24;
  const right = width - 24;
  const top = 20;
  const bottom = height - 20;
  const xStep = values.length > 1 ? (right - left) / (values.length - 1) : right - left;

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = left + i * xStep;
    const y = bottom - Math.max(0, Math.min(1, v)) * (bottom - top);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();
}

function drawTrendChart(keystrokeRisk, voiceRisk, compositeRisk) {
  const ctx = dom.canvas.getContext("2d");
  const width = dom.canvas.width;
  const height = dom.canvas.height;
  ctx.clearRect(0, 0, width, height);
  drawGrid(ctx, width, height);
  plotSeries(ctx, keystrokeRisk, "#155b70", width, height);
  plotSeries(ctx, voiceRisk, "#c7602f", width, height);
  plotSeries(ctx, compositeRisk, "#2f7a47", width, height);
}

function toFixedSafe(value, digits = 3) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "--";
  }
  return value.toFixed(digits);
}

function trendLabel(series) {
  if (series.length < 2) {
    return "Insufficient data";
  }
  const delta = series[series.length - 1] - series[Math.max(0, series.length - 8)];
  if (delta > 0.08) {
    return "Rising";
  }
  if (delta < -0.08) {
    return "Falling";
  }
  return "Stable";
}

async function refreshAnalytics() {
  try {
    setStatus("Fetching user events and computing trajectories...");
    const { summary, keystrokeData, voiceData } = await fetchUserData();
    dom.summary.textContent = JSON.stringify(summary, null, 2);

    const keySeries = keystrokeData.events.map((e) => Number(e.dwell_ms));
    const voiceSeries = voiceData.sessions.map((s) => Number(s.environment_quality_score || 0));
    const voiceQualitySeries = voiceData.sessions.map((s) => Number(s.environment_quality_score || 1));
    const hasKey = keySeries.length >= 3;
    const hasVoice = voiceSeries.length >= 3;

    if (!keySeries.length && !voiceSeries.length) {
      dom.latestSignals.innerHTML = "No events yet. Start realtime test, generate demo month, or run longitudinal scenario.";
      dom.compositeRisk.textContent = "--";
      dom.trendDirection.textContent = "--";
      drawTrendChart([], [], []);
      setStatus("No data found for this user.");
      return;
    }

    const [keyTrend, voiceTrend] = await Promise.all([
      hasKey ? scoreSeries(keySeries) : Promise.resolve({ points: [] }),
      hasVoice ? scoreSeries(voiceSeries) : Promise.resolve({ points: [] }),
    ]);

    const keyRisk = keyTrend.points.map((p) => p.risk);
    const voiceRisk = voiceTrend.points.map((p) => p.risk);
    const composite = compositeSeries(keyRisk, voiceRisk, voiceQualitySeries, hasKey, hasVoice);

    drawTrendChart(keyRisk, voiceRisk, composite);

    const latestKey = keyTrend.points[keyTrend.points.length - 1] || {};
    const latestVoice = voiceTrend.points[voiceTrend.points.length - 1] || {};
    const latestComposite = composite[composite.length - 1];

    dom.compositeRisk.textContent = toFixedSafe(latestComposite, 3);
    dom.trendDirection.textContent = trendLabel(composite);
    const signalRows = [
      `<div class="signal-item"><span>Keystroke z-score</span><strong>${toFixedSafe(latestKey.z_score, 2)}</strong></div>`,
      `<div class="signal-item"><span>Keystroke risk</span><strong>${toFixedSafe(latestKey.risk, 3)}</strong></div>`,
      `<div class="signal-item"><span>Voice z-score</span><strong>${toFixedSafe(latestVoice.z_score, 2)}</strong></div>`,
      `<div class="signal-item"><span>Voice risk</span><strong>${toFixedSafe(latestVoice.risk, 3)}</strong></div>`,
    ];
    if (realtimeState.active) {
      signalRows.push(`<div class="signal-item"><span>Realtime events sent</span><strong>${realtimeState.sentEvents}</strong></div>`);
    }
    dom.latestSignals.innerHTML = signalRows.join("");

    setStatus("Analytics refreshed.");
  } catch (error) {
    console.error(error);
    setStatus(`Failed: ${error.message}`);
    dom.summary.textContent = "API connection failed. Start both FastAPI services first.";
  }
}

async function resetUserData() {
  const cfg = getConfig();
  setStatus("Resetting user data...");
  await apiJson(`${cfg.ingestionUrl}/v1/users/${cfg.userId}`, { method: "DELETE" });
  setStatus("User data reset.");
  await refreshAnalytics();
}

function setRealtimeUi() {
  dom.startRealtimeBtn.disabled = realtimeState.active;
  dom.stopRealtimeBtn.disabled = !realtimeState.active;
  dom.typingPad.disabled = !realtimeState.active;
  if (realtimeState.active) {
    dom.typingPad.focus();
  }
}

function updateRealtimeStats() {
  if (!realtimeState.active) {
    dom.realtimeStats.textContent = "Realtime inactive.";
    return;
  }

  const remainingMs = Math.max(0, realtimeState.endsAtMs - Date.now());
  const seconds = Math.floor((remainingMs / 1000) % 60);
  const minutes = Math.floor(remainingMs / 60000);
  dom.realtimeStats.textContent = `Running: ${minutes}:${seconds.toString().padStart(2, "0")} remaining | events sent: ${realtimeState.sentEvents} | send errors: ${realtimeState.sendErrors}`;
}

async function sendRealtimeVoiceSession() {
  if (!realtimeState.active) {
    return;
  }

  const cfg = getConfig();
  try {
    await apiJson(`${cfg.ingestionUrl}/v1/voice/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id_hash: cfg.userId,
        prompt_id: "realtime_checkpoint",
        recorded_at_ms: Date.now(),
        sample_rate_hz: 16000,
        duration_s: 5.0,
        f0_series_hz: [128.0, 129.2, 130.1],
        rms_series: [0.28, 0.31, 0.29],
        environment_quality_score: 0.9,
      }),
    });
  } catch {
    realtimeState.sendErrors += 1;
  }
}

async function postRealtimeKeystroke(dwellMs, flightMsPrev) {
  const cfg = getConfig();
  try {
    await apiJson(`${cfg.ingestionUrl}/v1/keystroke/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id_hash: cfg.userId,
        session_id: `rt_${Math.floor(realtimeState.startedAtMs / 1000)}`,
        timestamp_ms: Date.now(),
        dwell_ms: Number(dwellMs.toFixed(3)),
        flight_ms_prev: Number(flightMsPrev.toFixed(3)),
      }),
    });
    realtimeState.sentEvents += 1;
  } catch {
    realtimeState.sendErrors += 1;
  }
}

function onRealtimeKeyDown(event) {
  if (!realtimeState.active || event.repeat) {
    return;
  }
  realtimeState.keyDownMap.set(event.code, performance.now());
}

function onRealtimeKeyUp(event) {
  if (!realtimeState.active) {
    return;
  }

  const downTs = realtimeState.keyDownMap.get(event.code);
  realtimeState.keyDownMap.delete(event.code);
  if (typeof downTs !== "number") {
    return;
  }

  const upTs = performance.now();
  const dwellMs = Math.max(0, upTs - downTs);
  const flightMsPrev = realtimeState.lastKeyUpMs === null ? 0 : Math.max(0, downTs - realtimeState.lastKeyUpMs);
  realtimeState.lastKeyUpMs = upTs;
  postRealtimeKeystroke(dwellMs, flightMsPrev);
}

async function stopRealtimeTest(autoStopped = false) {
  if (!realtimeState.active) {
    return;
  }

  realtimeState.active = false;
  if (realtimeState.tickTimer) {
    clearInterval(realtimeState.tickTimer);
    realtimeState.tickTimer = null;
  }
  if (realtimeState.voiceTimer) {
    clearInterval(realtimeState.voiceTimer);
    realtimeState.voiceTimer = null;
  }

  dom.typingPad.removeEventListener("keydown", onRealtimeKeyDown);
  dom.typingPad.removeEventListener("keyup", onRealtimeKeyUp);
  setRealtimeUi();
  updateRealtimeStats();
  setStatus(autoStopped ? "Realtime test completed." : "Realtime test stopped.");
  await refreshAnalytics();
}

async function startRealtimeTest() {
  const cfg = getConfig();
  if (cfg.userId.length < 8) {
    setStatus("User ID hash must be at least 8 characters.");
    return;
  }

  const minutes = Math.max(1, Math.min(30, cfg.realtimeMinutes));
  realtimeState.active = true;
  realtimeState.startedAtMs = Date.now();
  realtimeState.endsAtMs = realtimeState.startedAtMs + minutes * 60 * 1000;
  realtimeState.sentEvents = 0;
  realtimeState.sendErrors = 0;
  realtimeState.keyDownMap.clear();
  realtimeState.lastKeyUpMs = null;

  dom.typingPad.value = "";
  dom.typingPad.addEventListener("keydown", onRealtimeKeyDown);
  dom.typingPad.addEventListener("keyup", onRealtimeKeyUp);
  setRealtimeUi();

  setStatus(`Realtime test started for ${minutes} minute(s). Type in the typing pad.`);
  updateRealtimeStats();

  realtimeState.tickTimer = setInterval(async () => {
    updateRealtimeStats();
    if (Date.now() >= realtimeState.endsAtMs) {
      await stopRealtimeTest(true);
    }
  }, 1000);

  realtimeState.voiceTimer = setInterval(() => {
    sendRealtimeVoiceSession();
  }, 60000);
}

dom.seedBtn.addEventListener("click", () => seedDemoData());
dom.seedLongBtn.addEventListener("click", () => seedLongitudinalData());
dom.startRealtimeBtn.addEventListener("click", () => startRealtimeTest());
dom.stopRealtimeBtn.addEventListener("click", () => stopRealtimeTest(false));
dom.refreshBtn.addEventListener("click", () => refreshAnalytics());
dom.resetBtn.addEventListener("click", () => resetUserData());

setRealtimeUi();
updateRealtimeStats();
refreshAnalytics();
