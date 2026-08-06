import type { BlastType } from '../halacha/types';
import {
  clampUnit,
  expectedDurationForType,
  UNIT_DEFAULT_SEC,
} from './duration-targets';

export type LiveLengthStatus = 'waiting' | 'building' | 'too_short' | 'good' | 'too_long';

export interface LiveTimingState {
  status: LiveLengthStatus;
  message: string;
  elapsedSec: number;
  targetMinSec: number;
  targetIdealSec: number;
  targetMaxSec: number;
  progress: number;
}

export interface TimingContext {
  unitSec: number;
  middleDurationSec?: number;
  isClosingTekiah?: boolean;
}

export function expectedTiming(
  type: BlastType,
  _unitSec: number,
  ctx: TimingContext = { unitSec: _unitSec },
): { minSec: number; idealSec: number; maxSec: number } {
  return expectedDurationForType(type, ctx.middleDurationSec, ctx.isClosingTekiah);
}

export function liveTimingState(
  type: BlastType,
  elapsedSec: number,
  ctx: TimingContext,
  phase: 'waiting_for_sound' | 'sounding' | 'trailing_silence',
): LiveTimingState {
  const { minSec, idealSec, maxSec } = expectedTiming(type, ctx.unitSec, ctx);

  if (phase === 'waiting_for_sound' || elapsedSec < 0.05) {
    return {
      status: 'waiting',
      message: 'Waiting for sound…',
      elapsedSec,
      targetMinSec: minSec,
      targetIdealSec: idealSec,
      targetMaxSec: maxSec,
      progress: 0,
    };
  }

  const progress = Math.min(elapsedSec / idealSec, 1.5);

  if (elapsedSec < minSec * 0.85) {
    return {
      status: 'building',
      message: `Keep going — aim ~${idealSec.toFixed(0)}s`,
      elapsedSec,
      targetMinSec: minSec,
      targetIdealSec: idealSec,
      targetMaxSec: maxSec,
      progress,
    };
  }

  if (elapsedSec < minSec) {
    return {
      status: 'too_short',
      message: `Almost — a bit longer (${elapsedSec.toFixed(1)}s / ~${idealSec.toFixed(0)}s)`,
      elapsedSec,
      targetMinSec: minSec,
      targetIdealSec: idealSec,
      targetMaxSec: maxSec,
      progress,
    };
  }

  if (elapsedSec <= maxSec) {
    return {
      status: 'good',
      message: `Good length (${elapsedSec.toFixed(1)}s)`,
      elapsedSec,
      targetMinSec: minSec,
      targetIdealSec: idealSec,
      targetMaxSec: maxSec,
      progress,
    };
  }

  return {
    status: 'too_long',
    message: `A bit long — finish up (${elapsedSec.toFixed(1)}s)`,
    elapsedSec,
    targetMinSec: minSec,
    targetIdealSec: idealSec,
    targetMaxSec: maxSec,
    progress,
  };
}

/** Score a single guided blast against duration targets (for step feedback) */
export function scoreSingleBlastDuration(
  type: BlastType,
  durationSec: number,
  ctx: TimingContext,
): { ok: boolean; message: string } {
  const { minSec, idealSec, maxSec } = expectedTiming(type, ctx.unitSec, ctx);
  if (durationSec < minSec * 0.5) {
    return { ok: false, message: `Very short (${durationSec.toFixed(1)}s) — aim ~${idealSec.toFixed(0)}s` };
  }
  if (durationSec < minSec) {
    return { ok: false, message: `A bit short (${durationSec.toFixed(1)}s / ~${idealSec.toFixed(0)}s)` };
  }
  if (durationSec > maxSec * 1.2) {
    return { ok: false, message: `Long (${durationSec.toFixed(1)}s) — aim ~${idealSec.toFixed(0)}s` };
  }
  return { ok: true, message: `${durationSec.toFixed(1)}s — in range` };
}

export { clampUnit, UNIT_DEFAULT_SEC };
