const dom = {
  userId: document.getElementById("userId"),
  ingestionUrl: document.getElementById("ingestionUrl"),
  scoringUrl: document.getElementById("scoringUrl"),
  baselineWindow: document.getElementById("baselineWindow"),
  seedBtn: document.getElementById("seedBtn"),
  refreshBtn: document.getElementById("refreshBtn"),
  resetBtn: document.getElementById("resetBtn"),
  summary: document.getElementById("summary"),
  status: document.getElementById("status"),
  latestSignals: document.getElementById("latestSignals"),
  compositeRisk: document.getElementById("compositeRisk"),
  trendDirection: document.getElementById("trendDirection"),
  canvas: document.getElementById("trendCanvas"),
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

async function seedDemoData() {
  const cfg = getConfig();
  if (cfg.userId.length < 8) {
    setStatus("User ID hash must be at least 8 characters.");
    return;
  }

  setStatus("Generating and uploading demo month...");
  const points = buildDemoMonth(30);

  await apiJson(`${cfg.ingestionUrl}/v1/users/${cfg.userId}`, { method: "DELETE" });

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

  setStatus(`Uploaded ${points.length} keystroke events and ${points.length} voice sessions.`);
  await refreshAnalytics();
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

function compositeSeries(keyRisks, voiceRisks, voiceQualitySeries) {
  const len = Math.min(keyRisks.length, voiceRisks.length);
  const out = [];
  for (let i = 0; i < len; i += 1) {
    const voiceWeight = 0.5 * Math.max(0, Math.min(1, voiceQualitySeries[i] ?? 1));
    const keyWeight = 1 - voiceWeight;
    out.push((keyRisks[i] * keyWeight) + (voiceRisks[i] * voiceWeight));
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

    if (!keySeries.length || !voiceSeries.length) {
      dom.latestSignals.innerHTML = "No events yet. Click Generate Demo Month.";
      dom.compositeRisk.textContent = "--";
      dom.trendDirection.textContent = "--";
      drawTrendChart([], [], []);
      setStatus("No data found for this user.");
      return;
    }

    const [keyTrend, voiceTrend] = await Promise.all([
      scoreSeries(keySeries),
      scoreSeries(voiceSeries),
    ]);

    const keyRisk = keyTrend.points.map((p) => p.risk);
    const voiceRisk = voiceTrend.points.map((p) => p.risk);
    const composite = compositeSeries(keyRisk, voiceRisk, voiceQualitySeries);

    drawTrendChart(keyRisk, voiceRisk, composite);

    const latestKey = keyTrend.points[keyTrend.points.length - 1] || {};
    const latestVoice = voiceTrend.points[voiceTrend.points.length - 1] || {};
    const latestComposite = composite[composite.length - 1];

    dom.compositeRisk.textContent = toFixedSafe(latestComposite, 3);
    dom.trendDirection.textContent = trendLabel(composite);
    dom.latestSignals.innerHTML = [
      `<div class="signal-item"><span>Keystroke z-score</span><strong>${toFixedSafe(latestKey.z_score, 2)}</strong></div>`,
      `<div class="signal-item"><span>Keystroke risk</span><strong>${toFixedSafe(latestKey.risk, 3)}</strong></div>`,
      `<div class="signal-item"><span>Voice z-score</span><strong>${toFixedSafe(latestVoice.z_score, 2)}</strong></div>`,
      `<div class="signal-item"><span>Voice risk</span><strong>${toFixedSafe(latestVoice.risk, 3)}</strong></div>`,
    ].join("");

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

dom.seedBtn.addEventListener("click", () => seedDemoData());
dom.refreshBtn.addEventListener("click", () => refreshAnalytics());
dom.resetBtn.addEventListener("click", () => resetUserData());

refreshAnalytics();
