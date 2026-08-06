---
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
title: Shofar Trainer PWA
date: 2026-08-06
deepened: null
origin: prior conversation — personal halachic shofar practice tool
---

## Goal Capsule

Build a **local-only** Progressive Web App in `~/work/shofar-trainer` that coaches the Rosh Hashana shofar seder and analyzes microphone recordings to verify blast timing against simplified halachic rules. Target V2 scope (calibration, ratio checks, teruah/shevarim analysis, session history) with selected V3 features (waveform visualization, full practice run-through). **No remote git, no PRs, no Torq repos.**

**Authority:** User constraints (local personal project) > halachic simplified rules encoded as configurable thresholds > implementation convenience.

**Stop conditions:** All Definition of Done items pass locally; no push/PR.

## Product Contract

### Summary

A laptop-friendly PWA for indoor shofar practice. Walks the user through the blast seder, records audio, segments blasts, and scores timing against halachic ratios (especially Tekiah = middle section). Includes calibration from a reference teruah blast and session history for progress tracking.

### Problem Frame

Blowing shofar for Rosh Hashana requires correct sequence and precise relative durations (Tekiah equals Shevarim/Teruah/Shevarim-Teruah; minimum teruah count; three shevarim notes). Self-practice lacks objective feedback. A microphone-based trainer closes that gap for personal prep.

### Requirements

| ID | Requirement |
|----|-------------|
| R-1 | PWA installable/served locally; works in modern browsers with microphone permission |
| R-2 | Display Rosh Hashana practice seder (T-S-T ×3, T-Sh-T ×3, T-T ×3, Tekiah Gedolah) with current step highlighted |
| R-3 | Voice/text callouts for each expected blast type |
| R-4 | Record audio during a practice set; visualize waveform with labeled segments |
| R-5 | Calibration: user blows one teruah-length blast to establish the **unit** duration |
| R-6 | Onset detection segments sustained vs staccato blasts from recording |
| R-7 | Classify segments as tekiah, shevarim (3 tones), teruah (≥9 blasts), or shevarim-teruah |
| R-8 | Verify Tekiah duration ≈ middle section (±15% tolerance, configurable) |
| R-9 | Verify shevarim has 3 notes; each note ≥ 2.5 units (configurable) |
| R-10 | Verify teruah has ≥ 9 blasts within expected duration |
| R-11 | Per-step pass/fail feedback with specific messages |
| R-12 | Session history stored in localStorage (date, scores, notes) |
| R-13 | Full practice mode: run entire seder sequentially with record/analyze per set |
| R-14 | README with halachic notes, architecture, and extension guide |
| R-15 | Unit tests for audio analysis pure functions; integration smoke test |

### Scope Boundaries

**In scope:** Indoor laptop use, simplified Ashkenazi practice seder, relative timing rules, local storage.

**Out of scope:** Outdoor noise robustness, posek-grade psak, multi-minhag profiles, cloud sync, mobile native app, pitch/tone quality scoring.

### Acceptance Examples

- **When** user completes calibration with a 0.15s teruah blast, **then** tekiah minimum threshold uses 9×0.15s reference for standalone tekiah guidance.
- **When** user records T-Sh-T and tekiah is 0.9s with shevarim 0.85s, **then** ratio check passes.
- **When** shevarim has only 2 detected notes, **then** feedback says "Expected 3 shevarim notes, detected 2".

## Planning Contract

### Key Technical Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| KTD-1 | Vite + TypeScript, no React | Fast POC, small bundle, PWA-friendly |
| KTD-2 | Web Audio API + AnalyserNode for capture | Standard browser mic access |
| KTD-3 | Energy-threshold onset detection on RMS envelope | Simple, testable, adequate for indoor |
| KTD-4 | Relative units from calibration vs fixed seconds | Matches halachic "as long as middle" |
| KTD-5 | vitest for unit tests | Native Vite integration |
| KTD-6 | vite-plugin-pwa for manifest/service worker | Offline PWA |
| KTD-7 | localStorage for sessions | No backend needed |

### High-Level Technical Design

```
UI (seder state machine) → AudioCapture → Envelope/RMS → OnsetDetector
  → BlastSegmenter → BlastClassifier → HalachaScorer → Feedback UI
  → SessionStore (localStorage)
```

