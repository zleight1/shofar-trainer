import { describe, expect, it } from 'vitest';
import { peakFromTimeDomain } from './capture';

describe('peakFromTimeDomain', () => {
  it('returns 0 for silence', () => {
    expect(peakFromTimeDomain(new Float32Array(100))).toBe(0);
  });

  it('returns max absolute sample', () => {
    const data = new Float32Array([0, 0.2, -0.7, 0.1]);
    expect(peakFromTimeDomain(data)).toBeCloseTo(0.7);
  });
});
