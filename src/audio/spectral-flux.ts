import type { BlastSegment } from '../halacha/types';
import { fftRadix2 } from './fft';

const FFT_SIZE = 1024;
const HOP = 256;
const PRE_EMPH = 0.97;

export interface AttackSegmentOptions {
  minDistanceSec: number;
  minBlastSec: number;
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

    let sum = 0;
    for (let k = 1; k < bins; k++) {
      const mag = Math.hypot(re[k], im[k]);
      if (havePrev) sum += Math.max(0, mag - prev[k]);
      prev[k] = mag;
    }
    flux[f] = havePrev ? sum : 0;
    havePrev = true;
  }

  return flux;
}

function pickFluxFrames(flux: Float32Array, minDistFrames: number): number[] {
  if (flux.length === 0) return [];
  const sorted = Float32Array.from(flux);
  sorted.sort();
  const median = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
  const p90 = sorted[Math.floor(sorted.length * 0.9)] ?? median;
  const thresh = Math.max(median * 1.8, median + 0.25 * (p90 - median));

  const peaks: number[] = [];
  let last = -minDistFrames;
  for (let i = 1; i < flux.length - 1; i++) {
    if (flux[i] < thresh) continue;
    if (flux[i] < flux[i - 1] || flux[i] < flux[i + 1]) continue;
    if (i - last < minDistFrames) {
      if (peaks.length > 0 && flux[i] > flux[last]) {
        peaks[peaks.length - 1] = i;
        last = i;
      }
      continue;
    }
    peaks.push(i);
    last = i;
  }
  return peaks;
}

export function segmentAttacks(
  samples: Float32Array,
  sampleRate: number,
  options: AttackSegmentOptions,
): BlastSegment[] {
  if (samples.length < FFT_SIZE) return [];

  const flux = spectralFlux(samples);
  const minDistFrames = Math.max(1, Math.round((options.minDistanceSec * sampleRate) / HOP));
  const frames = pickFluxFrames(flux, minDistFrames);
  if (frames.length === 0) return [];

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

  return segments;
}
