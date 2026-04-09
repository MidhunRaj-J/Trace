# Desktop Keystroke Collector (Starter)

This folder contains a privacy-safe collector example.

## What it does
- Captures key press/release timing only.
- Derives dwell and flight times.
- Sends timing events to ingestion API.

## What it does NOT do
- Does not capture characters or words.
- Does not read clipboard or app content.

## Quick test
1. Open any page with a text field.
2. Paste `collector.js` into browser devtools console.
3. Type in the field to generate timing events.
4. Check ingestion summary endpoint.
