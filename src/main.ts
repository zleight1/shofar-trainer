import './style.css';
import { applyLocale, getLocale, setLocale, type Locale } from './i18n/locale';
import { catalog } from './i18n/t';
import { mountCalibrate } from './ui/calibrate';
import { el } from './ui/components';
import {
  renderAppHeader,
  renderTabBar,
  titleForView,
  type AppTab,
} from './ui/chrome';
import { mountHistory } from './ui/history';
import { mountPractice } from './ui/practice';
import { mountSederOverview } from './ui/seder-overview';
import { mountSources } from './ui/sources';

type View = AppTab;

function mountApp(): void {
  const app = document.querySelector('#app')!;
  let view: View = 'practice';
  let unmount: (() => void) | null = null;
  let viewBusy = false;
  let sessionLocked = false;
  let refreshLocale: (() => void) | null = null;

  const shell = el('div', 'app-shell');
  const topbar = el('header', 'app-topbar');
  const content = el('main', 'app-content');
  const tabbar = el('nav', 'app-tabbar');
  shell.append(topbar, content, tabbar);
  app.appendChild(shell);

  function syncDocument(): void {
    const locale = getLocale();
    applyLocale(locale, catalog(locale).appTitle);
  }

  function syncShellState(): void {
    shell.classList.toggle('is-busy', viewBusy);
    shell.classList.toggle('session-locked', sessionLocked);
  }

  function onLocale(next: Locale): void {
    changeLocale(next);
  }

  function renderChrome(): void {
    const locale = getLocale();
    const c = catalog(locale);
    renderAppHeader(topbar, {
      title: titleForView(view, c),
      locale,
      onLocale,
      localeDisabled: viewBusy,
    });
    renderTabBar(tabbar, {
      active: view,
      locale,
      disabled: viewBusy || sessionLocked,
      onNavigate: navigate,
    });
    syncShellState();
  }

  function changeLocale(next: Locale): void {
    if (viewBusy) return;
    setLocale(next);
    syncDocument();
    renderChrome();
    if (refreshLocale) {
      refreshLocale();
      return;
    }
    mountView();
  }

  function navigate(next: View): void {
    unmount?.();
    unmount = null;
    refreshLocale = null;
    viewBusy = false;
    sessionLocked = false;
    view = next;
    mountView();
  }

  function bindUnmount(fn: () => void): () => void {
    return () => {
      refreshLocale = null;
      fn();
    };
  }

  function mountView(): void {
    unmount?.();
    unmount = null;
    refreshLocale = null;
    content.replaceChildren();
    syncDocument();
    renderChrome();

    const onBusy = (busy: boolean) => {
      viewBusy = busy;
      renderChrome();
    };
    const onSessionLock = (locked: boolean) => {
      sessionLocked = locked;
      syncShellState();
    };
    const onRefreshRegister = (fn: () => void) => {
      refreshLocale = fn;
    };

    if (view === 'practice') {
      unmount = bindUnmount(
        mountPractice(content, {
          onBack: () => navigate('practice'),
          onLocale,
          onBusy,
          onSessionLock,
          onRefreshRegister,
        }),
      );
    } else if (view === 'calibrate') {
      unmount = bindUnmount(
        mountCalibrate(content, {
          onDone: () => navigate('practice'),
          onLocale,
          onBusy,
          onRefreshRegister,
        }),
      );
    } else if (view === 'seder') {
      unmount = bindUnmount(
        mountSederOverview(content, {
          onBack: () => navigate('practice'),
          onLocale,
          onRefreshRegister,
        }),
      );
    } else if (view === 'history') {
      unmount = mountHistory(content, { onBack: () => navigate('practice'), onLocale });
    } else if (view === 'sources') {
      unmount = mountSources(content, { onBack: () => navigate('practice'), onLocale });
    } else {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }

  mountView();
}

mountApp();

if ('serviceWorker' in navigator) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true });
  });
}
