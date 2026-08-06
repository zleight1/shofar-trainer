import type { BlastSegment } from '../halacha/types';

export interface OnsetOptions {
  threshold?: number;
  minBlastMs?: number;
  minGapMs?: number;
}

const DEFAULT_ONSET: Required<OnsetOptions> = {
  threshold: 0.12,
  minBlastMs: 40,
  minGapMs: 30,
};

/** Detect blast segments from normalized envelope (0–1) */
export function detectOnsets(
  envelope: Float32Array,
  sampleRate: number,
  options: OnsetOptions = {},
): BlastSegment[] {
  const opts = { ...DEFAULT_ONSET, ...options };
  const minBlastSamples = Math.floor((sampleRate * opts.minBlastMs) / 1000);
  const minGapSamples = Math.floor((sampleRate * opts.minGapMs) / 1000);

  const segments: BlastSegment[] = [];
  let inBlast = false;
  let start = 0;
  let lastAbove = 0;

  for (let i = 0; i < envelope.length; i++) {
    const above = envelope[i] >= opts.threshold;
    if (!inBlast && above) {
      inBlast = true;
      start = i;
      lastAbove = i;
    } else if (inBlast) {
      if (above) {
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

/** Merge segments separated by very short gaps (same sustained note) */
export function mergeCloseSegments(
  segments: BlastSegment[],
  sampleRate: number,
  maxGapMs = 80,
): BlastSegment[] {
  if (segments.length <= 1) return segments;
  const maxGapSamples = Math.floor((sampleRate * maxGapMs) / 1000);
  const merged: BlastSegment[] = [{ ...segments[0] }];

  for (let i = 1; i < segments.length; i++) {
    const prev = merged[merged.length - 1];
    const cur = segments[i];
    const gap = cur.startSample - prev.endSample;
    if (gap <= maxGapSamples) {
      prev.endSample = cur.endSample;
      prev.durationSec = (prev.endSample - prev.startSample) / sampleRate;
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

export function segmentsFromEnvelope(
  envelope: Float32Array,
  sampleRate: number,
  options?: OnsetOptions,
): BlastSegment[] {
  const raw = detectOnsets(envelope, sampleRate, options);
  return mergeCloseSegments(raw, sampleRate);
}
