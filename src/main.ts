import './style.css';
import { getUnitDuration } from './store/sessions';
import { mountCalibrate } from './ui/calibrate';
import { button, el } from './ui/components';
import { mountHistory } from './ui/history';
import { mountPractice } from './ui/practice';

type View = 'home' | 'calibrate' | 'practice' | 'history';

function mountApp(): void {
  const app = document.querySelector('#app')!;
  let view: View = 'home';
  let unmount: (() => void) | null = null;

  function navigate(next: View): void {
    unmount?.();
    unmount = null;
    view = next;
    render();
  }

  function render(): void {
    app.innerHTML = '';
    unmount?.();

    if (view === 'home') {
      renderHome(app as HTMLElement, navigate);
    } else if (view === 'calibrate') {
      unmount = mountCalibrate(app as HTMLElement, { onDone: () => navigate('home') });
    } else if (view === 'practice') {
      unmount = mountPractice(app as HTMLElement, { onBack: () => navigate('home') });
    } else if (view === 'history') {
      unmount = mountHistory(app as HTMLElement, { onBack: () => navigate('home') });
    }
  }

  render();
}

function renderHome(root: HTMLElement, navigate: (v: View) => void): void {
  const unit = getUnitDuration();

  const shell = el('div', 'home');
  shell.appendChild(el('h1', '', 'Shofar Trainer'));
  shell.appendChild(
    el('p', 'tagline', 'Makrei-style guided practice with live timing feedback'),
  );

  if (unit) {
    shell.appendChild(el('p', 'unit-badge', `Last unit: ${(unit * 1000).toFixed(0)} ms`));
  }

  const nav = el('nav', 'home-nav');
  nav.appendChild(makeNavBtn('Practice (guided)', () => navigate('practice')));
  nav.appendChild(makeNavBtn('Calibrate manually', () => navigate('calibrate')));
  nav.appendChild(makeNavBtn('History', () => navigate('history')));
  shell.appendChild(nav);

  const footer = el('footer', 'footer');
  footer.appendChild(el('p', '', 'Personal training tool — not a halachic ruling.'));
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
