import type { BlastType, SetPattern } from './types';
import { tekiahMinimumSec, unitsFor } from './units';

export const UNIT_MIN_SEC = 0.05;
export const UNIT_MAX_SEC = 0.35;
export const UNIT_DEFAULT_SEC = 0.12;

const SAFETY_CAPS: Record<BlastType, number> = {
  tekiah: 15,
  shevarim: 12,
  teruah: 10,
  shevarim_teruah: 12,
  tekiah_gedolah: 25,
};

export function clampUnit(sec: number): number {
  if (!Number.isFinite(sec) || sec <= 0) return UNIT_DEFAULT_SEC;
  return Math.min(UNIT_MAX_SEC, Math.max(UNIT_MIN_SEC, sec));
}

export interface DurationBand {
  minSec: number;
  idealSec: number;
  maxSec: number;
  safetyAutoStopSec: number;
}

export function expectedDurationForType(
  type: BlastType,
  unitSec: number,
  pattern: SetPattern,
  middleDurationSec?: number,
  isClosingTekiah?: boolean,
): DurationBand {
  if (type === 'tekiah_gedolah') {
    const gMin = unitsFor('gedolah', 'tekiah_gedolah') * unitSec;
    return {
      minSec: gMin,
      idealSec: gMin * 2,
      maxSec: gMin * 2,
      safetyAutoStopSec: Math.max(SAFETY_CAPS.tekiah_gedolah, gMin * 3),
    };
  }

  const minSec =
    type === 'tekiah'
      ? tekiahMinimumSec(pattern, unitSec, isClosingTekiah ? middleDurationSec ?? 0 : 0)
      : unitsFor(pattern, type) * unitSec;
  const maxSec = minSec * 2;
  return {
    minSec,
    idealSec: minSec,
    maxSec,
    safetyAutoStopSec: Math.max(SAFETY_CAPS[type], minSec * 3),
  };
}
