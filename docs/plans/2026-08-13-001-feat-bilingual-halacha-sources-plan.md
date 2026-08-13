---
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
title: Bilingual halacha-accurate shofar trainer and sources page
date: 2026-08-13
deepened: null
origin: conversation — align scoring with reviewed poskim; bilingual EN/HE; in-app sources
product_contract_preservation: "changed: R-1 remount idle-only; R-2 catalog carve-outs; R-5 max(floor, middle band) + 0.15; R-6 shever error; R-7 live too-long shevarim-only; R-8 encoded vs study + layout; R-9 disclaimer on set-review/history; R-10 skip English TTS in he; R-11 previous scoring label — 2026-08-13 doc review"
---

## Goal Capsule

Make the local Shofar Trainer PWA score blasts against Mishnah Berurah lechatchila training rules (each tekiah vs that set’s middle; Tashrat ≥ 18 terumatin; Tashat/Tarat ≥ 9; shever shorter than 9 units), show those sources in the app in Hebrew and English, and make every user-visible string bilingual. Keep the product a training aid. A rav must still give pesak.

**Authority:** User-directed product decisions (training not pesak; in-app sources; full EN/HE) > reviewed poskim as encoded training rules > existing simplified workshop checks.

**Stop conditions:** Units U1–U6 pass their test scenarios and the Verification Contract locally. No remote push or PR unless a git remote exists. Do not present the app as a ruling.

## Product Contract

### Summary

The app today averages the two tekiahs, coaches every sound toward 5–10 seconds, and is English-only. This work replaces those checks with per-tekiah, pattern-aware unit lengths, adds a Sources screen with Hebrew original plus English, and localizes the whole UI including speech callouts.

### Problem Frame

A baal tokea who trains on the current meter can pass a short opening tekiah, stretch shevarim toward tekiah length, and never see the texts the checks claim to follow. Hebrew speakers cannot use the UI.

### Requirements

| ID | Requirement |
|----|-------------|
| R-1 | Persist locale `en` or `he`. Put a two-option header control (EN \| עברית) on every screen. Set `document.documentElement.lang` and `dir`. Remount idle views on change. Disable the toggle while calibration or practice is recording; remount after idle, set_review, or done. |
| R-2 | Every user-visible string, speech callout, live-timing line, scoring issue, history row, in-app confirm, and `document.title` comes from typed EN/HE catalogs. Exclude: citation `hebrew`/`english`/`heRef`/`enRef` in `sources.ts`; Latin blast abbreviations, `REC`, and numeric elapsed/target on canvas; legacy session `message`; install-time PWA manifest name/short_name/description. |
| R-3 | Scoring and live timing return a stable `code` plus numeric params. The UI formats with `Intl` for the active locale. Do not store English sentences as the only issue text. |
| R-4 | For each set, score the opening tekiah and the closing tekiah each against that set’s middle duration. A short first tekiah and a long last tekiah must not pass because the average is ~100%. |
| R-5 | Live and scored floors use the calibrated teruah unit: Tashrat tekiah ≥ 18 units; Tashat and Tarat tekiah ≥ 9 units; shevarim total ~9 units; teruah ≥ 9 notes lechatchila. Unit floors always apply, including when middle is missing or ≤ 0. When measured middle > 0, each tekiah minimum is `max(unitFloor, middle × 0.85)`. Tolerance is 0.15. |
| R-6 | A shever that lasts ≥ 9 units fails as a possible tekiah (`error`, code `shever_too_long`); 9 units is the Tashat/Tarat tekiah floor, not the Tashrat 18-unit floor. Prefer three shevarim notes. Extra notes warn, matching MB lechatchila rather than SA 590:3 leniency. |
| R-7 | Tekiah and teruah have no hard maximum. Longer than the floor is not an error. Live `too_long` applies only to shevarim. A tekiah or teruah at or above the floor stays live `good`. Auto-stop is a generous safety cap, not the unit-floor shiur. |
| R-8 | Sources screen lists the reviewed texts with Hebrew, English, outbound links, and an encoded-versus-study mark. Always show both languages, stacked: Hebrew block (`lang=he`, `dir=rtl`), then English (`lang=en`, `dir=ltr`), then links. Page chrome follows R-2. |
| R-9 | Home, Sources, set-review pass/fail, and History (when a result is shown) show a clear training-not-pesak disclaimer in the active locale. |
| R-10 | SpeechSynthesis sets `lang` (`en-US` / `he-IL`) and a matching voice when one exists. When locale is `he` and no `he-IL` voice exists, do not speak English callouts. Keep Hebrew on-screen makrei and show a one-time notice that spoken Hebrew needs a Hebrew system voice. |
| R-11 | History formats dates and ratios with the active locale. Old sessions that stored English `message` still display; new sessions store `code` and params. Sessions stored before this scoring change are labeled as previous average-ratio checks, not as proof of the new per-tekiah rules. |

