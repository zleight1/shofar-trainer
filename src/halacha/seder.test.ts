import { describe, expect, it } from 'vitest';
import { SET_GROUPS, kolCountForSet, totalKolos } from './seder';
import { guidedStepsForSet } from './guided-steps';

describe('100-kol Rosh Hashana seder', () => {
  it('totals 100 kolos', () => {
    expect(totalKolos()).toBe(100);
    expect(SET_GROUPS).toHaveLength(30);
  });

  it('counts TST as 4 kolos and TSH/TT as 3', () => {
    const tst = SET_GROUPS.find((s) => s.pattern === 'tst')!;
    const tsh = SET_GROUPS.find((s) => s.pattern === 'tsh')!;
    const tt = SET_GROUPS.find((s) => s.pattern === 'tt')!;
    expect(kolCountForSet(tst)).toBe(4);
    expect(kolCountForSet(tsh)).toBe(3);
    expect(kolCountForSet(tt)).toBe(3);
  });

  it('uses one breath for every sitting tashrat', () => {
    const sittingTst = SET_GROUPS.filter((s) => s.section === 'sitting' && s.pattern === 'tst');
    expect(sittingTst).toHaveLength(3);
    expect(sittingTst.every((s) => s.stBreath === 'none')).toBe(true);
  });

  it('uses a breath between for every later tashrat', () => {
    const laterTst = SET_GROUPS.filter((s) => s.section !== 'sitting' && s.pattern === 'tst');
    expect(laterTst).toHaveLength(7);
    expect(laterTst.every((s) => s.stBreath === 'between')).toBe(true);
  });

  it('groups sitting as tashrat ×3, tashat ×3, tarat ×3 ending gedolah', () => {
    const sitting = SET_GROUPS.filter((s) => s.section === 'sitting');
    expect(sitting.map((s) => s.pattern)).toEqual([
      'tst',
      'tst',
      'tst',
      'tsh',
      'tsh',
      'tsh',
      'tt',
      'tt',
      'tt',
    ]);
    expect(sitting.at(-1)?.id).toBe('sit-3-tt');
    expect(sitting.at(-1)?.closingGedolah).toBe(true);
    expect(sitting.slice(0, -1).every((s) => !s.closingGedolah)).toBe(true);
    expect(guidedStepsForSet(sitting.at(-1)!).at(-1)?.type).toBe('tekiah_gedolah');
  });

  it('groups after musaf as thirty by type then a round of ten ending gedolah', () => {
    const after = SET_GROUPS.filter((s) => s.section === 'afterMusaf');
    expect(after.map((s) => s.pattern)).toEqual([
      'tst',
      'tst',
      'tst',
      'tsh',
      'tsh',
      'tsh',
      'tt',
      'tt',
      'tt',
      'tst',
      'tsh',
      'tt',
    ]);
    expect(after.filter((s) => s.closingGedolah).map((s) => s.id)).toEqual(['after-4-tt']);
    expect(guidedStepsForSet(after.at(-1)!).at(-1)?.type).toBe('tekiah_gedolah');
    const ordinaryTt = SET_GROUPS.find((s) => s.id === 'after-3-tt')!;
    expect(ordinaryTt.closingGedolah).toBeFalsy();
    expect(guidedStepsForSet(ordinaryTt).at(-1)?.type).toBe('tekiah');
  });

  it('closes sitting, shofarot, and the last after-musaf tarat with tekiah gedolah', () => {
    const closing = SET_GROUPS.filter((s) => s.closingGedolah);
    expect(closing.map((s) => s.id)).toEqual(['sit-3-tt', 'shofarot-tt', 'after-4-tt']);
    for (const set of closing) {
      const steps = guidedStepsForSet(set);
      expect(steps.at(-1)?.type).toBe('tekiah_gedolah');
    }
  });
});
