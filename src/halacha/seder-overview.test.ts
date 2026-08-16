import { describe, expect, it } from 'vitest';
import { SET_GROUPS, totalKolos } from './seder';
import {
  countedKolos,
  overviewBlocks,
  overviewKolosForSet,
  practiceKolos,
} from './seder-overview';

describe('seder overview model', () => {
  it('keeps calibration first and uncounted, then 100 kolos by when', () => {
    const blocks = overviewBlocks();
    expect(blocks.map((b) => b.section)).toEqual([
      'calibration',
      'sitting',
      'malchuyot',
      'zichronot',
      'shofarot',
      'afterMusaf',
    ]);
    expect(blocks[0].counted).toBe(false);
    expect(blocks[0].kolos).toBe(4);
    expect(blocks.slice(1).every((b) => b.counted)).toBe(true);
    expect(blocks.slice(1).map((b) => b.kolos)).toEqual([30, 10, 10, 10, 40]);
    expect(countedKolos(blocks)).toBe(100);
    expect(practiceKolos()).toBe(totalKolos());
  });

  it('uses one breath only for sitting tashrat, and marks both gedolah closings', () => {
    const blocks = overviewBlocks();
    const sitting = blocks.find((b) => b.section === 'sitting')!;
    const malchuyot = blocks.find((b) => b.section === 'malchuyot')!;
    const shofarot = blocks.find((b) => b.section === 'shofarot')!;
    const after = blocks.find((b) => b.section === 'afterMusaf')!;
    expect(sitting.stBreath).toBe('none');
    expect(sitting.rounds).toHaveLength(3);
    expect(malchuyot.stBreath).toBe('between');
    expect(shofarot.closingGedolah).toBe(true);
    expect(after.closingGedolah).toBe(true);
    expect(after.rounds).toHaveLength(4);
    expect(malchuyot.closingGedolah).toBe(false);
    expect(sitting.rounds.every((round) => round.kolos === 10)).toBe(true);
    expect(after.rounds.every((round) => round.kolos === 10)).toBe(true);
  });

  it('expands one-breath tashrat to four sounding kolos without a breath mark', () => {
    const sitting = SET_GROUPS.find((s) => s.id === 'sit-1-tst')!;
    const kolos = overviewKolosForSet(sitting);
    expect(kolos.map((k) => k.type)).toEqual(['tekiah', 'shevarim', 'teruah', 'tekiah']);
    expect(kolos.some((k) => k.breathAfter)).toBe(false);
  });

  it('marks a breath after shevarim on later tashrat', () => {
    const musaf = SET_GROUPS.find((s) => s.id === 'malchuyot-tst')!;
    const kolos = overviewKolosForSet(musaf);
    expect(kolos.map((k) => k.type)).toEqual(['tekiah', 'shevarim', 'teruah', 'tekiah']);
    expect(kolos[1].breathAfter).toBe(true);
  });

  it('ends shofarot and the last after-musaf tarat with tekiah gedolah', () => {
    const shofarot = SET_GROUPS.find((s) => s.id === 'shofarot-tt')!;
    const last = SET_GROUPS.find((s) => s.id === 'after-4-tt')!;
    expect(overviewKolosForSet(shofarot).at(-1)?.type).toBe('tekiah_gedolah');
    expect(overviewKolosForSet(last).at(-1)?.type).toBe('tekiah_gedolah');
  });
});