### Actors

- A-1. Practitioner using the PWA for Elul / Rosh Hashana practice.

### Key Flows

- F-1. Toggle language on home (idle). All later screens and callouts follow the new locale and `dir`.
- F-2. Guided set: makrei callout in the locale (on-screen always; speech only when a matching voice exists), live length from unit × pattern as a minimum, set review with per-tekiah results and disclaimer.
- F-3. Open Sources, read Hebrew and English for SA 590 / MB 590 / Rambam 3 / AHS 590 / Peninei Halakha / Mishnah RH 4:9 / RH 33b–34a, follow a link, see which texts are encoded vs study-only.

### Acceptance Examples

- AE-1. When opening tekiah is 0.5× middle and closing tekiah is 1.5× middle, the set fails with an opening-tekiah-too-short issue even if the average ratio is 100%.
- AE-2. When locale is `he`, home title, nav, disclaimer, and Sources headings are Hebrew and `html[dir=rtl]`.
- AE-3. When unit is 0.12 s, Tashrat live tekiah **min** is about 2.16 s (18 units), not 7 s. Status becomes `good` at that floor and stays `good` if the blast continues.
- AE-4. When a shever lasts ≥ 9 units, scoring reports `shever_too_long` as `error` and the set does not pass.

### Key Decisions

- KD-1. Training guidance, not pesak. Governs R-9. `(session-settled: user-directed — chosen over shipping as a ruling: the user required a rav to validate.)`
- KD-2. In-app Sources page with the reviewed corpus. Governs R-8. `(session-settled: user-directed — chosen over leaving sources only in chat or docs.)`
- KD-3. Entire app including sources is bilingual EN/HE. Governs R-1, R-2, R-10. `(session-settled: user-directed — chosen over English-only UI.)`
- KD-4. Scoring follows the reviewed poskim as MB lechatchila training rules (each tekiah vs middle; 18/9 terumatin; shever ≠ tekiah). Governs R-4, R-5, R-6, R-7. `(session-settled: user-directed — chosen over keeping average-ratio and the 5–10 s meter as the shiur.)`

### Scope Boundaries

**In scope:** Locale catalogs, RTL logical CSS, speech lang, per-tekiah scoring, unit-based live targets, shever cap, Sources screen, `docs/HALACHA.md` and README in Simplified Technical English describing the bilingual app, tests for new scoring and catalogs.

**Deferred:** Sephardi one-breath tashrat; 100 musaf blasts; Rambam half-length tekiah profile; Yemenite wavering teruah; hefsek restart state machine; shofar kashrut (OC 585–589); outdoor noise; i18n frameworks; runtime PWA manifest locale; recorded Hebrew audio assets.

**Outside this product:** Binding pesak.

## Planning Contract

### Key Technical Decisions

- KTD-1. Typed TypeScript message catalogs (`en` is the type; `he` must match). No i18next, ICU, or JSON fetch. Interpolators are functions. `(unlabeled — local i18n layer is thin; this is the implementer default from research.)`
- KTD-2. `ScoreIssue` carries `code` and optional `params`. Display strings live in catalogs. Live timing uses `status` as the stable `code` plus numeric params; do not add new English `message` strings. Governs R-3, R-11.
- KTD-3. Live meter and scored floors share one helper: `unitsFor(pattern, blastRole) * unitSec`. `pattern` is passed into `TimingContext` and `scoreRecording`. When measured middle > 0, scored tekiah minimum is `max(unitFloor, middle × 0.85)` — measured middle must not drop the unit floor. Live opening tekiah uses the unit floor as a **minimum** only (not an ideal to stop at). Live closing tekiah may use the same `max()` once middle is known. Governs R-5. `(session-settled: user-directed — chosen over a third duration model.)`
- KTD-4. Sources are a data module of `{ id, heRef, enRef, hebrew, english, links[], encoded: boolean }`. Catalogs hold chrome only. Both languages always render stacked (Hebrew then English). Encoded = MB 590:12–15 rules this app scores. Study-only = Rambam half-length, SA 590:3 extra-notes leniency, Mishnah/Talmud background. Governs R-8.
- KTD-5. Default practice remains Rema two-breath tashrat (separate shevarim then teruah). One-breath sitting blasts stay deferred. Document that on Sources. `(assumption — user did not choose a minhag switch.)`
- KTD-6. Keep vanilla TS mount pattern in `src/main.ts`. Add `sources` view. Do not add React.

