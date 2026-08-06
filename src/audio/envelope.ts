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
    const n = Math.min(i + 1, windowSize);
    out[i] = Math.sqrt(sumSq / n);
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
