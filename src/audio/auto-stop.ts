import { peakFromTimeDomain } from './capture';
import type { BlastType } from '../halacha/types';

export interface AutoStopOptions {
  soundThreshold?: number;
  soundOnThreshold?: number;
  soundOffThreshold?: number;
  silenceMs?: number;
  earlySilenceMs?: number;
  holdMinSec?: number;
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

export interface AutoStopState {
  soundStartedAt: number | null;
  silenceStartedAt: number | null;
  candidateStartedAt: number | null;
  /** Running ambient peak while waiting. 0 means not yet observed. */
  noiseFloor: number;
  /** Loudest peak while this blast is sounding. */
  blastPeak: number;
}

export interface AutoStopAdvance {
  state: AutoStopState;
  phase: AutoStopTick['phase'];
  elapsedSec: number;
  soundingSec: number;
  peak: number;
  silenceMs: number;
  done: AutoStopReason | null;
}

export interface DurationBandSlice {
  minSec: number;
  safetyAutoStopSec: number;
}

const DEFAULTS = {
  soundThreshold: 0.035,
  silenceMs: 550,
  maxDurationSec: 18,
  minSoundMs: 80,
};

const TEKIAH_HOLD = {
  minSoundMs: 250,
  soundOnThreshold: 0.05,
  soundOffThreshold: 0.02,
  silenceMs: 1100,
  earlySilenceMs: 1800,
} as const;

/** Shofar is much louder than room noise. Gate on that gap, not a low absolute floor. */
const LOUDNESS = {
  /** Start when peak is this many times the learned ambient. ~14 dB. */
  onRatio: 5,
  /** End when peak is within this multiple of ambient. ~6 dB. */
  offRatio: 2,
  /** End when peak has dropped this far from the blast itself. ~11 dB. */
  dropRatio: 0.28,
  /** With no ambient sample yet, only a clearly loud peak may start a blast. */
  absoluteBlast: 0.12,
  noiseMin: 0.004,
  noiseRise: 0.12,
  noiseFall: 0.28,
} as const;

interface ResolvedAutoStopOptions {
  soundOnThreshold: number;
  soundOffThreshold: number;
  silenceMs: number;
  earlySilenceMs: number;
  holdMinSec: number;
  maxDurationSec: number;
  minSoundMs: number;
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

export function createAutoStopState(): AutoStopState {
  return {
    soundStartedAt: null,
    silenceStartedAt: null,
    candidateStartedAt: null,
    noiseFloor: 0,
    blastPeak: 0,
  };
}

export function adaptNoiseFloor(floor: number, peak: number): number {
  const sample = Math.max(peak, 0);
  if (floor <= 0) return Math.max(sample, LOUDNESS.noiseMin);
  if (sample < floor) {
    return floor * (1 - LOUDNESS.noiseFall) + sample * LOUDNESS.noiseFall;
  }
  return floor * (1 - LOUDNESS.noiseRise) + sample * LOUDNESS.noiseRise;
}

export function loudnessOnThreshold(noiseFloor: number, soundOnThreshold: number): number {
  if (noiseFloor <= 0) return Math.max(soundOnThreshold, LOUDNESS.absoluteBlast);
  return Math.max(soundOnThreshold, noiseFloor * LOUDNESS.onRatio);
}

export function loudnessOffThreshold(
  noiseFloor: number,
  blastPeak: number,
  soundOffThreshold: number,
): number {
  return Math.max(
    soundOffThreshold,
    noiseFloor * LOUDNESS.offRatio,
    blastPeak * LOUDNESS.dropRatio,
  );
}

export function autoStopOptionsForBlast(
  type: BlastType,
  band: DurationBandSlice,
  silenceMs: number,
): AutoStopOptions {
  switch (type) {
    case 'tekiah':
    case 'tekiah_gedolah':
      return {
        ...TEKIAH_HOLD,
        holdMinSec: band.minSec,
        maxDurationSec: band.safetyAutoStopSec,
      };
    case 'shevarim':
    case 'teruah':
    case 'shevarim_teruah':
      return {
        silenceMs,
        maxDurationSec: band.safetyAutoStopSec,
      };
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

function resolveOptions(options: AutoStopOptions): ResolvedAutoStopOptions {
  const fallback = options.soundThreshold ?? DEFAULTS.soundThreshold;
  const silenceMs = options.silenceMs ?? DEFAULTS.silenceMs;
  return {
    soundOnThreshold: options.soundOnThreshold ?? fallback,
    soundOffThreshold: options.soundOffThreshold ?? fallback,
    silenceMs,
    earlySilenceMs: options.earlySilenceMs ?? silenceMs,
    holdMinSec: options.holdMinSec ?? 0,
    maxDurationSec: options.maxDurationSec ?? DEFAULTS.maxDurationSec,
    minSoundMs: options.minSoundMs ?? DEFAULTS.minSoundMs,
  };
}

export function advanceAutoStop(
  state: AutoStopState,
  now: number,
  startedAt: number,
  peak: number,
  options: AutoStopOptions = {},
): AutoStopAdvance {
  const opts = resolveOptions(options);
  const next: AutoStopState = { ...state };
  const elapsedSec = (now - startedAt) / 1000;
  const onThreshold = loudnessOnThreshold(next.noiseFloor, opts.soundOnThreshold);
  const offThreshold = loudnessOffThreshold(
    next.noiseFloor,
    next.blastPeak,
    opts.soundOffThreshold,
  );

  if (next.soundStartedAt === null) {
    if (peak >= onThreshold) {
      if (next.candidateStartedAt === null) next.candidateStartedAt = now;
      if (now - next.candidateStartedAt >= opts.minSoundMs) {
        next.soundStartedAt = next.candidateStartedAt;
        next.candidateStartedAt = null;
        next.silenceStartedAt = null;
        next.blastPeak = Math.max(next.blastPeak, peak);
      }
    } else {
      next.candidateStartedAt = null;
      next.noiseFloor = adaptNoiseFloor(next.noiseFloor, peak);
    }
  } else if (peak >= offThreshold) {
    next.silenceStartedAt = null;
    next.blastPeak = Math.max(next.blastPeak, peak);
  } else if (next.silenceStartedAt === null) {
    next.silenceStartedAt = now;
  }

  const displayStart = next.soundStartedAt ?? next.candidateStartedAt;
  const soundingSec = soundingExclusiveSec(now, displayStart, next.silenceStartedAt);
  const silenceMs = next.silenceStartedAt ? now - next.silenceStartedAt : 0;
  const committedSoundingSec = soundingExclusiveSec(
    now,
    next.soundStartedAt,
    next.silenceStartedAt,
  );

  let phase: AutoStopTick['phase'] = 'waiting_for_sound';
  if (next.soundStartedAt !== null && next.silenceStartedAt !== null && silenceMs > 0) {
    phase = 'trailing_silence';
  } else if (next.soundStartedAt !== null || next.candidateStartedAt !== null) {
    phase = 'sounding';
  }

  let done: AutoStopReason | null = null;
  if (elapsedSec >= opts.maxDurationSec) {
    done = 'max_duration';
  } else if (next.soundStartedAt !== null) {
    const requiredSilenceMs =
      opts.holdMinSec > 0 && committedSoundingSec < opts.holdMinSec
        ? opts.earlySilenceMs
        : opts.silenceMs;
    if (silenceMs >= requiredSilenceMs) {
      done = 'silence';
    }
  }

  return { state: next, phase, elapsedSec, soundingSec, peak, silenceMs, done };
}

export function waitForBlastEnd(
  getAnalyser: () => AnalyserNode | null,
  options: AutoStopOptions = {},
): { promise: Promise<AutoStopResult>; cancel: () => void } {
  let cancelled = false;
  let rafId = 0;
  let state = createAutoStopState();
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
          soundingSec: soundingExclusiveSec(
            t,
            state.soundStartedAt ?? state.candidateStartedAt,
            state.silenceStartedAt,
          ),
        });
        return;
      }

      const analyser = getAnalyser();
      if (!analyser) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      analyser.getFloatTimeDomainData(buffer);
      const peak = peakFromTimeDomain(buffer);
      const advance = advanceAutoStop(state, performance.now(), startedAt, peak, options);
      state = advance.state;
      options.onTick?.({
        phase: advance.phase,
        elapsedSec: advance.elapsedSec,
        soundingSec: advance.soundingSec,
        peak: advance.peak,
        silenceMs: advance.silenceMs,
      });

      if (advance.done === 'max_duration' || advance.done === 'silence') {
        resolve({
          reason: advance.done,
          elapsedSec: advance.elapsedSec,
          soundingSec: advance.soundingSec,
        });
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
  });

  return { promise, cancel };
}
