# Trace

Trace is a privacy-first longitudinal biomarker platform for early motor and voice pattern drift detection.

This project combines:
- Keystroke cadence biomarkers (dwell and flight timing)
- Weekly voice biomarkers (MFCC, jitter, shimmer, tremor proxies)
- Time-series trend analysis over months (not one-off classification)

## Quickstart (Local MVP)

1. Create and activate a Python environment.
2. Install dependencies.
3. Run ingestion and scoring APIs.
4. Open dashboard in browser.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Terminal 1
cd services/ingestion-api
uvicorn main:app --reload --port 8010

# Terminal 2
cd services/scoring-service
uvicorn main:app --reload --port 8020
```

Open `apps/dashboard-web/index.html` directly in your browser.

Optional helper script:

```powershell
./scripts/start_local.ps1
```

## First API Calls

Post keystroke timing event:

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

Score drift:

```bash
curl -X POST http://localhost:8020/v1/drift \
  -H "Content-Type: application/json" \
  -d '{"value":0.41,"baseline_mean":0.22,"baseline_std":0.08}'
```

## Vision

Build a clinically informed, non-diagnostic system that tracks subtle behavioral rhythm changes over time. The MVP objective is **risk trend detection**, not diagnosis.

## Core Principles

- Privacy by design: collect timing and acoustic features, not typed text content.
- Longitudinal first: detect persistent trend shifts, not isolated bad days.
- Modular architecture: each modality can evolve independently.
- Explainability: show users interpretable trend lines and confidence bands.

## MVP Phases

### Phase 1: Keystroke Cadence Engine

Goal: establish per-user baseline rhythm and detect statistically significant deviations.

Capture:
- Key down timestamp
- Key up timestamp
- Derived dwell time
- Inter-key flight time

Do not capture:
- Actual key values
- Clipboard data
- App content

Model candidates:
- Baseline: robust statistical anomaly score (rolling z-score + EWMA)
- ML: 1D CNN or sequence model over timing windows

Output:
- Daily cadence stability index
- Weekly drift score

### Phase 2: Micro-Tremor Voice Analysis

Goal: detect subtle vocal instability trends over repeated, standardized prompts.

Capture protocol:
- Prompted sentence read
- Sustained vowel (e.g., "Ah") for 5 seconds
- Weekly cadence (same microphone if possible)

Features:
- MFCC and deltas
- Jitter (F0 instability)
- Shimmer (amplitude instability)
- Harmonics-to-noise ratio proxies
- Spectral/energy contour statistics

Model candidates:
- Baseline: feature-level drift and control-chart monitoring
- ML: classifier/regressor over extracted feature vectors

Output:
- Voice stability index
- Biomarker-specific trend indicators

### Phase 3: Longitudinal Dashboard

Goal: separate normal variance from persistent decline.

Dashboard should include:
- Per-modality trend lines over weeks/months
- Confidence intervals and variance envelopes
- Change-point markers
- Combined risk trajectory score
- Explainable factor breakdown (which biomarker changed most)

## Suggested System Architecture

- Clients:
  - Desktop collector (keystroke timing only)
  - Mobile recorder (prompted voice tasks)
  - Web dashboard (longitudinal visualization)
- API layer:
  - Ingestion API
  - Feature extraction jobs
  - Scoring service
- Data layer:
  - Time-series feature store
  - Aggregation tables for dashboard
- ML layer:
  - Personal baseline service
  - Drift detection service
  - Ensemble trend scoring

## Privacy, Ethics, and Safety

- Explicit informed consent before collection.
- End-to-end encryption in transit and at rest.
- Local pre-processing where possible.
- Data minimization and retention controls.
- No medical diagnosis claims in-app.
- Clear recommendation language: "consider clinical follow-up" instead of "you have X".

## MVP Success Criteria

- Reliable daily feature ingestion from both modalities.
- Stable personalized baseline established within first 2-4 weeks.
- Drift detector sensitivity tuned to minimize false positives.
- Dashboard clearly communicates trend vs day-to-day noise.

## Near-Term Build Plan (8-10 Weeks)

1. Foundation (Week 1-2)
- Define schemas and event contracts.
- Implement keystroke timing collector prototype.
- Set up ingestion API and storage.

2. Keystroke MVP (Week 3-4)
- Add cadence feature engineering pipeline.
- Implement baseline anomaly scoring.
- Build first trend chart.

3. Voice MVP (Week 5-7)
- Implement recording workflow and QA checks.
- Build audio feature extraction pipeline.
- Add voice stability scoring.

4. Unified Longitudinal Layer (Week 8-10)
- Add multimodal fusion score.
- Build dashboard with confidence bands and change-point events.
- Validate on retrospective test cohorts.

## Repository Starter Structure

```text
/apps
  /collector-desktop
  /recorder-mobile
  /dashboard-web
/services
  /ingestion-api
  /feature-pipeline
  /scoring-service
/ml
  /keystroke
  /voice
  /fusion
/data
  /schemas
  /sample
/docs
  architecture.md
  privacy-and-consent.md
```

## Disclaimer

Trace is an assistive trend-monitoring tool and is not a medical diagnostic device. Any concerning trend should be reviewed with a qualified clinician.
