import { describe, expect, it } from 'vitest';
import {
  buildClassifiedFromSetPattern,
  checkShevarim,
  checkTekiahRatio,
  checkTeruah,
  computeTekiahRatio,
  scoreRecording,
} from './rules';
import type { BlastSegment, ClassifiedBlast } from './types';

function seg(durationSec: number, start = 0): BlastSegment {
  return { startSample: start, endSample: start + 1000, durationSec };
}

describe('computeTekiahRatio', () => {
  it('returns 1 when tekiah equals middle', () => {
    const classified: ClassifiedBlast[] = [
      { type: 'tekiah', segments: [seg(0.9)], totalDurationSec: 0.9 },
      { type: 'shevarim', segments: [seg(0.3), seg(0.3), seg(0.3)], totalDurationSec: 0.9 },
      { type: 'tekiah', segments: [seg(0.9)], totalDurationSec: 0.9 },
    ];
    expect(computeTekiahRatio(classified)).toBeCloseTo(1, 1);
  });

  it('returns null when no middle section', () => {
    const classified: ClassifiedBlast[] = [
      { type: 'tekiah', segments: [seg(1)], totalDurationSec: 1 },
    ];
    expect(computeTekiahRatio(classified)).toBeNull();
  });
});

describe('checkTekiahRatio', () => {
  it('passes when within tolerance', () => {
    const classified: ClassifiedBlast[] = [
      { type: 'tekiah', segments: [seg(0.95)], totalDurationSec: 0.95 },
      { type: 'shevarim', segments: [seg(0.3), seg(0.3), seg(0.35)], totalDurationSec: 0.95 },
      { type: 'tekiah', segments: [seg(0.95)], totalDurationSec: 0.95 },
    ];
    expect(checkTekiahRatio(classified)).toHaveLength(0);
  });

  it('errors when tekiah too short', () => {
    const classified: ClassifiedBlast[] = [
      { type: 'tekiah', segments: [seg(0.5)], totalDurationSec: 0.5 },
      { type: 'shevarim', segments: [seg(0.3), seg(0.3), seg(0.3)], totalDurationSec: 0.9 },
      { type: 'tekiah', segments: [seg(0.5)], totalDurationSec: 0.5 },
    ];
    const issues = checkTekiahRatio(classified);
    expect(issues.some((i) => i.code === 'tekiah_too_short')).toBe(true);
  });
});

describe('checkShevarim', () => {
  it('requires 3 notes', () => {
    const blast: ClassifiedBlast = {
      type: 'shevarim',
      segments: [seg(0.3), seg(0.3)],
      totalDurationSec: 0.6,
    };
    const issues = checkShevarim(blast, 0.1);
    expect(issues.some((i) => i.code === 'shevarim_count')).toBe(true);
  });
});

describe('checkTeruah', () => {
  it('requires at least 9 blasts', () => {
    const blast: ClassifiedBlast = {
      type: 'teruah',
      segments: Array.from({ length: 7 }, () => seg(0.08)),
      totalDurationSec: 0.56,
    };
    expect(checkTeruah(blast).some((i) => i.code === 'teruah_count')).toBe(true);
  });
});

describe('scoreRecording', () => {
  it('passes a balanced T-Sh-T set', () => {
    const classified: ClassifiedBlast[] = [
      { type: 'tekiah', segments: [seg(0.9)], totalDurationSec: 0.9 },
      { type: 'shevarim', segments: [seg(0.3), seg(0.3), seg(0.3)], totalDurationSec: 0.9 },
      { type: 'tekiah', segments: [seg(0.9)], totalDurationSec: 0.9 },
    ];
    expect(scoreRecording(classified, 0.1).passed).toBe(true);
  });
});

describe('buildClassifiedFromSetPattern', () => {
  it('builds tsh pattern from segments', () => {
    const segments = [seg(0.9), seg(0.3), seg(0.3), seg(0.3), seg(0.85)];
    const result = buildClassifiedFromSetPattern('tsh', segments, 0.1);
    expect(result.some((b) => b.type === 'tekiah')).toBe(true);
    expect(result.some((b) => b.type === 'shevarim')).toBe(true);
  });
});
