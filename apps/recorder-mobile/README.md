# Mobile Voice Recorder (Starter Spec)

This MVP starter documents a consistent weekly protocol.

## Weekly protocol
1. Read fixed sentence prompt once.
2. Sustain vowel "Ah" for 5 seconds.
3. Auto-check audio quality and noise floor.
4. Upload metadata + feature series.

## Minimal payload shape
- `user_id_hash`
- `prompt_id`
- `recorded_at_ms`
- `sample_rate_hz`
- `duration_s`
- `f0_series_hz`
- `rms_series`
- `environment_quality_score`

## Suggested implementation
- React Native + Expo AV for recording.
- On-device preprocessing for f0/rms series.
- Upload only required artifacts for MVP scoring.
