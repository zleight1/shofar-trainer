import type { AnalysisResult, BlastSegment } from '../halacha/types';

const COLORS: Record<string, string> = {
  tekiah: '#4ade80',
  shevarim: '#60a5fa',
  teruah: '#fbbf24',
  shevarim_teruah: '#a78bfa',
  tekiah_gedolah: '#f472b6',
  default: '#94a3b8',
};

export function renderWaveform(
  canvas: HTMLCanvasElement,
  samples: Float32Array,
  segments: BlastSegment[],
  segmentColors?: Map<number, string>,
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

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x < width; x++) {
    const i = x * step;
    const y = mid - samples[i] * (height * 0.4);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  for (let si = 0; si < segments.length; si++) {
    const seg = segments[si];
    const x0 = (seg.startSample / samples.length) * width;
    const x1 = (seg.endSample / samples.length) * width;
    const color = segmentColors?.get(si) ?? COLORS.default;
    ctx.fillStyle = color + '33';
    ctx.fillRect(x0, 0, x1 - x0, height);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, 0, x1 - x0, height);
  }
}

export function renderAnalysisFeedback(container: HTMLElement, result: AnalysisResult): void {
  container.innerHTML = '';
  const status = document.createElement('div');
  status.className = `feedback-status ${result.passed ? 'pass' : 'fail'}`;
  status.textContent = result.passed ? 'Passed' : 'Needs work';
  container.appendChild(status);

  if (result.tekiahRatio !== null) {
    const ratio = document.createElement('p');
    ratio.className = 'feedback-ratio';
    ratio.textContent = `Tekiah / middle ratio: ${(result.tekiahRatio * 100).toFixed(0)}% (target ~100%)`;
    container.appendChild(ratio);
  }

  if (result.classified.length > 0) {
    const detected = document.createElement('ul');
    detected.className = 'feedback-detected';
    for (const c of result.classified) {
      const li = document.createElement('li');
      li.textContent = `${c.type}: ${c.segments.length} segment(s), ${c.totalDurationSec.toFixed(2)}s total`;
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
      li.textContent = issue.message;
      list.appendChild(li);
    }
    container.appendChild(list);
  }
}

export function speak(text: string): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
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
