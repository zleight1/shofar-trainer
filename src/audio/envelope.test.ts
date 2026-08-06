import { describe, expect, it } from 'vitest';
import { computeHybridEnvelope, normalizeEnvelope } from './envelope';
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
});

describe('normalizeEnvelope', () => {
  it('scales peak to 1', () => {
    const env = new Float32Array([0, 0.5, 1, 0.25]);
    const norm = normalizeEnvelope(env);
    expect(Math.max(...norm)).toBeCloseTo(1);
  });
});
