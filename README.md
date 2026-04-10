# Trace

Trace is a privacy-first platform for detecting subtle **behavioral drift over time** from two signals:

- keystroke cadence (dwell and flight timing)
- prompted weekly voice features (MFCC, jitter, shimmer proxies)

The goal is not one-shot classification. The goal is **longitudinal trend detection**.

## Why Trace

Most digital health prototypes overfit to single snapshots. Trace is built around a different idea:

- baseline each user against their own historical rhythm
- detect persistent movement, not noisy one-day spikes
- show explainable trend signals with uncertainty

## What Exists In This Repo

- Ingestion API for events and sessions
- Scoring service for drift computations
- Feature pipeline stubs and model training stubs
- Dashboard web app scaffold
- Data schemas and architecture/privacy docs

## Quickstart (Local MVP)

### 1) Set up Python

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2) Run APIs

```powershell
# Terminal 1
cd services/ingestion-api
uvicorn main:app --reload --port 8010
```

```powershell
# Terminal 2
cd services/scoring-service
uvicorn main:app --reload --port 8020
```

Optional helper:

```powershell
./scripts/start_local.ps1
```

### 3) Open Dashboard

Open `apps/dashboard-web/index.html` directly in your browser.

## First API Calls

### Ingest a keystroke event

```bash
curl -X POST http://localhost:8010/v1/keystroke/events \
  -H "Content-Type: application/json" \
  -d '{
    "user_id_hash":"demo_user_001",
    "session_id":"session_abc12345",
    "timestamp_ms":1740000000000,
    "dwell_ms":114.2,
    "flight_ms_prev":87.6
  }'
```

### Compute drift

```bash
curl -X POST http://localhost:8020/v1/drift \
  -H "Content-Type: application/json" \
  -d '{"value":0.41,"baseline_mean":0.22,"baseline_std":0.08}'
```

## Product Direction

### Phase 1: Keystroke Cadence Engine

Goal: learn personal cadence baselines and flag meaningful deviation.

Capture:
- key down and key up timestamps
- derived dwell and flight values

Never capture:
- actual key values
- clipboard data
- app content

Output:
- daily cadence stability index
- weekly drift score

### Phase 2: Voice Stability Analysis

Goal: track repeated prompt-based voice stability patterns.

Features include:
- MFCC + deltas
- jitter and shimmer statistics
- spectral and contour statistics

Output:
- voice stability index
- per-feature trend markers

### Phase 3: Longitudinal Fusion Dashboard

Goal: separate temporary variance from persistent trend shift.

Dashboard targets:
- per-modality trend lines
- confidence envelopes
- change-point markers
- combined risk trajectory with attribution

## Architecture Snapshot

- Clients: desktop collector, mobile recorder, dashboard
- Services: ingestion API, feature pipeline, scoring service
- ML: baseline, drift, and fusion models
- Data: schema-driven event storage + aggregate views

See:
- `docs/architecture.md`
- `docs/privacy-and-consent.md`

## Principles

- Privacy by design
- Longitudinal-first analytics
- Modular modality-specific components
- Explainable scoring outputs

## Success Criteria (MVP)

- reliable ingestion for cadence and voice events
- baseline stabilization in first 2-4 weeks
- practical sensitivity without alert fatigue
- trend communication that is understandable and actionable

## Repository Layout

```text
apps/
  collector-desktop/
  dashboard-web/
  recorder-mobile/
data/
  schemas/
docs/
  architecture.md
  privacy-and-consent.md
ml/
  fusion/
  keystroke/
  voice/
scripts/
  start_local.ps1
services/
  feature-pipeline/
  ingestion-api/
  scoring-service/
```

## Disclaimer

Trace is a non-diagnostic trend-monitoring system. Concerning trends should be reviewed with a qualified clinician.
