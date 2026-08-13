import type { BlastSegment } from '../halacha/types';
import { dropEchoTaps, estimateEchoLagSec, type AttackDiagnosis, type FluxPeak } from './echo-taps';
import { fftRadix2 } from './fft';

const FFT_SIZE = 1024;
const HOP = 256;
const PRE_EMPH = 0.97;

export interface AttackSegmentOptions {
  minDistanceSec: number;
  minBlastSec: number;
  /** Keep peaks on a regular grid so room echo does not count as extra teruah notes. */
  isochronous?: boolean;
  echoLagSec?: number | null;
}

export interface AttackPickResult {
  segments: BlastSegment[];
  diagnosis: AttackDiagnosis;
}

function hann(n: number): Float32Array {
  const w = new Float32Array(n);
  if (n === 1) {
    w[0] = 1;
    return w;
  }
  for (let i = 0; i < n; i++) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
  }
  return w;
}

function preemphasize(samples: Float32Array): Float32Array {
  const out = new Float32Array(samples.length);
  out[0] = samples[0];
  for (let i = 1; i < samples.length; i++) {
    out[i] = samples[i] - PRE_EMPH * samples[i - 1];
  }
  return out;
}

function soundingEndSample(samples: Float32Array): number {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > peak) peak = a;
  }
  const thresh = Math.max(0.02, peak * 0.04);
  for (let i = samples.length - 1; i >= 0; i--) {
    if (Math.abs(samples[i]) >= thresh) return i + 1;
  }
  return samples.length;
}

/** Half-wave-rectified STFT spectral flux (attack novelty). */
export function spectralFlux(samples: Float32Array): Float32Array {
  const x = preemphasize(samples);
  const window = hann(FFT_SIZE);
  const bins = FFT_SIZE / 2;
  const nFrames = Math.max(1, Math.floor((x.length - FFT_SIZE) / HOP) + 1);
  const flux = new Float32Array(nFrames);
  const re = new Float32Array(FFT_SIZE);
  const im = new Float32Array(FFT_SIZE);
  const prev = new Float32Array(bins);
  const magFrame = new Float32Array(bins);
  const mu = 2;
  let havePrev = false;

  for (let f = 0; f < nFrames; f++) {
    const off = f * HOP;
    re.fill(0);
    im.fill(0);
    const n = Math.min(FFT_SIZE, x.length - off);
    for (let i = 0; i < n; i++) {
      re[i] = x[off + i] * window[i];
    }
    fftRadix2(re, im);

    for (let k = 1; k < bins; k++) {
      magFrame[k] = Math.hypot(re[k], im[k]);
    }
    let sum = 0;
    if (havePrev) {
      for (let k = 1; k < bins; k++) {
        let prevMax = prev[k];
        for (let d = 1; d <= mu; d++) {
          if (k - d >= 1) prevMax = Math.max(prevMax, prev[k - d]);
          if (k + d < bins) prevMax = Math.max(prevMax, prev[k + d]);
        }
        sum += Math.max(0, magFrame[k] - prevMax);
      }
    }
    prev.set(magFrame);
    flux[f] = havePrev ? sum : 0;
    havePrev = true;
  }

  return flux;
}

