# Architecture

## Overview

```
Browser UI (vanilla TS)
  ├── Calibrate → analyzeCalibration → setUnitDuration
  ├── Practice  → AudioRecorder → analyzeRecording → scoreRecording
  └── History   → localStorage sessions

Audio pipeline
  Float32Array samples
    → computeEnvelope (RMS)
    → normalizeEnvelope + smoothEnvelope
    → detectOnsets / mergeCloseSegments
    → buildClassifiedFromSetPattern
    → scoreRecording (halacha rules)
```

## Module layout

| Path | Responsibility |
|------|----------------|
| `src/halacha/types.ts` | Shared types and default config |
| `src/halacha/seder.ts` | Seder steps and set groups |
| `src/halacha/rules.ts` | Scoring and pattern assembly |
| `src/audio/capture.ts` | Mic recording, synthetic test signals |
| `src/audio/envelope.ts` | RMS envelope |
| `src/audio/onsets.ts` | Threshold-based segmentation |
| `src/audio/classify.ts` | Single-blast classification heuristics |
| `src/audio/analyze.ts` | End-to-end analyze entry points |
| `src/store/sessions.ts` | localStorage persistence |
| `src/ui/*` | Screens and waveform rendering |

## Design decisions

### Relative units (calibration)

Absolute seconds vary by baal tokea, shofar, and room. Halacha cares about **ratios**. Calibration stores one teruah-unit in `localStorage` and scales all minimum checks.

### Set-level recording

Each practice **set** (e.g. full T–Sh–T) is one recording. This matches how one blows in musaf and gives the analyzer full context for tekiah-vs-middle comparison.

### Onset detection (not ML)

V1–V3 uses energy-threshold onset detection on a smoothed RMS envelope. It is testable, offline, and sufficient for indoor laptop use. Future versions could add band-pass filtering (~200–800 Hz) or lightweight ML.

### PWA

`vite-plugin-pwa` provides manifest and service worker for offline use after first load.

## Testing strategy

- **Unit tests** — Pure functions: envelope, onsets, classify, rules, sessions.
- **Synthetic audio** — `generateTestSignal` creates sine bursts for onset tests without a mic.
- **Manual smoke** — Calibrate + record one set in browser with real shofar.

## Extension points

1. **`DEFAULT_HALACHA_CONFIG`** — Tune tolerances and minimums.
2. **`detectOnsets` options** — Threshold, min blast/gap ms for different rooms.
3. **`SET_GROUPS`** — Add full 100-blast run or custom sedarim.
4. **Band-pass** — Add FFT or biquad filter before envelope in `analyze.ts`.

## Build toolchain

- Vite 6 + TypeScript
- Vitest for tests
- No backend; all data in browser localStorage
