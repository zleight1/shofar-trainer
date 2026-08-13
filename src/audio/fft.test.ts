import { describe, expect, it } from 'vitest';
import { fftRadix2 } from './fft';

describe('fftRadix2', () => {
  it('places a cosine at the expected bin', () => {
    const n = 32;
    const re = new Float32Array(n);
    const im = new Float32Array(n);
    const k0 = 3;
    for (let i = 0; i < n; i++) {
      re[i] = Math.cos((2 * Math.PI * k0 * i) / n);
    }
    fftRadix2(re, im);
    let peakK = 0;
    let peak = 0;
    for (let k = 0; k < n / 2; k++) {
      const mag = Math.hypot(re[k], im[k]);
      if (mag > peak) {
        peak = mag;
        peakK = k;
      }
    }
    expect(peakK).toBe(k0);
  });
});
