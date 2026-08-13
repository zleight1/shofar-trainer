import { peakFromTimeDomain } from './capture';

export interface AutoStopOptions {
  soundThreshold?: number;
  silenceMs?: number;
  maxDurationSec?: number;
  minSoundMs?: number;
  onTick?: (tick: AutoStopTick) => void;
}

export interface AutoStopTick {
  phase: 'waiting_for_sound' | 'sounding' | 'trailing_silence';
  elapsedSec: number;
  soundingSec: number;
  peak: number;
  silenceMs: number;
}

export type AutoStopReason = 'silence' | 'max_duration' | 'cancelled';

export interface AutoStopResult {
  reason: AutoStopReason;
  elapsedSec: number;
  soundingSec: number;
}

export function soundingExclusiveSec(
  now: number,
  soundStartedAt: number | null,
  silenceStartedAt: number | null,
): number {
  if (soundStartedAt === null) return 0;
  const end = silenceStartedAt ?? now;
  return Math.max(0, (end - soundStartedAt) / 1000);
}

const DEFAULTS = {
  soundThreshold: 0.035,
  silenceMs: 550,
  maxDurationSec: 18,
  minSoundMs: 80,
};

export function waitForBlastEnd(
  getAnalyser: () => AnalyserNode | null,
  options: AutoStopOptions = {},
): { promise: Promise<AutoStopResult>; cancel: () => void } {
  const opts = { ...DEFAULTS, ...options };
  let cancelled = false;
  let rafId = 0;
  let soundStartedAt: number | null = null;
  let silenceStartedAt: number | null = null;
  const startedAt = performance.now();

  const cancel = () => {
    cancelled = true;
    if (rafId) cancelAnimationFrame(rafId);
  };

  const promise = new Promise<AutoStopResult>((resolve) => {
    const buffer = new Float32Array(2048);

    const tick = () => {
      if (cancelled) {
        const t = performance.now();
        resolve({
          reason: 'cancelled',
          elapsedSec: (t - startedAt) / 1000,
          soundingSec: soundingExclusiveSec(t, soundStartedAt, silenceStartedAt),
        });
        return;
      }

      const analyser = getAnalyser();
      const now = performance.now();
      const elapsedSec = (now - startedAt) / 1000;

      if (!analyser) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      analyser.getFloatTimeDomainData(buffer);
      const peak = peakFromTimeDomain(buffer);
      const heard = peak >= opts.soundThreshold;

      if (heard) {
        if (soundStartedAt === null) soundStartedAt = now;
        silenceStartedAt = null;
      } else if (soundStartedAt !== null) {
        if (silenceStartedAt === null) silenceStartedAt = now;
      }

      const silenceMs = silenceStartedAt ? now - silenceStartedAt : 0;
      const soundMs = soundStartedAt ? now - soundStartedAt : 0;
      const soundingSec = soundingExclusiveSec(now, soundStartedAt, silenceStartedAt);

      let phase: AutoStopTick['phase'] = 'waiting_for_sound';
      if (soundStartedAt !== null && !heard && silenceMs > 0) phase = 'trailing_silence';
      else if (soundStartedAt !== null) phase = 'sounding';

      opts.onTick?.({ phase, elapsedSec, soundingSec, peak, silenceMs });

      if (elapsedSec >= opts.maxDurationSec) {
        resolve({ reason: 'max_duration', elapsedSec, soundingSec });
        return;
      }

      if (
        soundStartedAt !== null &&
        soundMs >= opts.minSoundMs &&
        silenceMs >= opts.silenceMs
      ) {
        resolve({ reason: 'silence', elapsedSec, soundingSec });
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
  });

  return { promise, cancel };
}
