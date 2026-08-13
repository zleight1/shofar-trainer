import { describe, expect, it } from 'vitest';
import { inferUnitFromBlasts } from '../audio/analyze-blast';
import type { ClassifiedBlast } from '../halacha/types';
import { expectedDurationForType, clampUnit } from './duration-targets';
import { liveTimingState } from './live-timing';

describe('clampUnit', () => {
  it('clamps wild values', () => {
    expect(clampUnit(2.5)).toBe(0.35);
    expect(clampUnit(0.01)).toBe(0.05);
    expect(clampUnit(0.12)).toBeCloseTo(0.12);
  });
});

describe('inferUnitFromBlasts', () => {
  it('derives unit from teruah total when not segmented', () => {
    const blasts: ClassifiedBlast[] = [
      {
        type: 'teruah',
        segments: [{ startSample: 0, endSample: 1, durationSec: 6.3 }],
        totalDurationSec: 6.3,
      },
    ];
    expect(inferUnitFromBlasts(blasts)).toBe(0.35);
  });

  it('uses median teruah blast when segmented', () => {
    const blasts: ClassifiedBlast[] = [
      {
        type: 'teruah',
        segments: Array.from({ length: 9 }, (_, i) => ({
          startSample: i * 100,
          endSample: i * 100 + 50,
          durationSec: 0.11,
        })),
        totalDurationSec: 6,
      },
    ];
    expect(inferUnitFromBlasts(blasts)).toBeCloseTo(0.11, 2);
  });
});

describe('expectedDurationForType', () => {
  it('uses 18 units as Tashrat tekiah min, not 7s', () => {
    const t = expectedDurationForType('tekiah', 0.12, 'tst');
    expect(t.minSec).toBeCloseTo(2.16, 2);
    expect(t.minSec).not.toBe(7);
  });

  it('uses 9 units as Tashat tekiah min', () => {
    const t = expectedDurationForType('tekiah', 0.12, 'tsh');
    expect(t.minSec).toBeCloseTo(1.08, 2);
  });

  it('uses max(unit floor, middle×0.85) for closing tekiah', () => {
    const t = expectedDurationForType('tekiah', 0.12, 'tsh', 2.0, true);
    expect(t.minSec).toBeCloseTo(1.7, 2);
  });

  it('uses 18 units for gedolah min, not 12/20/35 s', () => {
    const t = expectedDurationForType('tekiah_gedolah', 0.12, 'gedolah');
    expect(t.minSec).toBeCloseTo(2.16, 2);
    expect(t.idealSec).toBeCloseTo(4.32, 2);
  });
});

describe('liveTimingState', () => {
  it('marks Tashrat tekiah good at the 18-unit floor and stays good past it', () => {
    const ctx = { unitSec: 0.12, pattern: 'tst' as const };
    const atFloor = liveTimingState('tekiah', 2.16, ctx, 'sounding');
    expect(atFloor.status).toBe('good');
    expect(atFloor.targetMinSec).toBeCloseTo(2.16, 2);
    const long = liveTimingState('tekiah', 12, ctx, 'sounding');
    expect(long.status).toBe('good');
  });
});
