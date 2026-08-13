import type { AnalysisResult } from '../halacha/types';
import type { DetailedAnalysisResult } from '../audio/analyze';
import type { Locale } from '../i18n/locale';
import { getLocale } from '../i18n/locale';
import { blastLabel, catalog, formatIssue } from '../i18n/t';
import { speakAndWait as speakUtterance } from '../i18n/speech';

export interface FeedbackSections {
  showStatus?: boolean;
  showNotes?: boolean;
  showDetected?: boolean;
}

export function renderAnalysisFeedback(
  container: HTMLElement,
  result: AnalysisResult,
  locale: Locale = getLocale(),
  sections: FeedbackSections = {},
): void {
  const c = catalog(locale);
  const showStatus = sections.showStatus !== false;
  const showNotes = sections.showNotes !== false;
  const showDetected = sections.showDetected !== false;

  container.innerHTML = '';
  if (showStatus) {
    const status = document.createElement('div');
    status.className = `feedback-status ${result.passed ? 'pass' : 'fail'}`;
    status.textContent = result.passed ? c.passed : c.needsWork;
    container.appendChild(status);
  }

  const disclaimer = document.createElement('p');
  disclaimer.className = 'disclaimer';
  disclaimer.textContent = c.disclaimer;
  container.appendChild(disclaimer);

  if (result.tekiahRatio !== null) {
    const ratio = document.createElement('p');
    ratio.className = 'feedback-ratio';
    ratio.textContent = c.tekiahMiddleRatio({ pct: Math.round(result.tekiahRatio * 100) });
    container.appendChild(ratio);
  }

  if (
    showNotes &&
    'noteSegments' in result &&
    Array.isArray((result as DetailedAnalysisResult).noteSegments)
  ) {
    const notes = (result as DetailedAnalysisResult).noteSegments;
    const noteLine = document.createElement('p');
    noteLine.className = 'feedback-notes';
    noteLine.textContent = c.notesDetected({
      count: notes.length,
      detail: notes.map((n, i) => `#${i + 1} ${(n.durationSec * 1000).toFixed(0)}ms`).join(', '),
    });
    container.appendChild(noteLine);
  }

  if (showDetected && result.classified.length > 0) {
    const detected = document.createElement('ul');
    detected.className = 'feedback-detected';
    for (const blast of result.classified) {
      const li = document.createElement('li');
      li.textContent = c.blastLine({
        label: blastLabel(blast.type, locale),
        notes: blast.segments.length,
        sec: blast.totalDurationSec.toFixed(2),
      });
      detected.appendChild(li);
    }
    container.appendChild(detected);
  }

  if (result.issues.length > 0) {
    const list = document.createElement('ul');
    list.className = 'feedback-issues';
    for (const issue of result.issues) {
      const li = document.createElement('li');
      li.className = issue.severity;
      li.textContent = formatIssue(issue, locale);
      list.appendChild(li);
    }
    container.appendChild(list);
  }
}

export function speak(text: string): void {
  void speakUtterance(text, 0);
}

export async function speakAndWait(text: string, postDelayMs = 500): Promise<void> {
  await speakUtterance(text, postDelayMs);
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function button(label: string, className = 'btn'): HTMLButtonElement {
  return el('button', className, label);
}

export type { DetailedAnalysisResult };
