import { describe, expect, it } from 'vitest';
import { catalog } from '../i18n/t';
import { APP_TABS, TAB_ICON_PATHS, tabLabel, titleForView } from './chrome';

describe('app chrome labels', () => {
  it('covers every tab in English and Hebrew', () => {
    for (const locale of ['en', 'he'] as const) {
      const c = catalog(locale);
      expect(APP_TABS.map((tab) => tabLabel(tab, c))).toEqual(
        locale === 'en'
          ? ['Practice', 'Calibrate', 'Seder', 'History', 'Sources']
          : ['תרגול', 'כיול', 'סדר', 'היסטוריה', 'מקורות'],
      );
      expect(titleForView('practice', c).length).toBeGreaterThan(0);
      expect(titleForView('calibrate', c).length).toBeGreaterThan(0);
      expect(titleForView('seder', c).length).toBeGreaterThan(0);
      expect(titleForView('history', c).length).toBeGreaterThan(0);
      expect(titleForView('sources', c).length).toBeGreaterThan(0);
    }
  });
});

describe('tab icons', () => {
  it('draws practice as a ram with a horn hole, not the old shofar stroke', () => {
    expect(TAB_ICON_PATHS.practice).toContain('M12.4 4.6');
    expect(TAB_ICON_PATHS.practice).toContain('M16.7 12.4');
    expect(TAB_ICON_PATHS.practice).not.toContain('M5 18c0-5.5');
  });
});
