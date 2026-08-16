---
artifact_contract: ce-unified-plan/v1
artifact_readiness: requirements-only
product_contract_source: ce-brainstorm
execution: docs
title: In-app canned walkthrough of Shofar Trainer
date: 2026-08-16
origin: conversation — how to demo the app (page, recording, or example) without a shofar or microphone
---

## Goal Capsule

Give a visitor who cannot blow a shofar a short, honest look at the real practice loop: makrei callout, live timing, then a set review with pass or fail. The example must use the same scoring the practitioner uses. It must not look like pesak, must not ask for the microphone, and must not rewrite the visitor’s saved unit or history.

**Authority:** Existing product (training aid, bilingual EN/HE, MB lechatchila scoring) > visitor understanding without a shofar > authenticity of a live recording.

**Open blockers:** None that block this contract. Audience and artifact shape are assumed below because this run could not ask. If those assumptions are wrong, revise R-1 and the scope boundary before planning.

## Product Contract

### Summary

Add an in-app canned walkthrough, opened from Home and from a shareable URL on the live PWA. It plays fixture audio through the real practice chrome and the real scorer. It shows one passing sitting Tashrat and one failing set whose opening tekiah is too short. README points at that URL. A separate marketing page and a hosted screen recording are out of scope.

### Problem Frame

The distinctive work of this app is live coaching and per-tekiah scoring. Both are invisible in the README’s four-step usage list. Practice always opens the microphone, so a GitHub or Pages visitor cannot click through the product. Screenshots and videos go stale the next time callouts, the meter, or issue text change. The need is a demo that stays honest when scoring changes.

### Assumptions

- A-1. The primary audience is a visitor to the repo or `https://shofar-trainer.pages.dev` who will not blow a shofar and may refuse microphone permission.
- A-2. A secondary audience is the owner showing a rav or another baal tokea what the trainer checks.
- A-3. Fixture tones may be synthetic. They must be labeled as not a real shofar. Real-shofar WAV fixtures are a later upgrade, not this contract.
- A-4. One sitting Tashrat plus one fail example is enough. The full 100-blast seder is not the demo.
- A-5. Carrying cost stays low. This remains a personal training tool, not a marketed product.

### Actors

- A-visitor. Someone opening the live PWA or README who wants to see the loop without practicing.
- A-practitioner. The person who already uses Calibrate / Practice / History. Their saved unit and sessions must be untouched by the demo.

### Requirements

| ID | Requirement |
|----|-------------|
| R-1 | Home offers a clear action to watch an example, distinct from Practice and Calibrate. The action does not start a real session and does not prompt for the microphone. |
| R-2 | A shareable URL on the deployed PWA opens that same example directly, so README can link to it. |
| R-3 | The example drives the real practice chrome the practitioner sees: on-screen makrei callout, live timing as a minimum, waveform, set timeline, and set-review pass/fail with issue text. |
| R-4 | Scoring in the example is the same per-tekiah rules as live practice. The demo must not use a second, simplified checker. |
| R-5 | The walkthrough includes two beats in this order: (1) a passing sitting Tashrat, (2) a failing set whose opening tekiah is too short relative to that set’s middle, even if the average of the two tekiahs would look fine. The fail beat states why it failed in the active locale. |
| R-6 | Fixture audio is labeled as a canned example, not a live baal tokea and not a real shofar. The training-not-pesak disclaimer appears on the example the same way it appears on set review. |
| R-7 | The example does not write History rows and does not change the saved teruah unit. Leaving the example returns the visitor to Home with practitioner data unchanged. |
| R-8 | Locale EN \| עברית works on the example at idle and on set review, matching the rest of the app. Spoken callouts follow the existing Hebrew-voice rule. |
| R-9 | README Usage points to the shareable example URL and says the visitor does not need a shofar or microphone to watch it. |
| R-10 | The visitor can skip or exit at any time. The example does not run the rest of the 100-blast seder. |

### Key Flows

- F-1. Visitor on Home taps Watch an example → canned Tashrat plays through the real chrome without a mic prompt → set review shows PASS and the disclaimer → visitor continues to the fail beat or exits.
- F-2. Visitor opens the shareable URL → lands in the example, not in a live Practice session that asks for the microphone.
- F-3. During the fail beat, set review shows FAIL and an opening-tekiah-too-short issue, with the timeline still visible.
- F-4. Practitioner who already has a saved unit and History runs the example, then returns Home: unit badge and History are unchanged.
- F-5. Visitor toggles עברית on the example review screen: chrome, disclaimer, and issue text follow Hebrew and `dir=rtl`.

