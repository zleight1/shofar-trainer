import { describe, expect, it } from 'vitest';
import type { BlastType, ClassifiedBlast, ScoreIssue } from '../halacha/types';
import { buildSetTimelineModel, expectedNoteCount } from './set-timeline';

function blast(type: BlastType, durations: number[]): ClassifiedBlast {
  const segments = durations.map((durationSec, i) => ({
    startSample: i * 1000,
    endSample: i * 1000 + 400,
    durationSec,
  }));
  return {
    type,
    segments,
    totalDurationSec: durations.reduce((sum, d) => sum + d, 0),
  };
}

const tashrat = [
  blast('tekiah', [1.9]),
  blast('shevarim', [0.32, 0.3, 0.31]),
  blast('teruah', [0.08, 0.08, 0.07, 0.08, 0.09, 0.08, 0.07, 0.08, 0.08]),
  blast('tekiah', [2.1]),
];

describe('expectedNoteCount', () => {
  it('asks for nine teruah notes and three shevarim', () => {
    expect(expectedNoteCount('teruah')).toBe(9);
    expect(expectedNoteCount('shevarim')).toBe(3);
    expect(expectedNoteCount('shevarim_teruah')).toBe(12);
    expect(expectedNoteCount('tekiah')).toBeNull();
  });
});

describe('buildSetTimelineModel', () => {
  it('sizes bars by duration and fills a long tekiah', () => {
    const model = buildSetTimelineModel(tashrat, [], 0.1, 'tst');
    expect(model).toHaveLength(4);
    expect(model[0].abbrev).toBe('T');
    expect(model[1].abbrev).toBe('Sh');
    expect(model[2].abbrev).toBe('Tr');
    expect(model[3].abbrev).toBe('T');
    expect(model[3].flexGrow).toBeGreaterThan(model[1].flexGrow);
    expect(model[0].fillPct).toBe(100);
    expect(model[0].status).toBe('ok');
  });

  it('shows nine teruah ticks when nine notes were detected', () => {
    const model = buildSetTimelineModel(tashrat, [], 0.1, 'tst');
    expect(model[2].notes).toHaveLength(9);
    expect(model[2].notes.every((n) => n.kind === 'ok')).toBe(true);
    expect(model[2].expectedNotes).toBe(9);
  });

  it('ghosts missing teruah notes and marks the blast as an error', () => {
    const short = [
      blast('tekiah', [2]),
      blast('teruah', [0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08]),
      blast('tekiah', [2]),
    ];
    const issues: ScoreIssue[] = [
      { severity: 'error', code: 'teruah_count', params: { expected: 9, detected: 8 } },
    ];
    const model = buildSetTimelineModel(short, issues, 0.1, 'tt');
    expect(model[1].status).toBe('error');
    expect(model[1].notes).toHaveLength(9);
    expect(model[1].notes.filter((n) => n.kind === 'ghost')).toHaveLength(1);
    expect(model[1].notes.filter((n) => n.kind !== 'ghost')).toHaveLength(8);
  });

  it('does not invent ghost notes when extra teruah notes were detected', () => {
    const extra = blast('teruah', Array.from({ length: 11 }, () => 0.08));
    const model = buildSetTimelineModel([extra], [], 0.1, 'tt');
    expect(model[0].notes).toHaveLength(11);
    expect(model[0].notes.some((n) => n.kind === 'ghost')).toBe(false);
  });

  it('keeps a short tekiah as wide as the scored minimum and shows a partial fill', () => {
    const blasts = [
      blast('tekiah', [0.9]),
      blast('shevarim', [0.3, 0.3, 0.3]),
      blast('teruah', Array.from({ length: 9 }, () => 0.08)),
      blast('tekiah', [2.2]),
    ];
    const issues: ScoreIssue[] = [
      { severity: 'error', code: 'opening_tekiah_too_short', params: { duration: 0.9, min: 1.8 } },
    ];
    const model = buildSetTimelineModel(blasts, issues, 0.1, 'tst');
    expect(model[0].status).toBe('error');
    expect(model[0].flexGrow).toBeGreaterThan(model[0].durationSec);
    expect(model[0].fillPct).toBeLessThan(100);
    expect(model[0].fillPct).toBeGreaterThan(0);
    expect(model[3].status).toBe('ok');
  });

  it('marks only the opening tekiah for an opening-length error', () => {
    const issues: ScoreIssue[] = [
      { severity: 'error', code: 'opening_tekiah_too_short', params: { duration: 1, min: 1.8 } },
    ];
    const model = buildSetTimelineModel(tashrat, issues, 0.1, 'tst');
    expect(model[0].status).toBe('error');
    expect(model[3].status).toBe('ok');
  });

  it('flags a short shever chip from shevarim_note_short', () => {
    const blasts = [blast('shevarim', [0.32, 0.08, 0.3])];
    const issues: ScoreIssue[] = [
      { severity: 'warn', code: 'shevarim_note_short', params: { n: 2, sec: 0.08 } },
    ];
    const model = buildSetTimelineModel(blasts, issues, 0.1, 'tsh');
    expect(model[0].status).toBe('warn');
    expect(model[0].notes.map((n) => n.kind)).toEqual(['ok', 'short', 'ok']);
  });
});
