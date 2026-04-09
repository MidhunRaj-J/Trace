# Trace Architecture Blueprint (MVP)

## 1. Product Scope

### In Scope (MVP)
- Keystroke timing ingestion and cadence scoring
- Weekly prompted voice capture and feature extraction
- Longitudinal analytics and risk trend visualization

### Out of Scope (MVP)
- Passive ambient audio capture
- Diagnostic claims and treatment recommendations
- User identity verification via biometrics

## 2. High-Level Data Flow

1. Client captures raw signal events.
2. Client strips sensitive payloads and sends privacy-safe event objects.
3. Ingestion API validates, versions, and stores events.
4. Feature pipeline computes daily/weekly biomarker features.
5. Baseline service updates per-user expected distributions.
6. Drift service computes modality drift and confidence.
7. Fusion service computes longitudinal composite score.
8. Dashboard queries aggregates and renders trends.

## 3. Components

### Desktop Keystroke Collector
Responsibilities:
- Capture keydown/keyup timestamps.
- Compute dwell/flight values client-side when possible.
- Batch and upload encrypted payloads.

Event schema (example):
- user_id_hash
- session_id
- t_key_down_ms
- t_key_up_ms
- dwell_ms
- flight_ms_prev
- device_metadata (coarse)

### Mobile Voice Recorder
Responsibilities:
- Guide standardized prompt workflow.
- Enforce sampling rate and duration checks.
- Upload encrypted audio segment + metadata.

Session schema (example):
- user_id_hash
- prompt_id
- sample_rate_hz
- duration_s
- environment_quality_score
- audio_blob_uri

### Ingestion API
Responsibilities:
- AuthN/AuthZ and consent state validation.
- Schema validation and event versioning.
- Durable write to raw and curated stores.

### Feature Pipeline
Keystroke features:
- median dwell, IQR dwell
- median flight, IQR flight
- burst consistency metrics
- circadian normalized deltas

Voice features:
- MFCC means/vars and deltas
- jitter/shimmer statistics
- spectral centroid/spread
- voiced/unvoiced ratios

### Scoring Services
Baseline service:
- Learns per-user reference windows.
- Supports cold-start and recalibration.

Drift service:
- Produces modality-level drift probabilities.
- Includes uncertainty and sample-quality penalties.

Fusion service:
- Combines modalities with reliability weighting.
- Produces composite trend score and component attributions.

### Dashboard
Views:
- Daily and weekly biomarker trajectories.
- Rolling baseline and confidence intervals.
- Change-point timeline and event annotations.

## 4. Modeling Strategy

### Stage A (Fast and Robust)
- Statistical process control for each biomarker.
- EWMA/CUSUM for shift detection.
- Change-point detection (e.g., Bayesian online change point).

### Stage B (ML Enhancement)
- Keystroke: 1D CNN over fixed-length timing windows.
- Voice: gradient-boosted model or compact neural model over features.
- Fusion: calibrated meta-model with monotonic constraints.

### Stage C (Personalized Adaptation)
- User-level fine-tuned thresholding.
- Drift confidence gated by data sufficiency and quality.

## 5. Longitudinal Analytics Rules

- Minimum history before risk trend output: 14-28 days.
- Require repeated deviation before escalating status.
- De-weight days with low data volume or poor audio quality.
- Highlight trend slope and persistence, not isolated spikes.

## 6. Privacy and Governance Controls

- Never store typed characters.
- Pseudonymous IDs and key-rotation strategy.
- Purpose-limited retention and deletion workflows.
- Region-aware storage for compliance requirements.
- Auditable model versioning and score provenance.

## 7. Evaluation Framework

Offline metrics:
- Drift detection AUROC/AUPRC
- False alert rate per user-month
- Time-to-detection for synthetic deterioration profiles

Online metrics:
- Recording adherence rate
- Feature extraction success rate
- Alert acknowledgement and follow-up completion

## 8. Technical Risks and Mitigations

Risk: microphone/device heterogeneity
Mitigation: device normalization layer + quality flags

Risk: high inter-day variance
Mitigation: robust stats + seasonal normalization + minimum evidence windows

Risk: false reassurance or alarm
Mitigation: conservative language + confidence display + clinical disclaimer

## 9. Initial Backlog (Execution-Ready)

1. Define event/feature schemas and version contracts.
2. Build local keystroke collector with privacy guardrails.
3. Build ingestion API with consent checks and tests.
4. Implement keystroke feature + baseline scoring pipeline.
5. Build guided voice recording workflow.
6. Implement audio feature extraction (MFCC, jitter, shimmer).
7. Implement drift and fusion scoring endpoints.
8. Build longitudinal dashboard with change-point overlays.
9. Add model registry and reproducible training pipeline.
10. Add governance controls (retention, deletion, audit logs).
