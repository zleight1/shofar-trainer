import type { BlastType } from './types';

/** Real-world practice targets in seconds (typical baal tokea range) */
export const BLAST_DURATION_TARGETS: Record<
  'tekiah' | 'shevarim' | 'teruah' | 'tekiah_gedolah',
  { min: number; ideal: number; max: number }
> = {
  tekiah: { min: 5, ideal: 7, max: 10 },
  shevarim: { min: 5, ideal: 7, max: 10 },
  teruah: { min: 5, ideal: 7, max: 10 },
  tekiah_gedolah: { min: 12, ideal: 20, max: 35 },
};

/** One teruah blast length — usually 80–250 ms */
export const UNIT_MIN_SEC = 0.05;
export const UNIT_MAX_SEC = 0.35;
export const UNIT_DEFAULT_SEC = 0.12;

export function clampUnit(sec: number): number {
  if (!Number.isFinite(sec) || sec <= 0) return UNIT_DEFAULT_SEC;
  return Math.min(UNIT_MAX_SEC, Math.max(UNIT_MIN_SEC, sec));
}

export function expectedDurationForType(
  type: BlastType,
  middleDurationSec?: number,
  isClosingTekiah?: boolean,
): { minSec: number; idealSec: number; maxSec: number } {
  if (
    (type === 'tekiah' || type === 'tekiah_gedolah') &&
    isClosingTekiah &&
    middleDurationSec &&
    middleDurationSec > 1
  ) {
    const tol = 0.15;
    return {
      minSec: middleDurationSec * (1 - tol),
      idealSec: middleDurationSec,
      maxSec: middleDurationSec * (1 + tol),
    };
  }

  if (type === 'tekiah_gedolah') {
    const g = BLAST_DURATION_TARGETS.tekiah_gedolah;
    return { minSec: g.min, idealSec: g.ideal, maxSec: g.max };
  }
  if (type === 'tekiah') {
    const t = BLAST_DURATION_TARGETS.tekiah;
    return { minSec: t.min, idealSec: t.ideal, maxSec: t.max };
  }
  if (type === 'shevarim') {
    const s = BLAST_DURATION_TARGETS.shevarim;
    return { minSec: s.min, idealSec: s.ideal, maxSec: s.max };
  }
  if (type === 'teruah') {
    const r = BLAST_DURATION_TARGETS.teruah;
    return { minSec: r.min, idealSec: r.ideal, maxSec: r.max };
  }

  const fallback = BLAST_DURATION_TARGETS.tekiah;
  return { minSec: fallback.min, idealSec: fallback.ideal, maxSec: fallback.max };
}
