import { describe, expect, it } from 'vitest';
import { guidedStepsForSet } from '../halacha/guided-steps';
import { SET_GROUPS, kolCountForSet, totalKolos } from '../halacha/seder';
import type { BlastType, ClassifiedBlast, ScoreIssue } from '../halacha/types';
import { illuminationSvg, sectionSwatch } from './seder-illumination';
import {
  buildSessionKols,
  expandClassified,
  illuminationRecordFromTakes,
  kolosFromSet,
  passedSetCount,
  upsertSetTake,
  type SetTake,
} from './seder-illumination-model';

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

function passingBlasts(type: BlastType): ClassifiedBlast {
  switch (type) {
    case 'tekiah':
      return blast('tekiah', [2.2]);
    case 'tekiah_gedolah':
      return blast('tekiah_gedolah', [4.2]);
    case 'shevarim':
      return blast('shevarim', [0.32, 0.3, 0.31]);
    case 'teruah':
      return blast('teruah', Array.from({ length: 9 }, () => 0.09));
    case 'shevarim_teruah':
      return blast('shevarim_teruah', [
        0.32, 0.3, 0.31,
        ...Array.from({ length: 9 }, () => 0.09),
      ]);
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

function takeFor(set: SetTake['set'], overrides: Partial<SetTake> = {}): SetTake {
  return {
    set,
    blasts: guidedStepsForSet(set).map((step) => passingBlasts(step.type)),
    issues: [],
    passed: true,
    unitSec: 0.1,
    ...overrides,
  };
}

function fullSederTakes(): SetTake[] {
  return SET_GROUPS.map((set) => takeFor(set));
}

function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe('expandClassified', () => {
  it('splits one-breath shevarim-teruah into two kolos', () => {
    const expanded = expandClassified(
      [
        blast('tekiah', [2]),
        passingBlasts('shevarim_teruah'),
        blast('tekiah', [2.1]),
      ],
      0.1,
    );
    expect(expanded.map((b) => b.type)).toEqual(['tekiah', 'shevarim', 'teruah', 'tekiah']);
    expect(expanded[1].segments).toHaveLength(3);
    expect(expanded[2].segments).toHaveLength(9);
  });

  it('still emits shevarim and teruah when the combined take has no notes', () => {
    const expanded = expandClassified([blast('shevarim_teruah', [])], 0.1);
    expect(expanded.map((b) => b.type)).toEqual(['shevarim', 'teruah']);
  });
});

describe('kolosFromSet', () => {
  it('turns sitting tashrat into four kolos', () => {
    const sitting = SET_GROUPS.find((s) => s.id === 'sit-1-tst')!;
    const kols = kolosFromSet(takeFor(sitting), 0);
    expect(guidedStepsForSet(sitting)).toHaveLength(3);
    expect(kols).toHaveLength(4);
    expect(kols.map((k) => k.type)).toEqual(['tekiah', 'shevarim', 'teruah', 'tekiah']);
    expect(kols.map((k) => k.index)).toEqual([0, 1, 2, 3]);
    expect(kols.every((k) => k.section === 'sitting')).toBe(true);
  });

  it('keeps standing tashrat as four recorded kolos', () => {
    const musaf = SET_GROUPS.find((s) => s.id === 'malchuyot-tst')!;
    const kols = kolosFromSet(takeFor(musaf), 10);
    expect(guidedStepsForSet(musaf)).toHaveLength(4);
    expect(kols).toHaveLength(4);
    expect(kols[0].index).toBe(10);
    expect(kols[0].section).toBe('malchuyot');
  });

  it('skips calibration', () => {
    const kols = kolosFromSet(
      takeFor({
        id: 'calibration-tst',
        label: 'cal',
        stepIds: [],
        pattern: 'tst',
        section: 'calibration',
        stBreath: 'none',
      }),
      0,
    );
    expect(kols).toHaveLength(0);
  });

  it('marks a short opening tekiah as an error and a weaker fill', () => {
    const sitting = SET_GROUPS.find((s) => s.id === 'sit-1-tst')!;
    const issues: ScoreIssue[] = [
      { severity: 'error', code: 'opening_tekiah_too_short', params: { duration: 0.8, min: 1.8 } },
    ];
    const kols = kolosFromSet(
      takeFor(sitting, {
        blasts: [
          blast('tekiah', [0.8]),
          passingBlasts('shevarim_teruah'),
          blast('tekiah', [2.2]),
        ],
        issues,
        passed: false,
      }),
      0,
    );
    expect(kols[0].status).toBe('error');
    expect(kols[0].fill).toBeLessThan(kols[3].fill);
    expect(kols[3].status).toBe('ok');
    expect(kols.every((k) => k.setPassed === false)).toBe(true);
  });
});

describe('buildSessionKols', () => {
  it('synthesizes 100 kolos from the full seder, including sitting one-breath tashrat', () => {
    const takes = fullSederTakes();
    const kols = buildSessionKols(takes);
    expect(totalKolos()).toBe(100);
    expect(takes.reduce((sum, t) => sum + kolCountForSet(t.set), 0)).toBe(100);
    expect(kols).toHaveLength(100);
    expect(kols.filter((k) => k.section === 'sitting')).toHaveLength(30);
    expect(kols.filter((k) => k.type === 'tekiah_gedolah')).toHaveLength(3);
    expect(passedSetCount(takes)).toEqual({ passed: 30, total: 30 });
    expect(illuminationRecordFromTakes(takes).kols).toHaveLength(100);
    expect(illuminationRecordFromTakes(takes).passed).toBe(30);
  });
});

describe('illuminationSvg', () => {
  const copy = {
    title: 'The 100',
    description: 'Illumination of 100 kolos.',
    creditLine: 'Inspired by Avraham Loewenthal',
    creditUrlLabel: 'Tzfat Gallery of Mystical Art · kabbalahart.com',
    dir: 'ltr' as const,
  };

  it('draws one mirrored band per kol with a central spine', () => {
    const kols = buildSessionKols(fullSederTakes());
    const svg = illuminationSvg(kols, copy);
    expect(count(svg, 'class="kol-band"')).toBe(100);
    expect(count(svg, 'class="left"')).toBe(100);
    expect(count(svg, 'class="right"')).toBe(100);
    expect(svg).toContain('data-kol="0"');
    expect(svg).toContain('data-kol="99"');
    expect(svg).toContain('class="spine"');
    expect(svg).toContain('transform="matrix(-1 0 0 1 280 0)"');
    expect(svg).toContain('class="separator"');
    expect(svg).toContain('class="section-rule"');
    expect(svg).toContain('data-type="tekiah_gedolah"');
    expect(svg).toContain('data-section="sitting"');
    expect(svg).toContain('data-section="afterMusaf"');
    expect(svg).toContain(copy.title);
    expect(svg).toContain('Avraham Loewenthal');
    expect(svg).toContain('kabbalahart.com');
    expect(svg).toContain('class="credit"');
    expect(svg).toContain('width="280"');
  });

  it('uses a unique clip id so history can show more than one graph', () => {
    const kols = buildSessionKols(fullSederTakes());
    const first = illuminationSvg(kols, { ...copy, clipId: 'one' });
    const second = illuminationSvg(kols, { ...copy, clipId: 'two' });
    expect(first).toContain('id="illumination-clip-one"');
    expect(first).toContain('url(#illumination-clip-one)');
    expect(second).toContain('id="illumination-clip-two"');
    expect(first).not.toContain('illumination-clip-two');
  });

  it('writes Hebrew credit under the artwork', () => {
    const kols = buildSessionKols(fullSederTakes());
    const svg = illuminationSvg(kols, {
      title: 'המאה',
      description: 'רישום של 100 קולות.',
      creditLine: 'בהשראת אברהם לוונטל',
      creditUrlLabel: 'גלריית צפת לאמנות מיסטית · kabbalahart.com',
      dir: 'rtl',
    });
    expect(svg).toContain('בהשראת אברהם לוונטל');
    expect(svg).toContain('direction="rtl"');
    expect(svg).toContain('kabbalahart.com');
  });

  it('is deterministic for the same seder', () => {
    const kols = buildSessionKols(fullSederTakes());
    expect(illuminationSvg(kols, copy)).toBe(illuminationSvg(kols, copy));
  });

  it('paints failed kolos as error bands', () => {
    const sitting = SET_GROUPS.find((s) => s.id === 'sit-1-tst')!;
    const kols = kolosFromSet(
      takeFor(sitting, {
        blasts: [
          blast('tekiah', [0.8]),
          passingBlasts('shevarim_teruah'),
          blast('tekiah', [2.2]),
        ],
        issues: [{ severity: 'error', code: 'opening_tekiah_too_short', params: { duration: 0.8, min: 1.8 } }],
        passed: false,
      }),
      0,
    );
    const svg = illuminationSvg(kols, copy);
    expect(svg).toContain('data-status="error"');
    expect(svg).toContain('data-status="ok"');
  });

  it('gives each seder section a distinct swatch', () => {
    const colors = new Set([
      sectionSwatch('sitting'),
      sectionSwatch('malchuyot'),
      sectionSwatch('zichronot'),
      sectionSwatch('shofarot'),
      sectionSwatch('afterMusaf'),
    ]);
    expect(colors.size).toBe(5);
  });
});

describe('upsertSetTake', () => {
  it('replaces a redone set instead of appending a second take', () => {
    const first = SET_GROUPS[0];
    const second = SET_GROUPS[1];
    const passed = takeFor(first, { passed: true });
    const failed = takeFor(first, { passed: false });
    const other = takeFor(second, { passed: true });

    const afterFirst = upsertSetTake([], passed);
    expect(afterFirst).toEqual([passed]);

    const afterRedo = upsertSetTake(afterFirst, failed);
    expect(afterRedo).toEqual([failed]);

    const afterNext = upsertSetTake(afterRedo, other);
    expect(afterNext).toEqual([failed, other]);
  });
});