Modules:
- `src/audio/capture.ts` — mic stream, record to Float32Array
- `src/audio/envelope.ts` — RMS smoothing
- `src/audio/onsets.ts` — threshold crossing detection
- `src/audio/classify.ts` — group onsets into tekiah/shevarim/teruah
- `src/halacha/rules.ts` — thresholds, ratio checks
- `src/halacha/seder.ts` — seder sequence definitions
- `src/ui/` — screens: calibrate, practice, history
- `src/store/sessions.ts` — persist results

### Assumptions

- User blows one set at a time into laptop mic at ~1m distance
- Shofar fundamental frequency ~200–800 Hz; band-pass optional later
- ±15% ratio tolerance acceptable for training feedback

## Implementation Units

### U1. Project scaffold and PWA shell

**Goal:** Runnable Vite TS app with PWA manifest, basic layout, dev/build scripts.

**Requirements:** R-1

**Files:** `package.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/style.css`, `public/manifest.webmanifest`, `README.md`

**Test Scenarios:**
- `npm run build` succeeds
- `npm test` runs (empty suite initially)

### U2. Halacha rules and seder definitions

**Goal:** Pure functions for seder steps and scoring rules.

**Requirements:** R-2, R-8, R-9, R-10

**Files:** `src/halacha/seder.ts`, `src/halacha/rules.ts`, `src/halacha/types.ts`, `src/halacha/rules.test.ts`

**Test Scenarios:**
- Ratio pass when tekiah within tolerance of middle
- Fail when tekiah too short
- Shevarim note count validation
- Teruah minimum blast count

### U3. Audio analysis pipeline

**Goal:** Record, envelope, detect onsets, segment blasts.

**Requirements:** R-4, R-6, R-7

**Files:** `src/audio/capture.ts`, `src/audio/envelope.ts`, `src/audio/onsets.ts`, `src/audio/segment.ts`, `src/audio/envelope.test.ts`, `src/audio/onsets.test.ts`

**Test Scenarios:**
- Synthetic sine bursts produce expected onset count
- Envelope peaks align with known signal boundaries

### U4. Blast classification

**Goal:** Classify segment groups as tekiah/shevarim/teruah from timing patterns.

**Requirements:** R-7

**Files:** `src/audio/classify.ts`, `src/audio/classify.test.ts`

**Test Scenarios:**
- 3 medium + gaps → shevarim
- 9+ short blasts → teruah
- 1 long → tekiah

### U5. Calibration flow

**Goal:** UI to capture reference teruah unit.

**Requirements:** R-5

**Files:** `src/ui/calibrate.ts`, updates to `src/main.ts`

**Test Scenarios:**
- Calibration stores unit in localStorage
- Scoring uses stored unit

### U6. Practice coach UI

**Goal:** Seder display, callouts, record/analyze per step, feedback.

**Requirements:** R-2, R-3, R-11, R-13

**Files:** `src/ui/practice.ts`, `src/ui/components.ts`, `src/ui/feedback.ts`

**Test Scenarios:**
- State advances through full seder
- Analysis results render pass/fail

### U7. Waveform visualization

**Goal:** Canvas waveform with colored segment overlays.

**Requirements:** R-4

**Files:** `src/ui/waveform.ts`

**Test Scenarios:**
- Waveform renders without error for sample buffer

### U8. Session history

**Goal:** Save and list past practice sessions.

**Requirements:** R-12

**Files:** `src/store/sessions.ts`, `src/ui/history.ts`, `src/store/sessions.test.ts`

**Test Scenarios:**
- Save/load roundtrip
- List sorted by date

### U9. Documentation and verification

**Goal:** README, halacha notes, run all tests.

**Requirements:** R-14, R-15

**Files:** `README.md`, `docs/HALACHA.md`, `docs/ARCHITECTURE.md`

## Verification Contract

```bash
cd /Users/zacharyleighton/work/shofar-trainer
npm install
npm test
npm run build
npm run preview  # manual smoke: mic permission, calibrate, one practice set
```

Quality gates:
- All vitest tests pass
- Production build succeeds
- No TypeScript errors

## Definition of Done

- [ ] PWA builds and runs via `npm run dev`
- [ ] Calibration establishes teruah unit
- [ ] Full practice seder walkthrough with recording and scoring
- [ ] Tekiah/middle ratio check works on synthetic and live audio
- [ ] Session history persists across reload
- [ ] README + HALACHA + ARCHITECTURE docs present
- [ ] Unit tests cover rules, envelope, onsets, classify, sessions
- [ ] Local git commit on `main`; no remote push