### Acceptance Examples

- AE-1. With microphone permission denied (or never prompted), the visitor completes both demo beats and sees PASS then FAIL.
- AE-2. The fail beat uses an opening tekiah at about half the middle and a closing tekiah at about 1.5× the middle. Review fails for the opening tekiah, not because the average ratio is low.
- AE-3. After the example, `localStorage` session list and saved unit match what they were before the example started.
- AE-4. README contains a link that opens the live PWA directly into the example.
- AE-5. On the example, the visitor sees the canned-example label and the training-not-pesak disclaimer in the active locale.

### Key Decisions

- KD-1. In-app canned walkthrough through the real chrome and scorer, not a separate demo site and not a hosted video as the primary artifact. Chosen because practice is mic-gated, screenshots and recordings drift from scoring, and the tests already prove fixture audio can be scored. `(assumption: A-1–A-5; non-interactive brainstorm — recommended over a static page and over a screen recording.)`
- KD-2. Two beats only: passing sitting Tashrat, then the canonical short-opening-tekiah fail. Chosen so the visitor sees both the happy path and the rule the app exists to teach. `(assumption: A-4.)`
- KD-3. Demo is isolated from practitioner data: no History writes, no unit overwrite, no mic. Chosen so “watch an example” cannot damage a real training profile. `(session-settled: inferred from existing personal-PWA localStorage design.)`
- KD-4. Fixture audio may be synthetic if labeled. Chosen to ship without capturing a real shofar recording in-repo. `(assumption: A-3.)`
- KD-5. Training-not-pesak still governs the example. The demo is not a ruling and must not be presented as one. `(session-settled: user-directed on the existing product.)`

### Approaches considered

These are the options the brainstorm weighed. Only KD-1 is in scope.

1. **In-app canned walkthrough (this contract).** Home + shareable URL. Fixture audio drives the real practice UI and the real scorer. Stays bilingual. Survives scoring changes because it is the scoring. Cost: a demo path that must not open the mic or touch storage.
2. **Static page or README screenshot gallery.** Fast to add, no mic issues, visible on GitHub without clicking through. Drifts when the UI or issue codes change. Cannot show the live meter. Would need its own EN/HE copy. Rejected as primary.
3. **Hosted screen recording of a real session.** Highest authenticity. Worst carrying cost: re-record on every chrome change, choose a language, host the file, and still cannot show the fail case on demand. Useful later as an optional extra, not the source of truth.

**Inversion considered and folded in:** do not demo buttons; demo the judgment. The fail beat (R-5) is that inversion. A review-only screen without the live callout/meter would hide the coaching that README cannot describe, so the walkthrough still plays the live chrome first.

**Deferred challenger:** replace synthetic fixtures with a real-shofar WAV recorded by the owner. Same walkthrough, better sound. Do not block this contract on that recording.

### Scope Boundaries

**In scope:** Home entry, shareable URL, canned two-beat walkthrough through real chrome and real scoring, canned-example labeling, disclaimer, isolation from History and saved unit, bilingual chrome, README link.

**Deferred:** Real-shofar fixture WAVs; a hosted video; screenshot gallery; full 100-blast demo; Hebrew spoken audio assets; autoplay of audible tones (visual replay is enough if the browser blocks sound); making History itself a demo by seeding fake sessions.

**Out of this product:** A marketing site. Presenting the example as pesak. Requiring microphone permission to watch.

### How This Work Fits Together

README Usage already lists Calibrate → Practice → Sources → History. That list stays. This work adds a way to *see* the practice loop when the visitor cannot perform it. Diagnostics WAV download after a real set is a practitioner tool, not the visitor demo. Sources remains the place for citations; the example only shows scoring outcomes.

Surrounding ideas that are **not** this contract: a separate `/demo.html` brochure, a YouTube recording, or seeding History with sample rows.

### Outstanding Questions

- Q-1. Should audible fixture tones play when the browser allows, or is a silent visual replay enough? Default for planning: visual is required; sound is optional and off if autoplay is blocked.
- Q-2. If a real-shofar recording becomes available later, does it replace the synthetic fixtures in place, or sit beside them as “real vs canned”? Default: replace in place, keep the canned-example label until the recording is clearly a real shofar.
