import { describe, expect, it } from 'vitest';
import { inferPattern, unitsFor } from './units';

describe('unitsFor', () => {
  it('uses 18 units for Tashrat tekiah', () => {
    expect(unitsFor('tst', 'tekiah')).toBe(18);
  });

  it('uses 9 units for Tashat and Tarat tekiah', () => {
    expect(unitsFor('tsh', 'tekiah')).toBe(9);
    expect(unitsFor('tt', 'tekiah')).toBe(9);
  });

  it('uses 18 units for gedolah', () => {
    expect(unitsFor('gedolah', 'tekiah_gedolah')).toBe(18);
  });
});

describe('inferPattern', () => {
  it('infers tst when shevarim and teruah are present', () => {
    expect(inferPattern(['tekiah', 'shevarim', 'teruah', 'tekiah'])).toBe('tst');
  });
});