### High-Level Technical Design

```
locale (localStorage) → apply html lang/dir → remount idle view
header EN|HE toggle (disabled while recording)
catalogs t(key, params) ← UI, speech, live meter formatter
halacha scoring → { code, params, severity } (no locale)
unitsFor(pattern, blastRole) * unitSec → live min; scored min = max(unitFloor, middle×0.85)
duration-targets → minSec (shiur), coachMaxSec (meter geometry only), safetyAutoStopSec
sources.ts citations → Sources view (he + en + links + encoded mark)
```

### Assumptions

- Default minhag is Ashkenazi Rema two-breath, matching the current guided flow.
- MB 590:15 lechatchila (18 / 9 kochot) is the training floor. Lechatchila-floor misses fail the set (`error`): tekiah below `max(unitFloor, middle×0.85)`, teruah under 9 notes, shever ≥ 9 units. Extra shevarim notes stay `warn`. Longer-than-floor tekiah/teruah is not an error.
- Existing `localStorage` sessions may keep English `message`; new writes use `code` + `params`.
- No Hebrew speech voice is common; skip SpeechSynthesis in `he` rather than speak English over a Hebrew UI.
- Repo stays local-only unless a remote appears.
- Install-time PWA manifest stays English; `document.title` follows catalogs.

### Risks

- Canvas waveform `fillText` ignores document `dir`. Keep Latin blast abbreviations, `REC`, and numeric elapsed/target on canvas. Show catalog live-timing copy in the DOM, not on canvas.
- Changing `computeTekiahRatio` breaks current tests and history ratio display. Replace tests; keep a derived average only as optional display.
- `checkTeruah` hardcoded 4.5 s must become unit-scaled.
- Physical CSS (`padding-left`, `border-left`) will not mirror under `dir=rtl`. Use logical properties (`padding-inline-start`, `border-inline-start`).
- `SpeechSynthesis.getVoices()` may be empty until `voiceschanged`; wait for that event before deciding there is no `he-IL` voice.

### Sources and Research

- Repo scoring: `src/halacha/rules.ts`, `src/halacha/duration-targets.ts`, `src/halacha/live-timing.ts`, `src/ui/practice.ts`.
- Origin PWA plan: `docs/plans/2026-08-06-001-feature-shofar-trainer-pwa-plan.md` (KTD-1 vanilla TS, KTD-4 relative units).
- Poskim: SA OC 590, MB 590:12–15, Rambam Hilchot Shofar 3, Aruch HaShulchan 590, Peninei Halakha 4:11–13.
- Talmud: Mishnah RH 4:9 / Bavli RH 33b–34a (study-only background).
- i18n: typed catalogs + `Intl` + `html lang/dir`; no framework. Speech: set `lang` and `voice`; skip speech if no `he-IL` voice in Hebrew locale.

## Implementation Units

### U1. Locale catalogs and RTL shell

**Goal:** Locale persist, typed EN/HE catalogs, `lang`/`dir`, header toggle, remount idle views, logical CSS.

**Requirements:** R-1, R-2 (foundation)

**Files:** `src/i18n/locale.ts`, `src/i18n/en.ts`, `src/i18n/he.ts`, `src/i18n/t.ts`, `src/i18n/locale.test.ts`, `index.html`, `src/style.css`, `src/main.ts`

**Approach:** Header segmented control on every view. `applyLocale` sets `lang`/`dir` and `document.title`. Replace physical horizontal CSS with logical properties. Do not remount while practice or calibrate is recording.

