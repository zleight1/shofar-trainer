import { describe, expect, it, beforeEach, vi } from 'vitest';
import { applyLocale, getLocale, htmlAttrsForLocale, setLocale } from './locale';
import { he } from './he';
import { en, type MessageCatalog } from './en';

const storage: Record<string, string> = {};

beforeEach(() => {
  for (const k of Object.keys(storage)) delete storage[k];
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => storage[k] ?? null,
    setItem: (k: string, v: string) => {
      storage[k] = v;
    },
    removeItem: (k: string) => {
      delete storage[k];
    },
  });
});

describe('locale', () => {
  it('defaults to en with dir=ltr', () => {
    expect(getLocale()).toBe('en');
    expect(htmlAttrsForLocale('en')).toEqual({ lang: 'en', dir: 'ltr' });
  });

  it('setting he writes localStorage and reports dir=rtl', () => {
    setLocale('he');
    expect(getLocale()).toBe('he');
    expect(htmlAttrsForLocale('he')).toEqual({ lang: 'he', dir: 'rtl' });
  });

  it('applyLocale sets document lang, dir, and title', () => {
    const html = { lang: '', dir: '' };
    vi.stubGlobal('document', {
      documentElement: html,
      title: '',
    });
    applyLocale('he', 'מאמן שופר');
    expect(html.lang).toBe('he');
    expect(html.dir).toBe('rtl');
    expect(document.title).toBe('מאמן שופר');
  });
});

describe('catalog contract', () => {
  it('Hebrew catalog matches English keys (compile-time MessageCatalog)', () => {
    const assigned: MessageCatalog = he;
    expect(Object.keys(assigned)).toEqual(Object.keys(en));
  });
});
