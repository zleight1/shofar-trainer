import { describe, expect, it } from 'vitest';
import { computeEnvelope, computeHybridEnvelope, normalizeEnvelope } from './envelope';
import { generateTestSignal } from './capture';

describe('computeEnvelope', () => {
  it('produces higher values during active signal', () => {
    const sampleRate = 44100;
    const samples = generateTestSignal(sampleRate, [{ startSec: 0.5, durationSec: 0.2 }]);
    const env = computeHybridEnvelope(samples, sampleRate);
    const midActive = env[Math.floor(0.6 * sampleRate)];
    const silent = env[Math.floor(0.1 * sampleRate)];
    expect(midActive).toBeGreaterThan(silent);
  });

  it('stays finite after a burst into trailing silence', () => {
    const sampleRate = 44100;
    const burst = generateTestSignal(sampleRate, [{ startSec: 0.2, durationSec: 0.28 }]);
    const samples = new Float32Array(Math.floor(1.5 * sampleRate));
    samples.set(burst);
    const env = computeEnvelope(samples, sampleRate);
    let nanCount = 0;
    for (let i = 0; i < env.length; i++) {
      if (!Number.isFinite(env[i])) nanCount++;
    }
    expect(nanCount).toBe(0);
  });
});

describe('normalizeEnvelope', () => {
  it('scales peak to 1', () => {
    const env = new Float32Array([0, 0.5, 1, 0.25]);
    const norm = normalizeEnvelope(env);
    expect(Math.max(...norm)).toBeCloseTo(1);
  });
});
