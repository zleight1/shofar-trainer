import type { BlastType, SetPattern } from './types';
import { DEFAULT_HALACHA_CONFIG } from './types';
import { unitsFor } from './units';

export const UNIT_MIN_SEC = 0.05;
export const UNIT_MAX_SEC = 0.35;
export const UNIT_DEFAULT_SEC = 0.12;

export function clampUnit(sec: number): number {
  if (!Number.isFinite(sec) || sec <= 0) return UNIT_DEFAULT_SEC;
  return Math.min(UNIT_MAX_SEC, Math.max(UNIT_MIN_SEC, sec));
}

export interface DurationBand {
  minSec: number;
  idealSec: number;
  maxSec: number;
  coachMaxSec: number;
  safetyAutoStopSec: number;
}

export function expectedDurationForType(
  type: BlastType,
  unitSec: number,
  pattern: SetPattern,
  middleDurationSec?: number,
  isClosingTekiah?: boolean,
): DurationBand {
  const unitFloor = unitsFor(pattern, type) * unitSec;
  const middleMin =
    isClosingTekiah && middleDurationSec && middleDurationSec > 0
      ? middleDurationSec * (1 - DEFAULT_HALACHA_CONFIG.ratioTolerance)
      : 0;
  const minSec = Math.max(unitFloor, middleMin);
  const coachMaxSec = minSec * 2;
  const currentCaps: Record<string, number> = {
    teruah: 10,
    shevarim: 12,
    shevarim_teruah: 12,
    tekiah_gedolah: 25,
    tekiah: 15,
  };
  const currentCap = currentCaps[type] ?? 15;
  const safetyAutoStopSec = Math.max(currentCap, minSec * 3);

  if (type === 'tekiah_gedolah') {
    const gMin = unitsFor('gedolah', 'tekiah_gedolah') * unitSec;
    return {
      minSec: gMin,
      idealSec: gMin * 2,
      maxSec: gMin * 2,
      coachMaxSec: gMin * 2,
      safetyAutoStopSec: Math.max(25, gMin * 3),
    };
  }

  return {
    minSec,
    idealSec: minSec,
    maxSec: coachMaxSec,
    coachMaxSec,
    safetyAutoStopSec,
  };
}
