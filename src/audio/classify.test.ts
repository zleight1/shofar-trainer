import { describe, expect, it } from 'vitest';
import { classifySegments } from './classify';
import type { BlastSegment } from '../halacha/types';

function seg(d: number): BlastSegment {
  return { startSample: 0, endSample: 100, durationSec: d };
}

describe('classifySegments', () => {
  it('classifies single long blast as tekiah', () => {
    expect(classifySegments([seg(0.9)], 0.1).type).toBe('tekiah');
  });

  it('classifies 3 medium blasts as shevarim', () => {
    expect(classifySegments([seg(0.3), seg(0.3), seg(0.3)], 0.1).type).toBe('shevarim');
  });

  it('classifies many short blasts as teruah', () => {
    const shorts = Array.from({ length: 9 }, () => seg(0.08));
    expect(classifySegments(shorts, 0.1).type).toBe('teruah');
  });
});
