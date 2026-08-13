import { describe, expect, it } from 'vitest';
import { soundingExclusiveSec } from './auto-stop';

describe('soundingExclusiveSec', () => {
  it('is 0 before any sound', () => {
    expect(soundingExclusiveSec(1000, null, null)).toBe(0);
  });

  it('excludes trailing silence from sounding time', () => {
    expect(soundingExclusiveSec(1600, 1000, 1400)).toBeCloseTo(0.4);
  });

  it('uses now when still sounding', () => {
    expect(soundingExclusiveSec(1300, 1000, null)).toBeCloseTo(0.3);
  });
});
