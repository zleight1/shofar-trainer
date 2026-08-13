import { describe, expect, it } from 'vitest';
import { SOURCES } from './sources';
import { en } from '../i18n/en';
import { he } from '../i18n/he';

describe('sources catalog', () => {
  it('includes the reviewed corpus', () => {
    const ids = SOURCES.map((s) => s.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'sa-590',
        'mb-590',
        'rambam-shofar-3',
        'ahs-590',
        'peninei-4-11',
        'mishnah-rh-4-9',
      ]),
    );
  });

  it('has non-empty hebrew, english, and links', () => {
    for (const entry of SOURCES) {
      expect(entry.hebrew.length).toBeGreaterThan(10);
      expect(entry.english.length).toBeGreaterThan(10);
      expect(entry.links.length).toBeGreaterThan(0);
    }
  });

  it('marks MB encoded and study-only texts as not encoded', () => {
    expect(SOURCES.find((s) => s.id === 'mb-590')?.encoded).toBe(true);
    expect(SOURCES.find((s) => s.id === 'rambam-shofar-3')?.encoded).toBe(false);
    expect(SOURCES.find((s) => s.id === 'sa-590')?.encoded).toBe(false);
    expect(SOURCES.find((s) => s.id === 'mishnah-rh-4-9')?.encoded).toBe(false);
  });

  it('has disclaimer and minhag notes in both catalogs', () => {
    expect(en.disclaimer.length).toBeGreaterThan(10);
    expect(he.disclaimer.length).toBeGreaterThan(10);
    expect(en.minhagNote.toLowerCase()).toContain('rema');
    expect(he.minhagNote).toContain('רמ״א');
  });
});
