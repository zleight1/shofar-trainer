import type { BlastType } from './types';
import { DEFAULT_HALACHA_CONFIG } from './types';

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
  /** Closing tekiah: total middle duration in this set so far */
  middleDurationSec?: number;
  /** Is this the second tekiah in the set */
  isClosingTekiah?: boolean;
}

export function expectedTiming(
  type: BlastType,
  unitSec: number,
  ctx: TimingContext = { unitSec },
): { minSec: number; idealSec: number; maxSec: number } {
  const cfg = DEFAULT_HALACHA_CONFIG;

  switch (type) {
    case 'teruah':
      return {
        minSec: unitSec * cfg.minTeruahBlasts * 0.55,
        idealSec: unitSec * cfg.minTeruahBlasts,
        maxSec: unitSec * cfg.minTeruahBlasts * 1.45,
      };
    case 'shevarim':
      return {
        minSec: unitSec * cfg.minShevarimNoteUnits * cfg.shevarimNoteCount * 0.75,
        idealSec: unitSec * cfg.minShevarimNoteUnits * cfg.shevarimNoteCount,
        maxSec: unitSec * cfg.minShevarimNoteUnits * cfg.shevarimNoteCount * 1.35,
      };
    case 'tekiah':
    case 'tekiah_gedolah':
      if (ctx.isClosingTekiah && ctx.middleDurationSec && ctx.middleDurationSec > 0) {
        const mid = ctx.middleDurationSec;
        const tol = cfg.ratioTolerance;
        return {
          minSec: mid * (1 - tol),
          idealSec: mid,
          maxSec: mid * (1 + tol),
        };
      }
      return {
        minSec: unitSec * cfg.minTekiahUnits * 0.75,
        idealSec: unitSec * cfg.minTekiahUnits,
        maxSec: unitSec * cfg.minTekiahUnits * 1.35,
      };
    case 'shevarim_teruah':
      return {
        minSec: unitSec * cfg.minTekiahUnits * 0.75,
        idealSec: unitSec * cfg.minTekiahUnits * 2,
        maxSec: unitSec * cfg.minTekiahUnits * 3,
      };
    default: {
      const _exhaustive: never = type;
      void _exhaustive;
      return { minSec: unitSec * 3, idealSec: unitSec * 9, maxSec: unitSec * 12 };
    }
  }
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
      message: `Keep going — aim ~${idealSec.toFixed(1)}s (${(idealSec * 1000).toFixed(0)} ms)`,
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
      message: `Almost — a bit longer (${elapsedSec.toFixed(1)}s / ~${idealSec.toFixed(1)}s)`,
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
