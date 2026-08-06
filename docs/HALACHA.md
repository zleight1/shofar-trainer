# Halachic timing notes (simplified)

This app encodes **training guidance** based on commonly taught Ashkenazi practice. It is not a substitute for learning from a rav or the Beit Yosef / Shulchan Aruch.

## Core principle

> **Tekiah must be as long as the middle section** — whether that middle is shevarim, teruah, or shevarim followed by teruah.

The app measures this as a ratio: average tekiah duration ÷ middle duration. Target: **~100%** (±15% tolerance).

## Unit system

The shortest standard note is one **teruah blast** ("yevavah"). The app learns this from calibration.

Relative lengths (common simplified teaching):

| Sound | Relative length |
|-------|-----------------|
| One teruah blast | 1 unit |
| One shevarim note | ~3 units |
| Full shevarim (3 notes) | ~9 units |
| Full teruah (~9 blasts) | ~9 units total |
| Tekiah (when paired) | = middle section |
| Standalone tekiah minimum | ~9 units |

## Practice seder

The app follows the standard Rosh Hashana **musaf** practice pattern:

1. Tekiah–Shevarim–Teruah–Tekiah ×3
2. Tekiah–Shevarim–Tekiah ×3
3. Tekiah–Teruah–Tekiah ×3
4. Tekiah Gedolah

## What the app checks

| Check | Rule |
|-------|------|
| Tekiah ratio | Avg tekiah within 85–115% of middle |
| Shevarim count | 3 detected notes |
| Shevarim note length | Each note ≥ 2.5 units |
| Teruah count | ≥ 9 detected blasts |
| Standalone tekiah | ≥ 9 units (warning only) |

## Limitations

- Detection depends on clear separation between blasts.
- Very soft or merged notes may miscount.
- Maximum lengths are not strictly enforced (only minimums and ratio).
- Different poskim may disagree on exact durations.

## Sources (for personal study)

- Beit Yosef / Shulchan Aruch Orach Chaim 590
- Rama on teruah and shevarim definitions
- Common "klal" summaries used in Elul shofar workshops

Adjust thresholds in `src/halacha/types.ts` (`DEFAULT_HALACHA_CONFIG`) if your rav teaches different minimums.
