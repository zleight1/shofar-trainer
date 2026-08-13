/** Peak (max abs) envelope — sharper attack detection for shofar onsets */
export function computePeakEnvelope(
  samples: Float32Array,
  sampleRate: number,
  windowMs = 8,
): Float32Array {
  const windowSize = Math.max(1, Math.floor((sampleRate * windowMs) / 1000));
  const out = new Float32Array(samples.length);

  for (let i = 0; i < samples.length; i++) {
    let peak = 0;
    const start = Math.max(0, i - windowSize + 1);
    for (let j = start; j <= i; j++) {
      const abs = Math.abs(samples[j]);
      if (abs > peak) peak = abs;
    }
    out[i] = peak;
  }
  return out;
}

/** Compute RMS envelope over windowed samples */
export function computeEnvelope(
  samples: Float32Array,
  sampleRate: number,
  windowMs = 10,
): Float32Array {
  const windowSize = Math.max(1, Math.floor((sampleRate * windowMs) / 1000));
  const out = new Float32Array(samples.length);
  let sumSq = 0;

  for (let i = 0; i < samples.length; i++) {
    const v = samples[i];
    sumSq += v * v;
    if (i >= windowSize) {
      const old = samples[i - windowSize];
      sumSq -= old * old;
    }
    if (sumSq < 0) sumSq = 0;
    const n = Math.min(i + 1, windowSize);
    out[i] = Math.sqrt(sumSq / n);
  }
  return out;
}

/** Peak + RMS blend — good for shofar (sharp attacks, stable sustain) */
export function computeHybridEnvelope(
  samples: Float32Array,
  sampleRate: number,
  windowMs = 8,
): Float32Array {
  const rms = computeEnvelope(samples, sampleRate, windowMs);
  const peak = computePeakEnvelope(samples, sampleRate, windowMs);
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    out[i] = rms[i] * 0.35 + peak[i] * 0.65;
  }
  return out;
}

export function normalizeEnvelope(envelope: Float32Array): Float32Array {
  let max = 0;
  for (let i = 0; i < envelope.length; i++) {
    if (envelope[i] > max) max = envelope[i];
  }
  if (max <= 0) return envelope;
  const out = new Float32Array(envelope.length);
  for (let i = 0; i < envelope.length; i++) {
    out[i] = envelope[i] / max;
  }
  return out;
}

export function smoothEnvelope(envelope: Float32Array, passes = 2): Float32Array {
  let current = envelope;
  for (let p = 0; p < passes; p++) {
    const next = new Float32Array(current.length);
    for (let i = 0; i < current.length; i++) {
      const prev = i > 0 ? current[i - 1] : current[i];
      const nextVal = i < current.length - 1 ? current[i + 1] : current[i];
      next[i] = (prev + current[i] + nextVal) / 3;
    }
    current = next;
  }
  return current;
}

/** Hysteresis thresholds from noise floor (adaptive to room / mic level) */
export function adaptiveThreshold(envelope: Float32Array): { on: number; off: number } {
  const sorted = Float32Array.from(envelope).sort();
  const n = sorted.length;
  if (n === 0) return { on: 0.12, off: 0.06 };

  const noiseFloor = sorted[Math.floor(n * 0.12)] ?? 0;
  const peak = sorted[n - 1] ?? 1;
  const range = Math.max(peak - noiseFloor, 0.001);

  return {
    on: noiseFloor + range * 0.14,
    off: noiseFloor + range * 0.07,
  };
}

export function prepareAnalysisEnvelope(
  samples: Float32Array,
  sampleRate: number,
): Float32Array {
  return smoothEnvelope(normalizeEnvelope(computeHybridEnvelope(samples, sampleRate)));
}
