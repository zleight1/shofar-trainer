import type { BlastSegment } from '../halacha/types';
import { adaptiveThreshold } from './envelope';

export interface OnsetOptions {
  thresholdOn?: number;
  thresholdOff?: number;
  minBlastMs?: number;
  minGapMs?: number;
}

export interface SegmentationResult {
  /** Fine-grained segments before note clustering */
  rawSegments: BlastSegment[];
  /** Clustered into individual notes (shevarim tone, teruah blast, or tekiah) */
  noteSegments: BlastSegment[];
}

const DEFAULTS = {
  minBlastMs: 28,
  minGapMs: 18,
};

/** Hysteresis onset detection — avoids chopping sustained tekiah on brief dips */
export function detectOnsetsHysteresis(
  envelope: Float32Array,
  sampleRate: number,
  options: OnsetOptions = {},
): BlastSegment[] {
  const thresholds =
    options.thresholdOn !== undefined && options.thresholdOff !== undefined
      ? { on: options.thresholdOn, off: options.thresholdOff }
      : adaptiveThreshold(envelope);

  const minBlastSamples = Math.floor((sampleRate * (options.minBlastMs ?? DEFAULTS.minBlastMs)) / 1000);
  const minGapSamples = Math.floor((sampleRate * (options.minGapMs ?? DEFAULTS.minGapMs)) / 1000);

  const segments: BlastSegment[] = [];
  let inBlast = false;
  let start = 0;
  let lastAbove = 0;

  for (let i = 0; i < envelope.length; i++) {
    const level = envelope[i];
    if (!inBlast) {
      if (level >= thresholds.on) {
        inBlast = true;
        start = i;
        lastAbove = i;
      }
    } else if (level >= thresholds.off) {
      lastAbove = i;
    } else if (i - lastAbove >= minGapSamples) {
      const end = lastAbove + 1;
      if (end - start >= minBlastSamples) {
        segments.push({
          startSample: start,
          endSample: end,
          durationSec: (end - start) / sampleRate,
        });
      }
      inBlast = false;
    }
  }

  if (inBlast) {
    const end = lastAbove + 1;
    if (end - start >= minBlastSamples) {
      segments.push({
        startSample: start,
        endSample: end,
        durationSec: (end - start) / sampleRate,
      });
    }
  }

  return segments;
}

function mergePair(a: BlastSegment, b: BlastSegment, sampleRate: number): BlastSegment {
  return {
    startSample: a.startSample,
    endSample: b.endSample,
    durationSec: (b.endSample - a.startSample) / sampleRate,
  };
}

function gapSec(a: BlastSegment, b: BlastSegment, sampleRate: number): number {
  return (b.startSample - a.endSample) / sampleRate;
}

/**
 * Merge raw micro-segments into musically meaningful notes.
 * - Teruah: keep short blasts separate
 * - Tekiah: merge brief dips inside a sustained blow
 * - Shevarim: keep three medium notes separate
 */
export function clusterIntoNotes(
  raw: BlastSegment[],
  sampleRate: number,
  unitSec: number,
): BlastSegment[] {
  if (raw.length <= 1) return raw.map((s) => ({ ...s }));

  let notes = raw.map((s) => ({ ...s }));
  let changed = true;
  let passes = 0;

  while (changed && passes < 20) {
    changed = false;
    passes++;

    for (let i = 0; i < notes.length - 1; i++) {
      const a = notes[i];
      const b = notes[i + 1];
      const gap = gapSec(a, b, sampleRate);

      const bothShort = a.durationSec < unitSec * 1.6 && b.durationSec < unitSec * 1.6;
      const eitherLong = a.durationSec >= unitSec * 2.2 || b.durationSec >= unitSec * 2.2;
      const combined = a.durationSec + b.durationSec + gap;

      let merge = false;

      if (gap <= 0.022) {
        merge = true;
      } else if (bothShort && gap >= unitSec * 0.2) {
        merge = false;
      } else if (bothShort && gap < unitSec * 0.2) {
        merge = false;
      } else if (eitherLong && gap <= unitSec * 0.75) {
        merge = true;
      } else if (combined >= unitSec * 5 && gap <= unitSec * 1.0) {
        merge = true;
      } else if (a.durationSec >= unitSec * 3 && gap <= unitSec * 0.45) {
        merge = true;
      }

      if (merge) {
        notes = [...notes.slice(0, i), mergePair(a, b, sampleRate), ...notes.slice(i + 2)];
        changed = true;
        break;
      }
    }
  }

  return notes;
}

export function segmentRecording(
  envelope: Float32Array,
  sampleRate: number,
  unitSec: number,
  options?: OnsetOptions,
): SegmentationResult {
  const rawSegments = detectOnsetsHysteresis(envelope, sampleRate, options);
  const noteSegments = clusterIntoNotes(rawSegments, sampleRate, unitSec);
  return { rawSegments, noteSegments };
}

/** @deprecated use segmentRecording */
export function detectOnsets(
  envelope: Float32Array,
  sampleRate: number,
  options: OnsetOptions = {},
): BlastSegment[] {
  const thresholds = adaptiveThreshold(envelope);
  return detectOnsetsHysteresis(envelope, sampleRate, {
    thresholdOn: options.thresholdOn ?? thresholds.on,
    thresholdOff: options.thresholdOff ?? thresholds.off,
    minBlastMs: options.minBlastMs,
    minGapMs: options.minGapMs,
  });
}

export function segmentsFromEnvelope(
  envelope: Float32Array,
  sampleRate: number,
  unitSec = 0.1,
  options?: OnsetOptions,
): BlastSegment[] {
  return segmentRecording(envelope, sampleRate, unitSec, options).noteSegments;
}
