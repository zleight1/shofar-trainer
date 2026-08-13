import type { BlastType, HalachaConfig, SetPattern } from './types';
import { DEFAULT_HALACHA_CONFIG } from './types';

export type BlastRole = BlastType;

export function unitsFor(
  pattern: SetPattern,
  blastRole: BlastRole,
  config: HalachaConfig = DEFAULT_HALACHA_CONFIG,
): number {
  switch (blastRole) {
    case 'tekiah':
    case 'tekiah_gedolah':
      return pattern === 'tst' || pattern === 'gedolah'
        ? config.tashratTekiahUnits
        : config.minTekiahUnits;
    case 'shevarim':
    case 'shevarim_teruah':
    case 'teruah':
      return config.minTeruahBlasts;
    default: {
      const _exhaustive: never = blastRole;
      return _exhaustive;
    }
  }
}

export function tekiahMinimumSec(
  pattern: SetPattern,
  unitSec: number,
  middleSec: number,
  config: HalachaConfig = DEFAULT_HALACHA_CONFIG,
): number {
  const unitFloor = unitsFor(pattern, 'tekiah', config) * unitSec;
  const middleMin = middleSec > 0 ? middleSec * (1 - config.ratioTolerance) : 0;
  return Math.max(unitFloor, middleMin);
}

export function inferPattern(types: readonly BlastType[]): SetPattern {
  const hasGedolah = types.includes('tekiah_gedolah');
  if (hasGedolah) return 'gedolah';
  const hasSh = types.includes('shevarim') || types.includes('shevarim_teruah');
  const hasTr = types.includes('teruah') || types.includes('shevarim_teruah');
  if (hasSh && hasTr) return 'tst';
  if (hasSh) return 'tsh';
  if (hasTr) return 'tt';
  return 'tsh';
}