**Test scenarios:**
- Default locale is `en` with `dir=ltr`.
- Setting `he` writes localStorage and reports `dir=rtl`.
- Missing Hebrew key fails TypeScript against `typeof en` (compile-time; document as contract).

**Depends on:** none

### U2. Per-tekiah scoring and shever cap

**Goal:** Replace average-only ratio. Unit-scale teruah fallback. Cap shever vs 9-unit floor. Fail lechatchila misses.

**Requirements:** R-3, R-4, R-5, R-6, R-7

**Files:** `src/halacha/types.ts`, `src/halacha/rules.ts`, `src/halacha/rules.test.ts`, `src/store/sessions.ts`, `src/store/sessions.test.ts`

**Approach:** `scoreRecording` takes `pattern`. Tekiah min = unit floor always; if middle > 0, also `max` with `middle × 0.85`. `shever_too_long` is `error`. Teruah under 9 notes is `error`. Extra shevarim notes are `warn`. Issue codes use `snake_case`.

**Test scenarios:**
- AE-1 (asymmetric tekiahs fail).
- Balanced Tashat still passes.
- Shever ≥ 9 units yields `shever_too_long` as `error` and `passed === false`.
- Four shevarim notes yields a `warn` code, not an error, when total length is OK.
- Teruah of 3 notes yields `error` and `passed === false`; fewer than 3 with short total is error.
- Tekiah just below `middle × 0.85` fails the middle check; at or above it can pass that check if the unit floor is also met.
- Classified set with tekiahs but middle duration 0 emits a per-tekiah unit-floor issue (18 for tst, 9 for tsh/tt) and `passed === false`.
- `scoreRecording` issues have `code` and do not require English `message` for tests to pass.

**Depends on:** none (can land before U1 if issues keep optional `message` during transition; prefer codes first)

### U3. Unit-based live duration targets

**Goal:** One helper for live meter and scored floors from pattern × unit. Drop 5/7/10 s as the shiur. Live min is a floor, not a stop target.

**Requirements:** R-5, R-7

**Files:** `src/halacha/duration-targets.ts`, `src/halacha/live-timing.ts`, `src/halacha/live-timing.test.ts`, `src/halacha/rules.ts`, `src/halacha/rules.test.ts`, `src/audio/analyze.ts`, `src/ui/practice.ts`

**Approach:** Add `pattern` to `TimingContext` and `scoreRecording`. Call `unitsFor(pattern, blastRole)` from live targets and scoring. Live tekiah/teruah become `good` once elapsed ≥ min and never `too_long`. Shevarim may be `too_long`. `coachMaxSec` = 2× min for meter geometry only. Practice auto-stop safety = `max(current cap, 3× min)` so recording cannot run unbounded. Gedolah is coaching-only: min = 18 × unitSec, live display ideal = 2× that floor, no scoring error for gedolah length. Opening live target stays the unit floor as a minimum; closing may use `max(unitFloor, middle×0.85)` once middle exists. Live helper returns `code` + params, not locale strings.

**Test scenarios:**
- AE-3 (Tashrat tekiah **min** ≈ 18 × unit, not 7 s).
- Tashat/Tarat tekiah min ≈ 9 × unit.
- Closing tekiah uses `max(unitFloor, middle×0.85)` when middle > 0.
- Tekiah elapsed well above floor stays `good`, never a scoring error or live `too_long`.
- Gedolah live min is 18 × unit, not 12/20/35 s; length is not a scoring error.
- Scored tekiah/shever floors call the same `unitsFor(pattern, blastRole)` helper as live timing.

**Depends on:** U2 for shared unit constants if any

### U4. Sources data and Sources screen

**Goal:** Bilingual citations for the reviewed corpus plus disclaimer, encoded-versus-study marks, and Rema two-breath note.

**Requirements:** R-8, R-9

**Files:** `src/halacha/sources.ts`, `src/halacha/sources.test.ts`, `src/ui/sources.ts`, `src/i18n/en.ts`, `src/i18n/he.ts`, `src/main.ts`

**Approach:** Stack Hebrew then English then links. Mark MB 590:12–15 encoded. Mark Rambam half-length, SA 590:3 extra-notes leniency, and Mishnah/Talmud as study-only. Include a Sources note that default practice is Rema two-breath tashrat; one-breath sitting stays deferred.

