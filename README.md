# Shofar Trainer

Personal PWA for halachic shofar practice. Coaches the Rosh Hashana blast seder and analyzes microphone recordings for timing feedback.

**This is a personal training tool, not a halachic ruling.** Consult your rav for psak.

## Quick start

```bash
cd ~/work/shofar-trainer
npm install
npm run dev
```

Open the URL shown (typically `http://localhost:5173`). Allow microphone access when prompted.

### Production / offline PWA

```bash
npm run build
npm run preview
```

Install via browser "Add to Home Screen" / "Install app" when offered.

## Usage

1. **Calibrate** — Blow one short teruah-style blast. The app learns your **unit** duration (shortest note length).
2. **Practice** — Walk through 10 practice sets (T–Sh–T ×3, T–Sh–T short ×3, T–T ×3, Tekiah Gedolah). Record each full set, then review pass/fail feedback.
3. **History** — Review past sessions stored locally in the browser.

## Halachic rules encoded

See [docs/HALACHA.md](docs/HALACHA.md) for the simplified rules and sources.

Core checks:

- **Tekiah = middle** — Opening and closing tekiah should match shevarim, teruah, or shevarim+teruah combined (±15% tolerance).
- **Shevarim** — 3 distinct notes; each note at least ~2.5 teruah-units.
- **Teruah** — At least 9 short blasts.
- **Minimum tekiah** — Guidance when blowing standalone tekiah (~9 units).

All thresholds scale from your calibrated teruah unit.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Tests

```bash
npm test
npm run build
```

## Local git only

This repo is intended to stay local under `~/work/shofar-trainer`. No remote required.

## Future improvements

- Minhag profiles (Sephardi / different teruah definitions)
- Real-time visual meter while blowing
- Band-pass filter for shofar frequency range
- Outdoor noise robustness
- Export session data
