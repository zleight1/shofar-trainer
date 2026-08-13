import { clearSessions, formatSessionSummary, loadSessions } from '../store/sessions';
import { catalog } from '../i18n/t';
import { getLocale } from '../i18n/locale';
import { renderAppHeader, renderDisclaimer } from './chrome';
import { button, el } from './components';

export interface HistoryMountOptions {
  onBack: () => void;
  onLocale: () => void;
}

export function mountHistory(root: HTMLElement, options: HistoryMountOptions): () => void {
  const container = el('div', 'history-view');
  root.appendChild(container);

  function render(): void {
    container.innerHTML = '';
    const locale = getLocale();
    const c = catalog(locale);
    renderAppHeader(container, {
      title: c.historyTitle,
      locale,
      onLocale: options.onLocale,
    });
    renderDisclaimer(container, locale);

    const sessions = loadSessions();
    if (sessions.length === 0) {
      container.appendChild(el('p', 'empty', c.historyEmpty));
    } else {
      const list = el('ul', 'session-list');
      for (const s of sessions.slice(0, 50)) {
        const li = el('li', s.passed ? 'pass' : 'fail');
        li.textContent = formatSessionSummary(s, locale);
        list.appendChild(li);
      }
      container.appendChild(list);

      const stats = el('div', 'stats');
      const passed = sessions.filter((s) => s.passed).length;
      stats.textContent = c.historyStats({ passed, total: sessions.length });
      container.appendChild(stats);
    }

    const controls = el('div', 'controls');
    const clearBtn = button(c.clearHistory, 'btn secondary');
    const backBtn = button(c.back, 'btn');
    clearBtn.addEventListener('click', () => {
      showConfirm(container, c.confirmClear, c.confirmYes, c.confirmNo, () => {
        clearSessions();
        render();
      });
    });
    backBtn.addEventListener('click', options.onBack);
    controls.append(backBtn, clearBtn);
    container.appendChild(controls);
  }

  render();
  return () => container.remove();
}

function showConfirm(
  parent: HTMLElement,
  question: string,
  yes: string,
  no: string,
  onYes: () => void,
): void {
  const existing = parent.querySelector('.confirm-row');
  existing?.remove();
  const row = el('div', 'confirm-row');
  row.appendChild(el('p', '', question));
  const yesBtn = button(yes, 'btn danger');
  const noBtn = button(no, 'btn secondary');
  yesBtn.addEventListener('click', onYes);
  noBtn.addEventListener('click', () => row.remove());
  row.append(yesBtn, noBtn);
  parent.appendChild(row);
}
