---
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
title: Redo set and hold struggling tekiah - Plan
type: feat
date: 2026-08-16
deepened: null
origin: conversation — redo a set mid-session and on set review; stop auto-advance on an unclear struggling tekiah
product_contract_preservation: "unchanged — new plan"
---

## Goal Capsule

Add a one-tap Redo set control during guided practice, both while a set is in progress and on set review, and stop auto-stop from treating a brief unclear sound or a gap in a struggling tekiah as the end of that blast.

**Authority:** User-directed product (redo mid-set and on review; less-eager tekiah advance) > existing bilingual catalog and vanilla practice mount > implementer auto-stop thresholds.

**Stop conditions:** Units U1–U3 pass their test scenarios and the Verification Contract. Do not change scoring rules, seder order, or callout audio.

**Execution profile:** Test-first for the auto-stop state machine. Practice UI follows existing `mountPractice` patterns; catalog keys are typed.

## Product Contract

### Summary

Guided practice currently has no way to restart a set. Auto-stop ends a tekiah after 80 ms of sound plus 600 ms of silence, so a cracked or unclear opening often advances into shevarim or teruah. This work adds Redo set in the middle of a set and on review, and holds tekiah auto-stop through short noise and struggling gaps.

### Problem Frame

A baal tokea who cracks an opening tekiah cannot restart that set. The detector treats the crack as a finished blast and calls the middle, so the rest of the set is blown against the wrong kol.

### Requirements

| ID | Requirement |
|----|-------------|
| R-1 | Show a Redo set control while a calibration or seder set is in progress, including while a blast is recording. One tap cancels the current blast, discards that set's in-progress blasts and clips, and restarts the same set from the first callout. Do not write a history row for the discarded attempt. |
| R-2 | Show a Redo set control on set review, including the last set before Finish. One tap restarts the same set from the first callout without advancing `setIndex`. The already-scored attempt stays in history. |
| R-3 | Redo does not close the mic, leave the practice view, or skip to the next set. Stop session and Exit keep current meaning. |
| R-4 | Redo set strings live in the typed EN/HE catalogs. No hardcoded English in the practice UI. |
| R-5 | A sound shorter than the tekiah start floor must not start a tekiah auto-stop cycle. |
| R-6 | While a tekiah or tekiah gedolah is below its live duration floor, trailing silence must not end the blast until a long hold-off silence. After the floor is met, a shorter (still longer than today) silence may end it. |
| R-7 | Auto-stop uses on/off hysteresis so a dip that stays above the off threshold does not start trailing silence. Shevarim, teruah, and shevarim-teruah keep their current snappy silence windows so intended note gaps still end the kol. |
| R-8 | Safety max duration from `expectedDurationForType` still ends a blast so recording cannot run unbounded. |

### Actors

- A-1. Practitioner using guided practice with a shofar and one free hand for the phone or laptop.

### Key Flows

- F-1. Mid-set redo: during opening tekiah (or any later blast), tap Redo set. Capture cancels. The same set starts again with the first makrei callout.
- F-2. Review redo: after a scored set, tap Redo set instead of Next set / Finish. The same set starts again. Next set / Finish still advance or complete as today.
- F-3. Struggling tekiah hold: a brief unclear sound, then a gap, then a continued tekiah, stays on that tekiah until a long silence or the safety cap. The middle callout does not play yet.

### Acceptance Examples

- AE-1. During sitting Tashrat blast 1 of 3, Redo set restarts blast 1 of 3. History has no new row until that restarted set completes.
- AE-2. On set review after a failed Tashat, Redo set keeps `setIndex` and starts that Tashat again. The failed row remains in history. Completing the redo writes a second row.
- AE-3. A 100 ms peak above the on-threshold, then silence, does not end a tekiah and does not advance to the middle.
- AE-4. A tekiah that has sounded for 0.4 s (below a 2.16 s Tashrat floor) then goes silent for 700 ms stays in trailing silence and does not resolve. The same blast going silent for 2 s after that short sounding does resolve.
- AE-5. A tekiah that has reached its live floor, then silent for the post-floor silence window, resolves with reason `silence` so the session can continue.

### Scope Boundaries

**In scope:** Practice redo UI, catalog strings, auto-stop hold-off for tekiah / tekiah gedolah, unit tests for the auto-stop reducer, README usage note.

**Deferred:** Per-blast redo (restart only the current kol); hefsek / talking restart as a halachic state machine; outdoor noise / band-pass; changing shevarim or teruah silence windows; undo of a saved history row.

**Outside this product:** Binding pesak about when a cracked tekiah must be repeated.

## Planning Contract

### Key Technical Decisions

