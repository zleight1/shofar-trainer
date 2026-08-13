import type { AnalysisResult } from '../halacha/types';
import type { DetailedAnalysisResult } from '../audio/analyze';
import type { Locale } from '../i18n/locale';
import { getLocale } from '../i18n/locale';
import { blastLabel, catalog, formatIssue } from '../i18n/t';
import { cachedVoices, loadVoices, shouldSpeakCallouts, utteranceForCallout } from '../i18n/speech';

const COLORS: Record<string, string> = {
  tekiah: '#4ade80',
  shevarim: '#60a5fa',
  teruah: '#fbbf24',
  shevarim_teruah: '#a78bfa',
  tekiah_gedolah: '#f472b6',
  default: '#94a3b8',
};

const CANVAS_LABELS: Record<string, string> = {
  tekiah: 'T',
  shevarim: 'Sh',
  teruah: 'Tr',
  shevarim_teruah: 'Sh+Tr',
  tekiah_gedolah: 'T↑',
};

export function renderWaveform(
  canvas: HTMLCanvasElement,
  samples: Float32Array,
  analysis: DetailedAnalysisResult | null,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  ctx.fillStyle = '#0f1628';
  ctx.fillRect(0, 0, width, height);

  const mid = height / 2;
  const step = Math.max(1, Math.floor(samples.length / width));

  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x < width; x++) {
    const i = x * step;
    const y = mid - samples[i] * (height * 0.42);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  if (!analysis) return;

  for (const blast of analysis.classified) {
    if (blast.segments.length === 0) continue;
    const start = blast.segments[0].startSample;
    const end = blast.segments[blast.segments.length - 1].endSample;
    const x0 = (start / samples.length) * width;
    const x1 = (end / samples.length) * width;
    const color = COLORS[blast.type] ?? COLORS.default;
    const w = Math.max(x1 - x0, 2);

    ctx.fillStyle = color + '40';
    ctx.fillRect(x0, 0, w, height);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, 0, w, height);

    const label = CANVAS_LABELS[blast.type] ?? blast.type;
    const count =
      blast.type === 'shevarim' || blast.type === 'teruah'
        ? ` (${blast.segments.length})`
        : '';
    ctx.fillStyle = color;
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${label}${count}`, x0 + w / 2, 14);
  }

  ctx.fillStyle = '#64748b';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(String(analysis.noteSegments.length), 6, height - 6);
}

export function renderAnalysisFeedback(
  container: HTMLElement,
  result: AnalysisResult,
  locale: Locale = getLocale(),
): void {
  const c = catalog(locale);
  container.innerHTML = '';
  const status = document.createElement('div');
  status.className = `feedback-status ${result.passed ? 'pass' : 'fail'}`;
  status.textContent = result.passed ? c.passed : c.needsWork;
  container.appendChild(status);

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

  if ('noteSegments' in result && Array.isArray((result as DetailedAnalysisResult).noteSegments)) {
    const notes = (result as DetailedAnalysisResult).noteSegments;
    const noteLine = document.createElement('p');
    noteLine.className = 'feedback-notes';
    noteLine.textContent = c.notesDetected({
      count: notes.length,
      detail: notes.map((n, i) => `#${i + 1} ${(n.durationSec * 1000).toFixed(0)}ms`).join(', '),
    });
    container.appendChild(noteLine);
  }

  if (result.classified.length > 0) {
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
  void speakAndWait(text, 0);
}

export async function speakAndWait(text: string, postDelayMs = 500): Promise<void> {
  const locale = getLocale();
  const voices = locale === 'en' ? cachedVoices() : await loadVoices();
  if (!shouldSpeakCallouts(locale, voices)) {
    await delay(postDelayMs);
    return;
  }
  if (!('speechSynthesis' in window)) {
    await delay(postDelayMs);
    return;
  }

  await new Promise<void>((resolve) => {
    window.speechSynthesis.cancel();
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      setTimeout(resolve, postDelayMs);
    };

    const u = utteranceForCallout(text, locale, voices);
    if (!u) {
      done();
      return;
    }
    u.onend = done;
    u.onerror = done;
    window.speechSynthesis.speak(u);
    setTimeout(done, 6000);
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
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
