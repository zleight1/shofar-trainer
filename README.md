# Shofar Trainer

Personal PWA for halachic shofar practice. Coaches the Rosh Hashana blast seder and analyzes microphone recordings for timing feedback.

**This is a personal training tool, not a halachic ruling.** A rav must still give pesak.

The UI is bilingual English / Hebrew. Open **Sources** in the app for the reviewed texts.

## Quick start

```bash
cd ~/work/shofar-trainer
npm install
npm run dev
```

Open the URL shown (typically `http://localhost:5173`). Allow microphone access when prompted.

Use the **EN | עברית** control in the header to switch language. The toggle is disabled while a blast is recording.

### Production / offline PWA

```bash
npm run build
npm run preview
```

Install via browser "Add to Home Screen" / "Install app" when offered. The install name stays English; in-app chrome follows the selected language.

## Hosting

The app is a static Vite PWA. Production is Cloudflare Pages (same path as `web-mishna`).

- Live URL after the first successful deploy: `https://shofar-trainer.pages.dev`
- Push to `main` builds, tests, and deploys. Pull requests get a preview URL.
- HTTPS is required for the microphone.

This repo needs the same GitHub Actions secrets as `web-mishna`:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Usage

1. **Calibrate** — Blow a teruah-style blast. The app learns your **unit** duration (shortest note length).
2. **Practice** — Full Rosh Hashana seder of 100 blasts (sitting 30, musaf 30, after musaf 40). Calibration tashrat is first and is not in the 100. The app calls each blast, records, and reviews pass/fail. **Live session** (on by default) auto-continues the sitting 30 and the closing 40, waits for Next during musaf, and offers Redo / Previous if a set needs another take. Use **Redo set** during a set or on the review screen to start that set over. Tekiah auto-stop waits through short cracks and gaps so a struggling opening blast does not jump to the middle.
3. **Sources** — Read Hebrew and English citations. Encoded rules are marked. Study-only texts are marked.
4. **History** — Review past sessions stored locally. Rows from before this scoring change are labeled as previous average-ratio checks.

## Halachic rules encoded

See [docs/HALACHA.md](docs/HALACHA.md).

Core checks (Mishnah Berurah 590 lechatchila training):

- **Each tekiah vs middle** — Opening and closing tekiah each meet the unit floor and, when middle is known, middle × 0.85. The average of the two tekiahs cannot hide a short opening blast.
- **Unit floors** — Tashrat tekiah ≥ 18 teruah units; Tashat and Tarat ≥ 9.
- **Shevarim** — Prefer 3 notes. A shever ≥ 9 units fails. Extra notes warn.
- **Teruah** — At least 9 detected blasts (lechatchila). Fewer notes fail the set.
- **No tekiah maximum** — Longer than the floor is not an error.

All floors scale from your calibrated teruah unit.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Tests

```bash
npm test
npm run build
```

## Future improvements

- Minhag profiles (Sephardi one-breath tashrat / different teruah definitions)
- Band-pass filter for shofar frequency range
- Outdoor noise robustness
- Export session data
