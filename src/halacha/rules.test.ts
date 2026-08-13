import { describe, expect, it } from 'vitest';
import {
  buildClassifiedFromNotes,
  buildClassifiedFromSetPattern,
  checkShevarim,
  checkTeruah,
  computeTekiahRatio,
  scoreRecording,
} from './rules';
import type { BlastSegment, ClassifiedBlast } from './types';

function seg(durationSec: number, start = 0): BlastSegment {
  const samples = Math.floor(durationSec * 44100);
  return { startSample: start, endSample: start + samples, durationSec };
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

describe('checkShevarim', () => {
  it('requires 3 notes', () => {
    const blast: ClassifiedBlast = {
      type: 'shevarim',
      segments: [seg(0.1), seg(0.1)],
      totalDurationSec: 0.2,
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
  it('passes a balanced Tashat set', () => {
    const classified: ClassifiedBlast[] = [
      { type: 'tekiah', segments: [seg(0.9)], totalDurationSec: 0.9 },
      { type: 'shevarim', segments: [seg(0.3), seg(0.3), seg(0.3)], totalDurationSec: 0.9 },
      { type: 'tekiah', segments: [seg(0.9)], totalDurationSec: 0.9 },
    ];
    expect(scoreRecording(classified, 0.1, 'tsh').passed).toBe(true);
  });

  it('fails asymmetric tekiahs even when the average ratio is 100%', () => {
    const classified: ClassifiedBlast[] = [
      { type: 'tekiah', segments: [seg(0.9)], totalDurationSec: 0.9 },
      { type: 'shevarim', segments: [seg(0.6), seg(0.6), seg(0.6)], totalDurationSec: 1.8 },
      { type: 'tekiah', segments: [seg(2.7)], totalDurationSec: 2.7 },
    ];
    const result = scoreRecording(classified, 0.1, 'tsh');
    expect(result.tekiahRatio).toBeCloseTo(1, 1);
    expect(result.passed).toBe(false);
    expect(result.issues.some((i) => i.code === 'opening_tekiah_too_short')).toBe(true);
  });

  it('fails a shever at or above 9 units as error', () => {
    const classified: ClassifiedBlast[] = [
      { type: 'tekiah', segments: [seg(0.9)], totalDurationSec: 0.9 },
      { type: 'shevarim', segments: [seg(0.95), seg(0.3), seg(0.3)], totalDurationSec: 1.55 },
      { type: 'tekiah', segments: [seg(1.6)], totalDurationSec: 1.6 },
    ];
    const result = scoreRecording(classified, 0.1, 'tsh');
    const issue = result.issues.find((i) => i.code === 'shever_too_long');
    expect(issue?.severity).toBe('error');
    expect(result.passed).toBe(false);
  });

  it('warns on four shevarim notes without failing when length is OK', () => {
    const classified: ClassifiedBlast[] = [
      { type: 'tekiah', segments: [seg(1.2)], totalDurationSec: 1.2 },
      {
        type: 'shevarim',
        segments: [seg(0.3), seg(0.3), seg(0.3), seg(0.3)],
        totalDurationSec: 1.2,
      },
      { type: 'tekiah', segments: [seg(1.2)], totalDurationSec: 1.2 },
    ];
    const result = scoreRecording(classified, 0.1, 'tsh');
    expect(result.issues.some((i) => i.code === 'shevarim_extra' && i.severity === 'warn')).toBe(
      true,
    );
    expect(result.issues.some((i) => i.code === 'shever_too_long')).toBe(false);
    expect(result.passed).toBe(true);
  });

  it('fails teruah of 3 notes as a lechatchila miss', () => {
    const classified: ClassifiedBlast[] = [
      { type: 'tekiah', segments: [seg(0.9)], totalDurationSec: 0.9 },
      { type: 'teruah', segments: [seg(0.3), seg(0.3), seg(0.3)], totalDurationSec: 0.9 },
      { type: 'tekiah', segments: [seg(0.9)], totalDurationSec: 0.9 },
    ];
    const result = scoreRecording(classified, 0.1, 'tt');
    expect(result.issues.some((i) => i.code === 'teruah_count' && i.severity === 'error')).toBe(
      true,
    );
    expect(result.passed).toBe(false);
  });

  it('fails a tekiah just below middle × 0.85', () => {
    const classified: ClassifiedBlast[] = [
      { type: 'tekiah', segments: [seg(0.84)], totalDurationSec: 0.84 },
      { type: 'shevarim', segments: [seg(0.34), seg(0.33), seg(0.33)], totalDurationSec: 1.0 },
      { type: 'tekiah', segments: [seg(1.0)], totalDurationSec: 1.0 },
    ];
    const result = scoreRecording(classified, 0.1, 'tsh');
    expect(result.passed).toBe(false);
    expect(result.issues.some((i) => i.code === 'opening_tekiah_too_short')).toBe(true);
  });

  it('applies the unit floor when middle is 0', () => {
    const classified: ClassifiedBlast[] = [
      { type: 'tekiah', segments: [seg(0.5)], totalDurationSec: 0.5 },
      { type: 'tekiah', segments: [seg(0.5)], totalDurationSec: 0.5 },
    ];
    const tsh = scoreRecording(classified, 0.1, 'tsh');
    expect(tsh.passed).toBe(false);
    expect(tsh.issues.some((i) => i.code === 'opening_tekiah_too_short')).toBe(true);
    const tst = scoreRecording(classified, 0.1, 'tst');
    expect(tst.issues.some((i) => (i.params?.min as number) >= 1.8)).toBe(true);
  });

  it('does not require English message on issues', () => {
    const classified: ClassifiedBlast[] = [
      { type: 'tekiah', segments: [seg(0.5)], totalDurationSec: 0.5 },
      { type: 'shevarim', segments: [seg(0.3), seg(0.3), seg(0.3)], totalDurationSec: 0.9 },
      { type: 'tekiah', segments: [seg(0.9)], totalDurationSec: 0.9 },
    ];
    const result = scoreRecording(classified, 0.1, 'tsh');
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues.every((i) => typeof i.code === 'string')).toBe(true);
  });
});

describe('buildClassifiedFromNotes', () => {
  it('assigns tsh pattern positionally', () => {
    const unit = 0.1;
    const notes = [
      seg(0.9, 0),
      seg(0.3, 50000),
      seg(0.3, 70000),
      seg(0.3, 90000),
      seg(0.85, 120000),
    ];
    const result = buildClassifiedFromNotes('tsh', notes, unit);
    expect(result.map((b) => b.type)).toEqual(['tekiah', 'shevarim', 'tekiah']);
    expect(result[1].segments).toHaveLength(3);
  });

  it('assigns tt pattern with teruah in middle', () => {
    const unit = 0.08;
    const notes = [
      seg(0.8, 0),
      ...Array.from({ length: 9 }, (_, i) => seg(0.08, 40000 + i * 5000)),
      seg(0.75, 100000),
    ];
    const result = buildClassifiedFromNotes('tt', notes, unit);
    expect(result.map((b) => b.type)).toEqual(['tekiah', 'teruah', 'tekiah']);
    expect(result[1].segments.length).toBeGreaterThanOrEqual(9);
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
