import { describe, expect, it } from 'vitest';
import { catalog, formatIssue, patternLabel, sectionLabel } from './t';

describe('formatIssue', () => {
  it('uses catalog when params are present', () => {
    const text = formatIssue(
      {
        severity: 'error',
        code: 'teruah_count',
        params: { expected: 9, detected: 3 },
      },
      'en',
    );
    expect(text).toContain('9');
    expect(text).toContain('3');
  });

  it('keeps legacy message when params are missing', () => {
    const text = formatIssue(
      {
        severity: 'error',
        code: 'teruah_count',
        message: 'Expected at least 9 teruah blasts, detected 3',
      },
      'en',
    );
    expect(text).toBe('Expected at least 9 teruah blasts, detected 3');
    expect(text).not.toContain('detected 0');
  });
});

describe('catalog', () => {
  it('includes Redo set in both catalogs', () => {
    expect(catalog('en').redoSet.length).toBeGreaterThan(0);
    expect(catalog('he').redoSet.length).toBeGreaterThan(0);
  });

  it('includes illumination copy in both catalogs', () => {
    expect(catalog('en').illuminationTitle.length).toBeGreaterThan(0);
    expect(catalog('he').illuminationTitle.length).toBeGreaterThan(0);
    expect(catalog('en').illuminationSave.length).toBeGreaterThan(0);
    expect(catalog('he').illuminationSave.length).toBeGreaterThan(0);
  });

  it('includes live-session copy in both catalogs', () => {
    expect(catalog('en').liveSessionToggle.length).toBeGreaterThan(0);
    expect(catalog('he').liveSessionToggle.length).toBeGreaterThan(0);
    expect(catalog('en').previousSet.length).toBeGreaterThan(0);
    expect(catalog('he').previousSet.length).toBeGreaterThan(0);
  });

  it('includes seder overview copy in both catalogs', () => {
    expect(catalog('en').navSeder).toBe('Seder');
    expect(catalog('he').navSeder).toBe('סדר');
    expect(catalog('en').sederTitle.length).toBeGreaterThan(0);
    expect(catalog('he').sederTitle.length).toBeGreaterThan(0);
    expect(catalog('en').sederTotalLine({ n: 100 })).toContain('100');
    expect(catalog('he').sederTotalLine({ n: 100 })).toContain('100');
  });
});

describe('seder labels', () => {
  it('names sections and patterns in English and Hebrew', () => {
    expect(sectionLabel('sitting', catalog('en'))).toBe('Sitting 30');
    expect(sectionLabel('shofarot', catalog('he'))).toBe('שופרות');
    expect(patternLabel({ pattern: 'tst' }, catalog('en'))).toBe('Tashrat');
    expect(patternLabel({ pattern: 'tt', closingGedolah: true }, catalog('en'))).toBe(
      'Tarat with Tekiah Gedolah',
    );
  });
});
