# Halachic timing notes

This app is a **training aid**. It is not a ruling. A rav must still give pesak.

The trainer follows **Mishnah Berurah 590:12–15 lechatchila** for Ashkenazi Rema two-breath practice (shevarim, then teruah). Open **Sources** in the app for Hebrew and English citations. Encoded texts are marked. Study-only texts (including Rambam half-length tekiah and SA 590:3 extra-notes leniency) are not used as pass/fail rules.

## Core principle

Each opening tekiah and each closing tekiah must meet **both**:

1. The unit floor for that set: **Tashrat ≥ 18** teruah units; **Tashat and Tarat ≥ 9** units.
2. When the middle (shevarim and/or teruah) is measured and greater than zero: each tekiah ≥ middle × 0.85.

The app does **not** pass a set because the **average** of the two tekiahs is near 100% of the middle.

Tekiah and teruah have **no maximum**. A long tekiah is not an error. Live “too long” coaching applies only to shevarim.

## Unit system

The shortest standard note is one **teruah blast** (one koach / yevavah). The app learns this from calibration.

| Sound | Training floor |
|-------|----------------|
| One teruah blast | 1 unit |
| Full shevarim (3 notes) | ~9 units total |
| Full teruah | ≥ 9 notes lechatchila |
| Tashrat tekiah | ≥ 18 units, and ≥ that set’s middle |
| Tashat / Tarat tekiah | ≥ 9 units, and ≥ that set’s middle |
| One shever | must be shorter than 9 units (possible-tekiah cap) |

A shever that lasts ≥ 9 units **fails** as a possible tekiah. Extra shevarim notes **warn**. Fewer than 9 teruah notes **fails** for lechatchila training.

## Practice seder

The app follows the common Rosh Hashana practice loop:

1. Tekiah–Shevarim–Teruah–Tekiah ×3 (Tashrat)
2. Tekiah–Shevarim–Tekiah ×3 (Tashat)
3. Tekiah–Teruah–Tekiah ×3 (Tarat)
4. Tekiah Gedolah (coaching length only; not a scoring error)

Default practice is **two breaths** for shevarim-teruah (Rema). One-breath sitting blasts stay deferred.

## Live meter

The live tekiah target is a **minimum** (unit × 18 or 9), not a stopwatch of 5–10 seconds. Status becomes good at the floor and stays good if the blast continues. Auto-stop is a safety cap, not the shiur.

## Language

The app UI is bilingual English / Hebrew. `docs/HALACHA.md` and this README stay in English Simplified Technical English. Citation Hebrew lives on the Sources screen.

## Limitations

- Detection depends on clear separation between blasts.
- Very soft or merged notes may miscount.
- The live clock includes gaps between notes; unit floors count sounding units.
- Different poskim disagree on exact durations. This is training, not pesak.

## Sources (in-app)

See the Sources screen. Outbound links: Sefaria, and Chabad or Peninei Halakha where used.

Adjust numeric floors in `src/halacha/types.ts` (`DEFAULT_HALACHA_CONFIG`) only if your rav teaches different minimums.
