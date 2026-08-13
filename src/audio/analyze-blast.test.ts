import { describe, expect, it } from 'vitest';
import { generateTestSignal } from './capture';
import { analyzeSingleBlast } from './analyze-blast';

const SR = 44100;

function burst(
  samples: Float32Array,
  startSec: number,
  durationSec: number,
  amp: number,
  freq: number,
): void {
  const start = Math.floor(startSec * SR);
  const end = Math.floor((startSec + durationSec) * SR);
  for (let i = start; i < end && i < samples.length; i++) {
    const t = (i - start) / SR;
    const env = Math.min(1, t * 80) * Math.min(1, (durationSec - t) * 80);
    samples[i] += Math.sin(2 * Math.PI * freq * t) * amp * env;
  }
}

function ring(
  samples: Float32Array,
  fromSec: number,
  durationSec: number,
  startAmp: number,
  freq: number,
  tauSec: number,
): void {
  const start = Math.floor(fromSec * SR);
  const end = Math.floor((fromSec + durationSec) * SR);
  for (let i = start; i < end && i < samples.length; i++) {
    const t = (i - start) / SR;
    samples[i] += Math.sin(2 * Math.PI * freq * t) * startAmp * Math.exp(-t / tauSec);
  }
}

function hardClip(samples: Float32Array): Float32Array {
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    out[i] = Math.max(-1, Math.min(1, samples[i]));
  }
  return out;
}

function recording(samples: Float32Array) {
  return { samples, sampleRate: SR, durationSec: samples.length / SR };
}

describe('analyzeSingleBlast teruah', () => {
  it('still splits clean silence-gapped teruah notes', () => {
    const unit = 0.08;
    const bursts = Array.from({ length: 9 }, (_, i) => ({
      startSec: 0.3 + i * (unit + 0.05),
      durationSec: unit,
    }));
    const samples = generateTestSignal(SR, bursts);
    const result = analyzeSingleBlast(recording(samples), unit, 'teruah');
    expect(result.segments.length).toBeGreaterThanOrEqual(7);
  });

  it('splits nine clipped teruah notes that still ring between attacks', () => {
    const samples = new Float32Array(Math.floor(1.4 * SR));
    for (let i = 0; i < 9; i++) {
      const startSec = 0.2 + i * 0.1;
      burst(samples, startSec, 0.07, 8, 420);
      ring(samples, startSec + 0.07, 0.04, 2.5, 420, 0.018);
    }
    const result = analyzeSingleBlast(recording(hardClip(samples)), 0.1, 'teruah');
    expect(result.segments.length).toBeGreaterThanOrEqual(7);
  });
});

describe('analyzeSingleBlast shevarim', () => {
  it('splits three clipped shevarim notes that ring in the gaps', () => {
    const samples = new Float32Array(Math.floor(1.5 * SR));
    const notes = [
      { startSec: 0.2, durationSec: 0.28 },
      { startSec: 0.56, durationSec: 0.28 },
      { startSec: 0.92, durationSec: 0.28 },
    ];
    for (const b of notes) {
      burst(samples, b.startSec, b.durationSec, 8, 380);
      ring(samples, b.startSec + b.durationSec, 0.12, 3, 380, 0.04);
    }
    const result = analyzeSingleBlast(recording(hardClip(samples)), 0.1, 'shevarim');
    expect(result.segments).toHaveLength(3);
  });

  it('keeps a shorter third shever after two full notes', () => {
    const samples = new Float32Array(Math.floor(1.4 * SR));
    for (let i = 0; i < samples.length; i++) samples[i] = (i % 17) * 1e-6;
    burst(samples, 0.2, 0.28, 0.8, 380);
    burst(samples, 0.56, 0.28, 0.8, 380);
    burst(samples, 0.92, 0.16, 0.8, 380);
    const result = analyzeSingleBlast(recording(samples), 0.1, 'shevarim');
    expect(result.segments).toHaveLength(3);
  });
});

describe('analyzeSingleBlast tekiah', () => {
  it('keeps a sustained blow as one segment', () => {
    const samples = generateTestSignal(SR, [{ startSec: 0.2, durationSec: 0.9 }]);
    const result = analyzeSingleBlast(recording(samples), 0.1, 'tekiah');
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].durationSec).toBeGreaterThan(0.8);
  });
});
