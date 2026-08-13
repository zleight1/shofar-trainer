import type { BlastType } from './types';
import type { SetPattern } from './types';

export type BlastRole = BlastType;

export function unitsFor(pattern: SetPattern, blastRole: BlastRole): number {
  switch (blastRole) {
    case 'tekiah':
    case 'tekiah_gedolah':
      return pattern === 'tst' || pattern === 'gedolah' ? 18 : 9;
    case 'shevarim':
    case 'shevarim_teruah':
      return 9;
    case 'teruah':
      return 9;
    default: {
      const _exhaustive: never = blastRole;
      return _exhaustive;
    }
  }
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