**Test scenarios:**
- Catalog includes SA 590, MB 590, Rambam Shofar 3, AHS 590, Peninei Halakha 4:11–13, Mishnah RH 4:9 / RH 33b–34a.
- Each entry has non-empty `hebrew`, `english`, and `links[]` (Sefaria, and Chabad or Peninei Halakha where used).
- Encoded flag is true for MB 590 entries and false for study-only Rambam half-length / SA extra-notes / Mishnah background.
- Disclaimer string is present in both catalogs.
- Sources includes the Rema two-breath minhag note in both languages.

**Depends on:** U1 for chrome strings

### U5. Wire UI, speech, and history

**Goal:** All screens, callouts, feedback, and history consume catalogs. Speech sets lang/voice or skips in Hebrew without a voice.

**Requirements:** R-2, R-9, R-10, R-11

**Files:** `src/ui/components.ts`, `src/ui/practice.ts`, `src/ui/calibrate.ts`, `src/ui/history.ts`, `src/ui/live-waveform.ts`, `src/halacha/guided-steps.ts`, `src/halacha/seder.ts`, `src/halacha/live-timing.ts`, `src/store/sessions.ts`, `src/main.ts`

**Approach:** Format live-timing and issues from catalogs. `formatSessionSummary` takes active locale and catalog lookup, with fallback to stored English `message`. Replace `window.confirm` with an in-app confirm row. Canvas `fillText` stays Latin/numeric. Disable locale toggle while recording. Show disclaimer on set-review and History. When locale is `he` and no `he-IL` voice, skip SpeechSynthesis and show the one-time notice.

**Test scenarios:**
- `speakAndWait` sets `utterance.lang` to `he-IL` when locale is `he` and a matching voice exists.
- When locale is `he` and no `he-IL` voice exists, speech is skipped (no English callout).
- History summary uses catalog PASS/FAIL for the active locale.
- Practice callouts come from catalogs, not hardcoded English in `guided-steps.ts`.
- Failed set review still shows the training-not-pesak disclaimer in the active locale.

**Depends on:** U1, U2, U3

### U6. Docs alignment

**Goal:** `docs/HALACHA.md` and `README.md` describe per-tekiah rules, unit floors, Sources screen, bilingual toggle, and not-pesak. Use Simplified Technical English. Do not translate those files.

**Requirements:** R-9

**Files:** `docs/HALACHA.md`, `README.md`

**Test scenarios:** none automated. Manual: docs match encoded checks (18/9, each tekiah, shever cap, bilingual app, not-pesak).

**Depends on:** U2, U3, U4

## Verification Contract

```bash
cd /Users/zacharyleighton/work/shofar-trainer
npm test
npm run build
```

Manual smoke: toggle HE/EN on home; calibrate tashrat; one Tashrat set; confirm live tekiah **min** tracks unit × 18, not 7 s, and a long tekiah stays `good`; open Sources; confirm disclaimer on Home and Sources; confirm encoded vs study marks.

Quality gates: vitest pass, `tsc` clean, no leftover user-facing English outside catalogs except Latin blast abbreviations on canvas, citation `ref` ids, install-time PWA manifest labels, and legacy session `message` strings.

## Definition of Done

- [ ] Locale toggle remounts idle UI with correct `lang`/`dir` and does not abort a recording
- [ ] Asymmetric tekiahs fail per-tekiah tests
- [ ] Live Tashrat tekiah **min** uses 18 units; long tekiah stays `good`
- [ ] Home and Sources show the training-not-pesak disclaimer (Sources also shows Hebrew + English + links + encoded marks)
- [ ] Speech uses `he-IL` when locale is Hebrew and a voice exists; otherwise Hebrew on-screen only
- [ ] `docs/HALACHA.md` matches the encoded rules
- [ ] Abandoned experimental i18n approaches are not left in the tree
- [ ] Local git commit only; no push unless a remote exists

## Deferred / Open Questions

### From 2026-08-13 review

- Default locale stays `en` rather than `navigator.language` (first-launch Hebrew-first users see English until they toggle).
- Recorded Hebrew makrei audio is out of scope; skip-speech is the fallback.
- `ratioTolerance` stays 0.15 even when floors are short in wall-clock seconds.
- Outbound Sefaria/Chabad links use the existing in-app / new-tab behavior of the PWA; not specified further.
