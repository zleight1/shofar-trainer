import { clearSessions, formatSessionSummary, loadSessions } from '../store/sessions';
import { button, el } from './components';

export interface HistoryMountOptions {
  onBack: () => void;
}

export function mountHistory(root: HTMLElement, options: HistoryMountOptions): () => void {
  const container = el('div', 'history-view');
  root.appendChild(container);

  function render(): void {
    container.innerHTML = '';
    container.appendChild(el('h2', '', 'Session History'));

    const sessions = loadSessions();
    if (sessions.length === 0) {
      container.appendChild(el('p', 'empty', 'No sessions yet. Complete a practice set to see results here.'));
    } else {
      const list = el('ul', 'session-list');
      for (const s of sessions.slice(0, 50)) {
        const li = el('li', s.passed ? 'pass' : 'fail');
        li.textContent = formatSessionSummary(s);
        if (s.issues.length > 0) {
          const detail = el('span', 'issue-detail', ` — ${s.issues[0].message}`);
          li.appendChild(detail);
        }
        list.appendChild(li);
      }
      container.appendChild(list);

      const stats = el('div', 'stats');
      const passed = sessions.filter((s) => s.passed).length;
      stats.textContent = `${passed}/${sessions.length} sets passed overall`;
      container.appendChild(stats);
    }

    const controls = el('div', 'controls');
    const clearBtn = button('Clear history', 'btn secondary');
    const backBtn = button('Back', 'btn');
    clearBtn.addEventListener('click', () => {
      if (confirm('Clear all session history?')) {
        clearSessions();
        render();
      }
    });
    backBtn.addEventListener('click', options.onBack);
    controls.append(backBtn, clearBtn);
    container.appendChild(controls);
  }

  render();
  return () => container.remove();
}
