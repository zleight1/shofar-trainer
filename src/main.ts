import './style.css';
import { getUnitDuration } from './store/sessions';
import { isDiagnosticsEnabled, setDiagnosticsEnabled } from './store/diagnostics';
import { applyLocale, getLocale, setLocale, type Locale } from './i18n/locale';
import { catalog } from './i18n/t';
import { unlockCallouts } from './audio/callout-player';
import { mountCalibrate } from './ui/calibrate';
import { button, el } from './ui/components';
import { renderAppHeader, renderDisclaimer } from './ui/chrome';
import { mountHistory } from './ui/history';
import { mountPractice } from './ui/practice';
import { mountSources } from './ui/sources';

type View = 'home' | 'calibrate' | 'practice' | 'history' | 'sources';

function mountApp(): void {
  const app = document.querySelector('#app')!;
  let view: View = 'home';
  let unmount: (() => void) | null = null;
  let viewBusy = false;
  let refreshLocale: (() => void) | null = null;

  function syncDocument(): void {
    const locale = getLocale();
    applyLocale(locale, catalog(locale).appTitle);
  }

  function changeLocale(next: Locale): void {
    if (viewBusy) return;
    setLocale(next);
    syncDocument();
    if (refreshLocale) {
      refreshLocale();
      return;
    }
    render();
  }

  function navigate(next: View): void {
    unmount?.();
    unmount = null;
    refreshLocale = null;
    viewBusy = false;
    view = next;
    render();
  }

  function bindUnmount(fn: () => void): () => void {
    return () => {
      refreshLocale = null;
      fn();
    };
  }

  function render(): void {
    app.innerHTML = '';
    unmount?.();
    refreshLocale = null;
    syncDocument();
    const onLocale = (next: Locale) => changeLocale(next);
    const onBusy = (busy: boolean) => {
      viewBusy = busy;
    };
    const onRefreshRegister = (fn: () => void) => {
      refreshLocale = fn;
    };

    if (view === 'home') {
      renderHome(app as HTMLElement, navigate, onLocale);
    } else if (view === 'calibrate') {
      unmount = bindUnmount(
        mountCalibrate(app as HTMLElement, {
          onDone: () => navigate('home'),
          onLocale,
          onBusy,
          onRefreshRegister,
        }),
      );
    } else if (view === 'practice') {
      unmount = bindUnmount(
        mountPractice(app as HTMLElement, {
          onBack: () => navigate('home'),
          onLocale,
          onBusy,
          onRefreshRegister,
        }),
      );
    } else if (view === 'history') {
      unmount = mountHistory(app as HTMLElement, { onBack: () => navigate('home'), onLocale });
    } else if (view === 'sources') {
      unmount = mountSources(app as HTMLElement, { onBack: () => navigate('home'), onLocale });
    }
  }

  render();
}

function renderHome(
  root: HTMLElement,
  navigate: (v: View) => void,
  onLocale: (next: Locale) => void,
): void {
  const locale = getLocale();
  const c = catalog(locale);
  const unit = getUnitDuration();

  const shell = el('div', 'home');
  renderAppHeader(shell, { title: c.appTitle, locale, onLocale });
  shell.appendChild(el('p', 'tagline', c.tagline));
  renderDisclaimer(shell, locale);

  if (unit) {
    shell.appendChild(el('p', 'unit-badge', c.lastUnit({ ms: Math.round(unit * 1000) })));
  }

  const nav = el('nav', 'home-nav');
  nav.appendChild(
    makeNavBtn(c.navPractice, () => {
      unlockCallouts();
      navigate('practice');
    }),
  );
  nav.appendChild(
    makeNavBtn(c.navCalibrate, () => {
      unlockCallouts();
      navigate('calibrate');
    }),
  );
  nav.appendChild(makeNavBtn(c.navHistory, () => navigate('history')));
  nav.appendChild(makeNavBtn(c.navSources, () => navigate('sources')));
  shell.appendChild(nav);

  const diag = el('label', 'diag-toggle');
  const box = el('input');
  box.type = 'checkbox';
  box.checked = isDiagnosticsEnabled();
  box.addEventListener('change', () => setDiagnosticsEnabled(box.checked));
  diag.appendChild(box);
  diag.appendChild(document.createTextNode(c.diagnosticsToggle));
  shell.appendChild(diag);
  shell.appendChild(el('p', 'diagnostics-muted', c.diagnosticsHint));

  root.appendChild(shell);
}

function makeNavBtn(label: string, onClick: () => void): HTMLButtonElement {
  const b = button(label, 'btn nav-btn');
  b.addEventListener('click', onClick);
  return b;
}

mountApp();

if ('serviceWorker' in navigator) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true });
  });
}