- KTD-1. Keep redo orchestration in `src/ui/practice.ts` with a monotonic `setGeneration` counter. Incrementing it cancels the in-flight `waitForBlastEnd`, makes `runCurrentSet` / `runCalibration` return without `saveSession` or review, then starts the same set again. `(session-settled: user-directed — redo mid-set and on review; chosen over a new practice state machine module.)`
- KTD-2. Extract auto-stop tick logic into a pure reducer (`advanceAutoStop` + options) in `src/audio/auto-stop.ts`. `waitForBlastEnd` remains the RAF / Analyser wrapper. Tests drive the reducer with fake timestamps and peaks, not `requestAnimationFrame`. Governs R-5, R-6, R-7, R-8.
- KTD-3. Export `autoStopOptionsForBlast(type, band, silenceMs)` from `src/audio/auto-stop.ts`. For `tekiah` and `tekiah_gedolah` it returns hold-off options: `minSoundMs` 250, `soundOnThreshold` 0.05, `soundOffThreshold` 0.02, `silenceMs` 1100 after the live floor, `earlySilenceMs` 1800, `holdMinSec` = `band.minSec`, plus `maxDurationSec` from the band. Other types pass through `silenceMs` and `maxDurationSec` only. Governs R-5, R-6, R-7. `(assumption — user described premature tekiah advance, not shevarim/teruah hang.)`
- KTD-4. Mid-set Redo is visible while `running` is true. No confirm dialog. Hands are often on the shofar. `(session-settled: user-directed — redo in the middle; chosen over hiding the control until silence.)`
- KTD-5. Do not delete the history row already written when redo starts from review. Mid-set redo never reached `saveSession`. `(assumption — review already scored the attempt; keeping it matches current history semantics.)`

### High-Level Technical Design

```
practice mount
  setGeneration
  requestRedoSet() → generation++ → cancel auto-stop
  runCurrentSet/runCalibration loop exits if generation changed
  then restart same setIndex / calibration from step 0

waitForBlastEnd
  RAF → peakFromTimeDomain → advanceAutoStop(state, now, peak, opts)
  opts from autoStopOptionsForType (tekiah/gedolah get hold-off)

advanceAutoStop (pure)
  waiting_for_sound | sounding | trailing_silence
  start only after minSoundMs at/above on-threshold
  dip above off-threshold stays sounding
  below floor: need earlySilenceMs to resolve
  at/above floor: need silenceMs to resolve
  maxDurationSec always resolves
```

### Assumptions

- Calibration is a set for Redo. Restarting it re-infers `unitSec` only after the restarted calibration finishes.
- Locale toggle stays disabled while a set is in progress, including after Redo until review.
- Existing `abortSession` / Exit path is unchanged. Redo is not abort.
- `SILENCE_MS` for shevarim (650), teruah (450), shevarim_teruah (650) stay as in `src/ui/practice.ts`.

### Risks

- Generation races: Redo during the post-blast 450 ms delay must still discard that blast and not push it into `setBlasts`. Check `setGeneration` after `runGuidedBlast` returns, not only at loop start.
- Raising tekiah silence makes a clean finished tekiah wait ~1.1 s before the next callout. That is the intended trade for not skipping to the middle.
- `earlySilenceMs` 1800 still ends a truly abandoned tekiah so the user is not stuck without tapping Redo.
- `practice.ts` has no DOM test harness. Cover redo generation rules with a small pure helper if the loop conditions are easy to get wrong; otherwise keep tests on the auto-stop reducer and treat Redo as a manual smoke.

### Sources and Research

- `src/ui/practice.ts` — `runCurrentSet`, `runGuidedBlast`, `advanceAfterSet`, `SILENCE_MS`, set-review controls. Redo does not exist. During `running`, only Exit is shown.
- `src/audio/auto-stop.ts` — `minSoundMs` 80, `soundThreshold` 0.035, no hysteresis, silence ends as soon as `silenceMs` elapses. Tests cover only `soundingExclusiveSec`.
- `src/halacha/duration-targets.ts` — `minSec` is the live floor; `safetyAutoStopSec` is the unbounded-recording cap (R-7 from the bilingual plan).
- Prior plan `docs/plans/2026-08-13-001-feat-bilingual-halacha-sources-plan.md` KTD-3: auto-stop is a safety cap, not the shiur. This work must not use auto-stop silence as a scoring maximum.

## Implementation Units

### U1. Auto-stop reducer with tekiah hold-off

**Goal:** Pure auto-stop tick that ignores short noise, holds through tekiah gaps below the live floor, and still stops on post-floor silence or the safety cap.

**Requirements:** R-5, R-6, R-7, R-8

**Files:** `src/audio/auto-stop.ts`, `src/audio/auto-stop.test.ts`

