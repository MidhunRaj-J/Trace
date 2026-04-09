/*
  Browser-side timing collector example.
  Captures only timing metrics; never records actual typed characters.
*/

const buffer = [];
let lastKeyUp = null;
const endpoint = "http://localhost:8010/v1/keystroke/events";
const userIdHash = "demo_user_001";
const sessionId = `session_${Date.now()}`;

window.addEventListener("keydown", (event) => {
  event.target.dataset.traceDownTs = String(performance.now());
});

window.addEventListener("keyup", async (event) => {
  const keyDownTs = Number(event.target.dataset.traceDownTs || performance.now());
  const keyUpTs = performance.now();
  const dwell = Math.max(0, keyUpTs - keyDownTs);
  const flight = lastKeyUp === null ? 0 : Math.max(0, keyDownTs - lastKeyUp);
  lastKeyUp = keyUpTs;

  buffer.push({
    user_id_hash: userIdHash,
    session_id: sessionId,
    timestamp_ms: Date.now(),
    dwell_ms: dwell,
    flight_ms_prev: flight,
    device_metadata: {
      platform: navigator.platform,
      user_agent_hint: navigator.userAgent.slice(0, 32),
    },
  });

  if (buffer.length >= 20) {
    const batch = buffer.splice(0, buffer.length);
    for (const item of batch) {
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
    }
  }
});
