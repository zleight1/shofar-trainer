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
  it('uses ~7s for opening tekiah', () => {
    const t = expectedDurationForType('tekiah');
    expect(t.idealSec).toBe(7);
  });

  it('uses middle duration for closing tekiah', () => {
    const t = expectedDurationForType('tekiah', 6.5, true);
    expect(t.idealSec).toBeCloseTo(6.5);
  });

  it('uses ~20s ideal for gedolah', () => {
    expect(expectedDurationForType('tekiah_gedolah').idealSec).toBe(20);
  });
});

describe('liveTimingState', () => {
  it('targets ~7s for tekiah', () => {
    const s = liveTimingState('tekiah', 6.5, { unitSec: 0.12 }, 'sounding');
    expect(s.status).toBe('good');
    expect(s.targetIdealSec).toBe(7);
  });
});