**Approach:** Split state updates out of the RAF loop into `advanceAutoStop`. Add `soundOnThreshold`, `soundOffThreshold`, `earlySilenceMs`, and `holdMinSec` to options. Default options preserve today's non-tekiah behavior. `waitForBlastEnd` maps `soundThreshold` to both on and off when the new fields are omitted. Add `autoStopOptionsForBlast` in the same module so practice does not duplicate thresholds.

**Test scenarios:**

- AE-3: 100 ms above on-threshold then silence does not resolve; `soundStartedAt` stays null until `minSoundMs`.
- A dip from 0.08 to 0.03 while off-threshold is 0.02 does not enter `trailing_silence`.
- AE-4: sounding 0.4 s with `holdMinSec` 2.16 and 700 ms silence does not resolve; 1800 ms silence does, reason `silence`.
- AE-5: sounding at/above `holdMinSec` plus `silenceMs` 1100 resolves `silence`.
- `maxDurationSec` resolves `max_duration` even while still above threshold.
- Defaults with `silenceMs` 450 and `minSoundMs` 80 still resolve a teruah-shaped burst after 450 ms of silence (non-regression).
- `autoStopOptionsForBlast('tekiah', band, 600)` sets `earlySilenceMs` 1800 and `holdMinSec` to `band.minSec`. `autoStopOptionsForBlast('teruah', band, 450)` does not set hold-off (`earlySilenceMs` / `holdMinSec` absent or equal to default no-hold behavior).

**Depends on:** none

### U2. Practice Redo set and tekiah auto-stop wiring

**Goal:** Redo mid-set and on review. Pass hold-off options into auto-stop for tekiah and tekiah gedolah.

**Requirements:** R-1, R-2, R-3, R-4, R-6, R-7

**Files:** `src/ui/practice.ts`, `src/ui/practice-run.ts`, `src/ui/practice-run.test.ts`, `src/i18n/en.ts`, `src/i18n/he.ts`

**Approach:** Add `redoSet` catalog keys. Render Redo set on in-progress sets (even while recording) and on `set_review`. `requestRedoSet` increments `setGeneration`, calls `cancel()`, and restarts `runCalibration` or `runCurrentSet` without changing `setIndex`. After each `runGuidedBlast`, keep the blast only when `shouldCommitBlast({ runId, activeRunId, aborted })` is true. Call `autoStopOptionsForBlast` from U1 instead of inlining thresholds.

**Test scenarios:**

- Typecheck: `he` includes `redoSet` matching `en` (compile-time catalog contract).
- `shouldCommitBlast` is false when `aborted` is true, or when `runId !== activeRunId` (redo during or after a blast).
- `shouldCommitBlast` is true when ids match and not aborted.
- Manual smoke AE-1 and AE-2. No DOM harness in this repo.

**Approach:** Add `redoSet` catalog keys. Render Redo set on in-progress sets (even while recording) and on `set_review`. `requestRedoSet` increments `setGeneration`, calls `cancel()`, and restarts `runCalibration` or `runCurrentSet` without changing `setIndex`. After each `runGuidedBlast`, drop the result if generation changed. Call `autoStopOptionsForBlast` from U1 instead of inlining thresholds.

**Test scenarios:**

- Typecheck: `he` includes `redoSet` matching `en` (compile-time catalog contract).
- Manual smoke AE-1 and AE-2. No DOM harness in this repo.

**Depends on:** U1

### U3. README usage note

**Goal:** Document Redo set and that tekiah auto-stop waits through short cracks.

**Requirements:** R-1, R-2, R-6

**Files:** `README.md`

**Approach:** Add two sentences under Usage / Practice. Do not present auto-stop timing as pesak.

**Test scenarios:** none automated.

**Depends on:** U2 for the control name to match the UI string

## Verification Contract

```bash
npm test
npm run build
```

Manual smoke:

1. Start guided session. During opening calibration tekiah, tap Redo set. Confirm the first callout plays again and no history row appears until the set completes.
2. Finish one seder set. On review, tap Redo set. Confirm the same set restarts and history still has the first row.
3. Blow a cracked short tekiah, pause under 1 s, then continue. Confirm the middle callout does not play yet.
4. Blow a full-length tekiah and stop. Confirm the next callout arrives after about one second of silence.

Quality gates: vitest pass, `tsc` clean, no user-facing English outside catalogs except existing Latin canvas abbreviations.

## Definition of Done

- [ ] Redo set is available mid-set (including while recording) and on set review, including the last set
- [ ] Mid-set redo does not write history; review redo does not drop the prior row or advance the seder
- [ ] Tekiah auto-stop tests cover AE-3, AE-4, AE-5 and teruah non-regression
- [ ] `npm test` and `npm run build` pass
- [ ] README names Redo set
- [ ] Abandoned experimental practice modules are not left in the tree
