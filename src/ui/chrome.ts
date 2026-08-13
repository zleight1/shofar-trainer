import type { Locale } from '../i18n/locale';
import { catalog } from '../i18n/t';
import { button, el } from './components';

export function renderLocaleToggle(
  parent: HTMLElement,
  locale: Locale,
  onLocale: (next: Locale) => void,
  disabled = false,
): void {
  const c = catalog(locale);
  const wrap = el('div', 'locale-toggle');
  wrap.setAttribute('role', 'group');
  const enBtn = button(c.localeEn, locale === 'en' ? 'btn locale-btn active' : 'btn locale-btn');
  const heBtn = button(c.localeHe, locale === 'he' ? 'btn locale-btn active' : 'btn locale-btn');
  enBtn.disabled = disabled || locale === 'en';
  heBtn.disabled = disabled || locale === 'he';
  enBtn.addEventListener('click', () => onLocale('en'));
  heBtn.addEventListener('click', () => onLocale('he'));
  wrap.append(enBtn, heBtn);
  parent.appendChild(wrap);
}

export function renderDisclaimer(parent: HTMLElement, locale: Locale): void {
  parent.appendChild(el('p', 'disclaimer', catalog(locale).disclaimer));
}

export function renderAppHeader(
  parent: HTMLElement,
  opts: {
    title: string;
    locale: Locale;
    onLocale: (next: Locale) => void;
    localeDisabled?: boolean;
  },
): void {
  const header = el('div', 'app-header');
  header.appendChild(el('h1', '', opts.title));
  renderLocaleToggle(header, opts.locale, opts.onLocale, opts.localeDisabled);
  parent.appendChild(header);
}