function pickFluxFrames(
  flux: Float32Array,
  minDistFrames: number,
  hopSec: number,
  isochronous = false,
  knownEchoLagSec: number | null = null,
): { frames: number[]; diagnosis: AttackDiagnosis } {
  const empty: AttackDiagnosis = {
    rawPeakCount: 0,
    keptCount: 0,
    droppedEchoCount: 0,
    echoLagSec: knownEchoLagSec,
    onsetSec: [],
  };
  if (flux.length === 0) return { frames: [], diagnosis: empty };

  const ranked = Float32Array.from(flux);
  ranked.sort();
  const median = ranked[Math.floor(ranked.length * 0.5)] ?? 0;
  const p80 = ranked[Math.floor(ranked.length * 0.8)] ?? median;
  const thresh = Math.max(median * 2.2, p80 * 0.55);

  const halfWin = Math.max(1, Math.floor(minDistFrames / 2));
  const candidates: FluxPeak[] = [];
  for (let i = 1; i < flux.length - 1; i++) {
    if (flux[i] < thresh) continue;
    let isMax = true;
    const lo = Math.max(1, i - halfWin);
    const hi = Math.min(flux.length - 2, i + halfWin);
    for (let j = lo; j <= hi; j++) {
      if (j !== i && flux[j] > flux[i]) {
        isMax = false;
        break;
      }
    }
    if (!isMax) continue;
    candidates.push({ i, v: flux[i] });
  }

  candidates.sort((a, b) => b.v - a.v || a.i - b.i);
  const taken: FluxPeak[] = [];
  for (const c of candidates) {
    if (taken.some((t) => Math.abs(c.i - t.i) < minDistFrames)) continue;
    taken.push(c);
  }

  const coreN = Math.min(9, taken.length);
  const core = taken
    .slice()
    .sort((a, b) => b.v - a.v)
    .slice(0, coreN)
    .map((t) => t.v)
    .sort((a, b) => a - b);
  const ref = core[Math.floor(core.length / 2)] ?? 0;
  const clear = taken.filter((t) => t.v >= ref * 0.4);
  const echoLagSec = estimateEchoLagSec(clear, hopSec, knownEchoLagSec);
  const echoed =
    echoLagSec != null ? dropEchoTaps(clear, echoLagSec, hopSec) : { kept: clear, dropped: [] };
  const picked =
    isochronous && echoed.kept.length > 9
      ? keepIsochronous(echoed.kept, minDistFrames)
      : echoed.kept;
  picked.sort((a, b) => a.i - b.i);
  const frames = picked.map((t) => t.i);
  return {
    frames,
    diagnosis: {
      rawPeakCount: clear.length,
      keptCount: frames.length,
      droppedEchoCount: echoed.dropped.length,
      echoLagSec,
      onsetSec: frames.map((f) => f * hopSec),
    },
  };
}

/**
 * When flux over-counts, keep peaks on the grid of the loudest notes.
 * Direct attacks are louder than room echo, so the period comes from those.
 * Do not use this path for a count of 9 or fewer — human teruah is not a metronome.
 */
function keepIsochronous(
  peaks: Array<{ i: number; v: number }>,
  minDistFrames: number,
): Array<{ i: number; v: number }> {
  const strong = [...peaks].sort((a, b) => b.v - a.v).slice(0, 8);
  const strongTime = [...strong].sort((a, b) => a.i - b.i);
  if (strongTime.length < 3) return peaks;
  const ioi: number[] = [];
  for (let i = 1; i < strongTime.length; i++) {
    ioi.push(strongTime[i].i - strongTime[i - 1].i);
  }
  ioi.sort((a, b) => a - b);
  const period = ioi[Math.floor(ioi.length / 2)] ?? minDistFrames;
  if (period < minDistFrames) return peaks;
  const origin = strong[0];
  const slop = period * 0.28;
  const onGrid = peaks.filter((p) => {
    const dist = Math.abs(p.i - origin.i);
    const k = Math.round(dist / period);
    return Math.abs(dist - k * period) <= slop;
  });
  if (onGrid.length < 8) return peaks;
  return onGrid;
}

export function analyzeAttacks(
  samples: Float32Array,
  sampleRate: number,
  options: AttackSegmentOptions,
): AttackPickResult {
  const empty: AttackDiagnosis = {
    rawPeakCount: 0,
    keptCount: 0,
    droppedEchoCount: 0,
    echoLagSec: options.echoLagSec ?? null,
    onsetSec: [],
  };
  if (samples.length < FFT_SIZE) return { segments: [], diagnosis: empty };

  const hopSec = HOP / sampleRate;
  const flux = spectralFlux(samples);
  const minDistFrames = Math.max(1, Math.round((options.minDistanceSec * sampleRate) / HOP));
  const { frames, diagnosis } = pickFluxFrames(
    flux,
    minDistFrames,
    hopSec,
    options.isochronous === true,
    options.echoLagSec ?? null,
  );
  if (frames.length === 0) return { segments: [], diagnosis };

  const end = soundingEndSample(samples);
  const minSamples = Math.floor(options.minBlastSec * sampleRate);
  const onsets = frames.map((f) => Math.min(f * HOP, samples.length - 1));
  const segments: BlastSegment[] = [];

  for (let i = 0; i < onsets.length; i++) {
    const start = onsets[i];
    const next = i + 1 < onsets.length ? onsets[i + 1] : end;
    const stop = Math.max(start + 1, next);
    if (stop - start < minSamples) continue;
    segments.push({
      startSample: start,
      endSample: stop,
      durationSec: (stop - start) / sampleRate,
    });
  }

  return {
    segments,
    diagnosis: { ...diagnosis, keptCount: segments.length, onsetSec: onsets.map((s) => s / sampleRate) },
  };
}

export function segmentAttacks(
  samples: Float32Array,
  sampleRate: number,
  options: AttackSegmentOptions,
): BlastSegment[] {
  return analyzeAttacks(samples, sampleRate, options).segments;
}
