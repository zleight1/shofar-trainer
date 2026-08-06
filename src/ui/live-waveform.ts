import type { LiveTimingState } from '../halacha/live-timing';
import { peakFromTimeDomain } from '../audio/capture';

export interface LiveWaveformOptions {
  historyColumns?: number;
  waveColor?: string;
  levelColor?: string;
  historyColor?: string;
  getTiming?: () => LiveTimingState | null;
}

export class LiveWaveform {
  private rafId = 0;
  private peaks: number[] = [];
  private readonly historyColumns: number;
  private readonly waveColor: string;
  private readonly levelColor: string;
  private readonly historyColor: string;
  private readonly getTiming?: () => LiveTimingState | null;
  private active = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private getAnalyser: () => AnalyserNode | null,
    options: LiveWaveformOptions = {},
  ) {
    this.historyColumns = options.historyColumns ?? 320;
    this.waveColor = options.waveColor ?? '#60a5fa';
    this.levelColor = options.levelColor ?? '#4ade80';
    this.historyColor = options.historyColor ?? '#f87171';
    this.getTiming = options.getTiming;
    this.peaks = new Array(this.historyColumns).fill(0);
  }

  start(): void {
    if (this.active) return;
    this.active = true;
    this.peaks.fill(0);
    const tick = () => {
      if (!this.active) return;
      this.drawFrame();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop(): void {
    this.active = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private drawFrame(): void {
    const analyser = this.getAnalyser();
    const ctx = this.canvas.getContext('2d');
    if (!ctx || !analyser) return;

    const buffer = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buffer);
    const peak = peakFromTimeDomain(buffer);

    this.peaks.push(peak);
    if (this.peaks.length > this.historyColumns) this.peaks.shift();

    const dpr = window.devicePixelRatio || 1;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (width <= 0 || height <= 0) return;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#0f1628';
    ctx.fillRect(0, 0, width, height);

    const timing = this.getTiming?.();
    const historyH = Math.floor(height * 0.4);
    const scopeH = height - historyH - 36;
    const scopeY = historyH + 4;

    this.drawHistory(ctx, width, historyH, peak);
    this.drawScope(ctx, width, scopeH, scopeY, buffer);
    this.drawLevelMeter(ctx, width, peak, timing);
    this.drawRecBadge(ctx, peak);
    if (timing) this.drawTimingBar(ctx, width, height - 28, timing);
  }

  private drawHistory(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    currentPeak: number,
  ): void {
    ctx.fillStyle = '#1a2744';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    const colW = width / this.historyColumns;
    ctx.fillStyle = this.historyColor + 'cc';
    for (let i = 0; i < this.peaks.length; i++) {
      const barH = this.peaks[i] * height * 0.92;
      ctx.fillRect(i * colW, (height - barH) / 2, Math.max(colW, 1), barH);
    }

    if (currentPeak > 0.02) {
      ctx.fillStyle = this.levelColor;
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${(currentPeak * 100).toFixed(0)}%`, width - 6, 12);
    }
  }

  private drawScope(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    y: number,
    timeData: Float32Array,
  ): void {
    ctx.fillStyle = '#1a2744';
    ctx.fillRect(0, y, width, height);
    const mid = y + height / 2;
    const step = timeData.length / width;
    ctx.strokeStyle = this.waveColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 0; x < width; x++) {
      const i = Math.min(Math.floor(x * step), timeData.length - 1);
      const py = mid - timeData[i] * (height * 0.44);
      if (x === 0) ctx.moveTo(x, py);
      else ctx.lineTo(x, py);
    }
    ctx.stroke();
  }

  private drawLevelMeter(
    ctx: CanvasRenderingContext2D,
    width: number,
    peak: number,
    timing: LiveTimingState | null | undefined,
  ): void {
    const barW = width - 16;
    const x = 8;
    const y = 4;
    ctx.fillStyle = '#243352';
    ctx.fillRect(x, y, barW, 4);
    ctx.fillStyle = peak > 0.02 ? this.levelColor : '#475569';
    ctx.fillRect(x, y, barW * Math.min(peak * 1.2, 1), 4);

    if (timing && timing.targetIdealSec > 0) {
      const minX = x + (timing.targetMinSec / timing.targetIdealSec) * barW * 0.85;
      const maxX = x + (timing.targetMaxSec / timing.targetIdealSec) * barW * 0.85;
      ctx.strokeStyle = '#4ade8066';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(minX, y);
      ctx.lineTo(minX, y + 4);
      ctx.moveTo(maxX, y);
      ctx.lineTo(maxX, y + 4);
      ctx.stroke();
    }
  }

  private drawTimingBar(
    ctx: CanvasRenderingContext2D,
    width: number,
    y: number,
    timing: LiveTimingState,
  ): void {
    const pad = 8;
    const barW = width - pad * 2;
    const h = 20;

    ctx.fillStyle = '#1a2744';
    ctx.fillRect(pad, y, barW, h);

    const fillW = barW * Math.min(timing.progress, 1);
    const colors: Record<string, string> = {
      waiting: '#64748b',
      building: '#60a5fa',
      too_short: '#fbbf24',
      good: '#4ade80',
      too_long: '#f87171',
    };
    ctx.fillStyle = colors[timing.status] ?? '#60a5fa';
    ctx.fillRect(pad, y, fillW, h);

    const idealX = pad + barW * Math.min(timing.targetIdealSec / timing.targetMaxSec, 1);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(idealX, y);
    ctx.lineTo(idealX, y + h);
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(timing.message, width / 2, y + 14);
  }

  private drawRecBadge(ctx: CanvasRenderingContext2D, peak: number): void {
    const pulse = 0.7 + Math.sin(Date.now() / 200) * 0.3;
    ctx.fillStyle = `rgba(248, 113, 113, ${pulse})`;
    ctx.beginPath();
    ctx.arc(14, 22, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fca5a5';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('REC', 24, 26);

    if (peak < 0.015 && !this.getTiming?.()) {
      ctx.fillStyle = '#64748b';
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Waiting for sound…', this.canvas.clientWidth / 2, this.canvas.clientHeight / 2);
    }
  }
}

export function attachLiveWaveform(
  canvas: HTMLCanvasElement,
  getAnalyser: () => AnalyserNode | null,
  options?: LiveWaveformOptions,
): () => void {
  const live = new LiveWaveform(canvas, getAnalyser, options);
  live.start();
  return () => live.stop();
}
