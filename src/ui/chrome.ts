import type { MessageCatalog } from '../i18n/en';
import type { Locale } from '../i18n/locale';
import { catalog } from '../i18n/t';
import { isDiagnosticsEnabled, setDiagnosticsEnabled } from '../store/diagnostics';
import { button, el } from './components';

export const APP_TABS = ['practice', 'calibrate', 'seder', 'history', 'sources'] as const;
export type AppTab = (typeof APP_TABS)[number];

/** Practice is a ram: a shofar is a ram's horn. Horn curl + eye are evenodd holes. */
export const TAB_ICON_PATHS: Record<AppTab, string> = {
  practice:
    'M10.4 8.6C7.6 6.6 8.2 2.4 11.8 1.6c3.6-.8 6.6 1.6 6.6 4.8 0 1.6-.8 3-2 3.8 1.4.3 2.6 1 3.4 2.1.9 1.4.6 3.2-.6 4.3-1 .9-2.4 1.2-3.6.8l-.5 1.4c-.3.9-1.3 1.4-2.2 1.2l-3.4-.7C8.2 19.7 6 20.8 4.4 22.4c.3-2.5 1.4-4.8 3.2-6.6 1.5-1.5 3.4-2.5 5.4-2.8-.5-1.1-1.5-2.1-2.6-3.4zM12.4 4.6c-1.5.3-2.3 1.6-2 2.8.7-.1 1.5 0 2.3.3 1.1.4 2 1.2 2.6 2.2 1-.7 1.5-2 1.3-3.1-.3-1.4-2-2.5-4.2-2.2zM16.7 12.4a.95.95 0 1 1-1.9 0 .95.95 0 0 1 1.9 0z',
  calibrate:
    'M7 4v16M12 8v12M17 6v14M4 14h6M9 10h6M14 16h6',
  seder: 'M4 6h16M4 12h16M4 18h10',
  history:
    'M12 4.5a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15zm0 3v5l3.5 2',
  sources:
    'M5 5.5c1.6-.8 3.4-.8 5 0v13c-1.6-.8-3.4-.8-5 0V5.5zm9 0c1.6-.8 3.4-.8 5 0v13c-1.6-.8-3.4-.8-5 0V5.5zM12 5.5v13',
};

export function titleForView(view: AppTab, c: MessageCatalog): string {
  switch (view) {
    case 'practice':
      return c.practiceTitle;
    case 'calibrate':
      return c.calibrateTitle;
    case 'seder':
      return c.sederTitle;
    case 'history':
      return c.historyTitle;
    case 'sources':
      return c.sourcesTitle;
    default: {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }
}

export function tabLabel(view: AppTab, c: MessageCatalog): string {
  switch (view) {
    case 'practice':
      return c.navPractice;
    case 'calibrate':
      return c.navCalibrate;
    case 'seder':
      return c.navSeder;
    case 'history':
      return c.navHistory;
    case 'sources':
      return c.navSources;
    default: {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }
}

export function renderLocaleToggle(
  parent: HTMLElement,
  locale: Locale,
  onLocale: (next: Locale) => void,
  disabled = false,
): void {
  const c = catalog(locale);
  const wrap = el('div', 'locale-toggle');
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label', `${c.localeEn} / ${c.localeHe}`);
  const enBtn = button(c.localeEn, locale === 'en' ? 'btn primary locale-btn' : 'btn locale-btn');
  const heBtn = button(c.localeHe, locale === 'he' ? 'btn primary locale-btn' : 'btn locale-btn');
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

export function renderDiagnosticsToggle(parent: HTMLElement, locale: Locale): void {
  const c = catalog(locale);
  const diag = el('label', 'diag-toggle');
  const box = el('input');
  box.type = 'checkbox';
  box.checked = isDiagnosticsEnabled();
  box.addEventListener('change', () => setDiagnosticsEnabled(box.checked));
  diag.appendChild(box);
  diag.appendChild(document.createTextNode(` ${c.diagnosticsToggle}`));
  parent.appendChild(diag);
  parent.appendChild(el('p', 'diagnostics-muted', c.diagnosticsHint));
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
  parent.replaceChildren();
  parent.appendChild(el('h1', 'app-title', opts.title));
  renderLocaleToggle(parent, opts.locale, opts.onLocale, opts.localeDisabled);
}

export function renderTabBar(
  parent: HTMLElement,
  opts: {
    active: AppTab;
    locale: Locale;
    disabled?: boolean;
    onNavigate: (view: AppTab) => void;
  },
): void {
  const c = catalog(opts.locale);
  parent.replaceChildren();
  parent.setAttribute('aria-label', c.navMain);

  for (const tab of APP_TABS) {
    const btn = button('', opts.active === tab ? 'tab-btn active' : 'tab-btn');
    btn.type = 'button';
    btn.append(tabIcon(tab), el('span', 'tab-label', tabLabel(tab, c)));
    if (opts.active === tab) {
      btn.setAttribute('aria-current', 'page');
    }
    btn.disabled = Boolean(opts.disabled) && opts.active !== tab;
    btn.addEventListener('click', () => {
      if (tab !== opts.active) opts.onNavigate(tab);
    });
    parent.appendChild(btn);
  }
}

function tabIcon(tab: AppTab): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('tab-icon');
  const shape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  shape.setAttribute('d', TAB_ICON_PATHS[tab]);
  const filled = tab === 'practice';
  shape.setAttribute('fill', filled ? 'currentColor' : 'none');
  shape.setAttribute('fill-rule', filled ? 'evenodd' : 'nonzero');
  shape.setAttribute('stroke', 'currentColor');
  shape.setAttribute('stroke-width', filled ? '0' : '1.75');
  shape.setAttribute('stroke-linecap', 'round');
  shape.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(shape);
  return svg;
}
