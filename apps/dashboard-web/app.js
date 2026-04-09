async function loadSummary() {
  const user = "demo_user_001";
  const summaryNode = document.getElementById("summary");

  try {
    const resp = await fetch(`http://localhost:8010/v1/users/${user}/summary`);
    const data = await resp.json();
    summaryNode.textContent = JSON.stringify(data, null, 2);
  } catch {
    summaryNode.textContent = "Ingestion API not running yet.";
  }
}

function drawMockTrend() {
  const canvas = document.getElementById("trendCanvas");
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = "#ddd2bd";
  for (let i = 0; i < 6; i += 1) {
    const y = 20 + i * 40;
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(width - 20, y);
    ctx.stroke();
  }

  const keystroke = [0.12, 0.18, 0.2, 0.24, 0.28, 0.27, 0.33, 0.36, 0.38, 0.4];
  const voice = [0.08, 0.09, 0.11, 0.1, 0.14, 0.16, 0.17, 0.2, 0.23, 0.26];

  plotSeries(ctx, keystroke, "#2f6a53", width, height);
  plotSeries(ctx, voice, "#b8612f", width, height);

  const latestComposite = (keystroke[keystroke.length - 1] * 0.6) + (voice[voice.length - 1] * 0.4);
  document.getElementById("riskCard").textContent = `Composite risk: ${latestComposite.toFixed(2)}`;
}

function plotSeries(ctx, values, color, width, height) {
  const left = 24;
  const right = width - 24;
  const top = 20;
  const bottom = height - 20;
  const xStep = (right - left) / (values.length - 1);

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();

  values.forEach((v, i) => {
    const x = left + i * xStep;
    const y = bottom - v * (bottom - top);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();
}

loadSummary();
drawMockTrend();
