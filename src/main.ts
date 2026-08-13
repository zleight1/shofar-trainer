import './style.css';
import { getUnitDuration } from './store/sessions';
import { applyLocale, getLocale, setLocale, type Locale } from './i18n/locale';
import { catalog } from './i18n/t';
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

  function syncDocument(): void {
    const locale = getLocale();
    applyLocale(locale, catalog(locale).appTitle);
  }

  function changeLocale(next: Locale): void {
    if (viewBusy) return;
    setLocale(next);
    syncDocument();
    render();
  }

  function navigate(next: View): void {
    unmount?.();
    unmount = null;
    viewBusy = false;
    view = next;
    render();
  }

  function render(): void {
    app.innerHTML = '';
    unmount?.();
    syncDocument();
    const onLocale = () => changeLocale(getLocale() === 'en' ? 'he' : 'en');
    const onBusy = (busy: boolean) => {
      viewBusy = busy;
    };

    if (view === 'home') {
      renderHome(app as HTMLElement, navigate, onLocale);
    } else if (view === 'calibrate') {
      unmount = mountCalibrate(app as HTMLElement, {
        onDone: () => navigate('home'),
        onLocale,
        onBusy,
      });
    } else if (view === 'practice') {
      unmount = mountPractice(app as HTMLElement, {
        onBack: () => navigate('home'),
        onLocale,
        onBusy,
      });
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
  onLocale: () => void,
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
  nav.appendChild(makeNavBtn(c.navPractice, () => navigate('practice')));
  nav.appendChild(makeNavBtn(c.navCalibrate, () => navigate('calibrate')));
  nav.appendChild(makeNavBtn(c.navHistory, () => navigate('history')));
  nav.appendChild(makeNavBtn(c.navSources, () => navigate('sources')));
  shell.appendChild(nav);

  const footer = el('footer', 'footer');
  footer.appendChild(el('p', '', c.disclaimer));
  shell.appendChild(footer);

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
