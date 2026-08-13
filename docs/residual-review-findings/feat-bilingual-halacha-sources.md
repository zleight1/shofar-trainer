# Residual Review Findings

Branch: `feat/bilingual-halacha-sources`
Head at filing: `5adfd72`
Review run: `20260813-094228-59389d21`
Plan: `docs/plans/2026-08-13-001-feat-bilingual-halacha-sources-plan.md`

Review found eight primary findings. The pipeline applied #3 (legacy history text), #4 (locale refresh without remount), #5 (abort during callout), and #6 (sounding-time scoring). These items remain.

## Residual Review Findings

- P1 `src/halacha/duration-targets.ts:49` — Shever live good then score fails — [issue #3](https://github.com/zleight1/shofar-trainer/issues/3)
- P1 `src/ui/practice.ts:271` — Mic denial leaves viewBusy stuck — [issue #4](https://github.com/zleight1/shofar-trainer/issues/4)
- P2 `src/i18n/locale.ts:19` — setLocale throws when storage blocked — [issue #5](https://github.com/zleight1/shofar-trainer/issues/5)
- P1 `src/halacha/duration-targets.ts:47` — Opening live good then set fails — settled_conflict KTD-3 (opening live uses the unit floor only; scoring uses max(floor, middle x 0.85)). Report-only. Do not invert KTD-3.

## Applied in this pipeline

- #3 Old history codes render as zero counts
- #4 Locale toggle remount wipes set review
- #5 Exit during callout throws and sticks locale
- #6 Tekiah floors use capture wall-clock
