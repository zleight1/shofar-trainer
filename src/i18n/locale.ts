export const LOCALE_STORAGE_KEY = 'shofar-trainer-locale';

export type Locale = 'en' | 'he';

export function isLocale(value: string | null): value is Locale {
  return value === 'en' || value === 'he';
}

export function getLocale(): Locale {
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(raw) ? raw : 'en';
  } catch {
    return 'en';
  }
}

export function setLocale(locale: Locale): void {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

export function htmlAttrsForLocale(locale: Locale): { lang: string; dir: 'ltr' | 'rtl' } {
  return locale === 'he' ? { lang: 'he', dir: 'rtl' } : { lang: 'en', dir: 'ltr' };
}

export function applyLocale(locale: Locale, title: string): void {
  const { lang, dir } = htmlAttrsForLocale(locale);
  document.documentElement.lang = lang;
  document.documentElement.dir = dir;
  document.title = title;
}
