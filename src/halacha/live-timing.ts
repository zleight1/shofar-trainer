import type { BlastType, SetPattern } from '../halacha/types';
import { clampUnit, expectedDurationForType, UNIT_DEFAULT_SEC } from './duration-targets';

export type LiveLengthStatus = 'waiting' | 'building' | 'too_short' | 'good' | 'too_long';

export interface LiveTimingState {
  status: LiveLengthStatus;
  elapsedSec: number;
  targetMinSec: number;
  targetIdealSec: number;
  targetMaxSec: number;
  progress: number;
}

export interface TimingContext {
  unitSec: number;
  pattern: SetPattern;
  middleDurationSec?: number;
  isClosingTekiah?: boolean;
}

export function expectedTiming(
  type: BlastType,
  ctx: TimingContext,
): { minSec: number; idealSec: number; maxSec: number } {
  return expectedDurationForType(
    type,
    ctx.unitSec,
    ctx.pattern,
    ctx.middleDurationSec,
    ctx.isClosingTekiah,
  );
}

export function liveTimingState(
  type: BlastType,
  elapsedSec: number,
  ctx: TimingContext,
  phase: 'waiting_for_sound' | 'sounding' | 'trailing_silence',
): LiveTimingState {
  const { minSec, idealSec, maxSec } = expectedTiming(type, ctx);
  const progress = minSec > 0 ? Math.min(elapsedSec / minSec, 1.5) : 0;

  if (phase === 'waiting_for_sound' || elapsedSec < 0.05) {
    return pack('waiting', elapsedSec, minSec, idealSec, maxSec, 0);
  }

  if (elapsedSec < minSec * 0.85) {
    return pack('building', elapsedSec, minSec, idealSec, maxSec, progress);
  }

  if (elapsedSec < minSec) {
    return pack('too_short', elapsedSec, minSec, idealSec, maxSec, progress);
  }

  const isShevarim = type === 'shevarim';
  if (isShevarim && elapsedSec > maxSec) {
    return pack('too_long', elapsedSec, minSec, idealSec, maxSec, progress);
  }

  return pack('good', elapsedSec, minSec, idealSec, maxSec, progress);
}

function pack(
  status: LiveLengthStatus,
  elapsedSec: number,
  minSec: number,
  idealSec: number,
  maxSec: number,
  progress: number,
): LiveTimingState {
  return {
    status,
    elapsedSec,
    targetMinSec: minSec,
    targetIdealSec: idealSec,
    targetMaxSec: maxSec,
    progress,
  };
}

export { clampUnit, UNIT_DEFAULT_SEC };
