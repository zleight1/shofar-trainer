import { describe, expect, it } from 'vitest';
import { generateTestSignal } from './capture';
import { computeEnvelope, normalizeEnvelope, smoothEnvelope } from './envelope';
import { detectOnsets, segmentsFromEnvelope } from './onsets';

describe('detectOnsets', () => {
  it('finds multiple bursts in synthetic signal', () => {
    const sampleRate = 44100;
    const unit = 0.08;
    const bursts = Array.from({ length: 9 }, (_, i) => ({
      startSec: i * (unit + 0.04),
      durationSec: unit,
    }));
    const samples = generateTestSignal(sampleRate, bursts);
    const env = smoothEnvelope(normalizeEnvelope(computeEnvelope(samples, sampleRate)));
    const segments = detectOnsets(env, sampleRate, { threshold: 0.08, minBlastMs: 30, minGapMs: 20 });
    expect(segments.length).toBeGreaterThanOrEqual(7);
  });

  it('finds tekiah-length sustained blast', () => {
    const sampleRate = 44100;
    const samples = generateTestSignal(sampleRate, [{ startSec: 0.2, durationSec: 0.9 }]);
    const env = smoothEnvelope(normalizeEnvelope(computeEnvelope(samples, sampleRate)));
    const segments = segmentsFromEnvelope(env, sampleRate);
    expect(segments.length).toBeGreaterThanOrEqual(1);
    expect(segments[0].durationSec).toBeGreaterThan(0.5);
  });
});
