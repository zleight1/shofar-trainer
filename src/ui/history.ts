import {
  formatIlluminationSummary,
  getIllumination,
  loadIlluminations,
  type StoredIllumination,
} from '../store/illuminations';
import { clearSessions, formatSessionSummary, loadSessions } from '../store/sessions';
import { catalog } from '../i18n/t';
import type { Locale } from '../i18n/locale';
import { getLocale } from '../i18n/locale';
import { renderDisclaimer } from './chrome';
import { button, el } from './components';
import { renderSederIllumination } from './seder-illumination';

export interface HistoryMountOptions {
  onBack: () => void;
  onLocale: (next: Locale) => void;
  onRefreshRegister?: (refresh: () => void) => void;
}

export function mountHistory(root: HTMLElement, options: HistoryMountOptions): () => void {
  const container = el('div', 'history-view');
  root.appendChild(container);
  let selectedId: string | null = null;

  function render(): void {
    container.innerHTML = '';
    const locale = getLocale();
    const c = catalog(locale);
    renderDisclaimer(container, locale);

    if (selectedId) {
      const record = getIllumination(selectedId);
      if (record) {
        const backBtn = button(c.back, 'btn secondary');
        backBtn.addEventListener('click', () => {
          selectedId = null;
          render();
        });
        container.appendChild(backBtn);
        container.appendChild(
          el('p', 'illumination-history-date', formatIlluminationSummary(record, locale)),
        );
        renderSederIllumination(
          container,
          {
            kols: record.kols,
            passed: record.passed,
            total: record.total,
            clipId: record.id,
          },
          locale,
        );
        return;
      }
      selectedId = null;
    }

    const illuminations = loadIlluminations();
    const sessions = loadSessions();
    if (illuminations.length === 0 && sessions.length === 0) {
      container.appendChild(el('p', 'empty', c.historyEmpty));
      return;
    }

    if (illuminations.length > 0) {
      container.appendChild(el('h2', 'history-section-title', c.historyIlluminationsTitle));
      const list = el('ul', 'illumination-history');
      for (const record of illuminations) {
        list.appendChild(illuminationCard(record, locale, () => {
          selectedId = record.id;
          render();
        }));
      }
      container.appendChild(list);
    }

    if (sessions.length > 0) {
      container.appendChild(el('h2', 'history-section-title', c.historySetsTitle));
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
    clearBtn.addEventListener('click', () => {
      showConfirm(container, c.confirmClear, c.confirmYes, c.confirmNo, () => {
        selectedId = null;
        clearSessions();
        render();
      });
    });
    controls.append(clearBtn);
    container.appendChild(controls);
  }

  options.onRefreshRegister?.(render);
  render();
  return () => container.remove();
}

function illuminationCard(
  record: StoredIllumination,
  locale: Locale,
  onOpen: () => void,
): HTMLElement {
  const c = catalog(locale);
  const li = el('li', 'illumination-history-item');
  const open = button('', 'illumination-card');
  const summary = formatIlluminationSummary(record, locale);
  open.appendChild(el('span', 'illumination-card-summary', summary));
  open.appendChild(el('span', 'illumination-card-hint', c.historyOpenIllumination));
  open.setAttribute('aria-label', `${summary}. ${c.historyOpenIllumination}`);
  open.addEventListener('click', onOpen);
  li.appendChild(open);
  return li;
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
