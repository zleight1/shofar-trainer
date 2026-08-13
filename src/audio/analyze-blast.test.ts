import { describe, expect, it } from 'vitest';
import { generateTestSignal } from './capture';
import { analyzeSingleBlast } from './analyze-blast';
import { checkTeruah } from '../halacha/rules';

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

function addEcho(src: Float32Array, delaySec: number, gain: number): Float32Array {
  const delay = Math.floor(delaySec * SR);
  const out = new Float32Array(src.length + delay);
  out.set(src);
  for (let i = 0; i < src.length; i++) {
    out[i + delay] += src[i] * gain;
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
    expect(result.segments.length).toBeGreaterThanOrEqual(9);
    expect(result.segments.length).toBeLessThanOrEqual(12);
    expect(checkTeruah(result).some((i) => i.code === 'teruah_count')).toBe(false);
  });

  it('splits nine clipped teruah notes that still ring between attacks', () => {
    const samples = new Float32Array(Math.floor(1.4 * SR));
    for (let i = 0; i < 9; i++) {
      const startSec = 0.2 + i * 0.1;
      burst(samples, startSec, 0.07, 8, 420);
      ring(samples, startSec + 0.07, 0.04, 2.5, 420, 0.018);
    }
    const result = analyzeSingleBlast(recording(hardClip(samples)), 0.1, 'teruah');
    expect(result.segments.length).toBeGreaterThanOrEqual(9);
    expect(result.segments.length).toBeLessThanOrEqual(12);
    expect(checkTeruah(result).some((i) => i.code === 'teruah_count')).toBe(false);
  });

  it('does not invent extra notes on a 12-blast clipped teruah with vibrato', () => {
    const samples = new Float32Array(Math.floor(2.2 * SR));
    for (let n = 0; n < 12; n++) {
      const startSec = 0.25 + n * 0.12;
      const start = Math.floor(startSec * SR);
      const end = Math.floor((startSec + 0.08) * SR);
      for (let i = start; i < end && i < samples.length; i++) {
        const t = (i - start) / SR;
        const env = Math.min(1, t * 80) * Math.min(1, (0.08 - t) * 80);
        const vib = 1 + 0.35 * Math.sin(2 * Math.PI * 18 * (startSec + t));
        samples[i] += Math.sin(2 * Math.PI * 380 * (startSec + t)) * 8 * env * vib;
      }
      ring(samples, startSec + 0.08, 0.05, 3, 380, 0.02);
    }
    const result = analyzeSingleBlast(recording(hardClip(samples)), 0.1, 'teruah');
    expect(result.segments.length).toBeGreaterThanOrEqual(9);
    expect(result.segments.length).toBeLessThanOrEqual(16);
  });

  it('counts nine clear notes through slapback and late room echo', () => {
    const samples = new Float32Array(Math.floor(1.8 * SR));
    for (let i = 0; i < 9; i++) {
      burst(samples, 0.2 + i * 0.12, 0.07, 8, 400);
    }
    const withEcho = addEcho(addEcho(hardClip(samples), 0.04, 0.4), 0.2, 0.28);
    const result = analyzeSingleBlast(recording(withEcho), 0.1, 'teruah');
    expect(result.segments.length).toBeGreaterThanOrEqual(9);
    expect(result.segments.length).toBeLessThanOrEqual(12);
    expect(checkTeruah(result).some((i) => i.code === 'teruah_count')).toBe(false);
  });

  it('still finds nine notes when spacing is slightly uneven', () => {
    const samples = new Float32Array(Math.floor(1.8 * SR));
    const starts = [0.2, 0.3, 0.44, 0.54, 0.64, 0.79, 0.9, 1.02, 1.13];
    for (const startSec of starts) {
      burst(samples, startSec, 0.07, 8, 400);
    }
    const result = analyzeSingleBlast(recording(hardClip(samples)), 0.1, 'teruah');
    expect(result.segments.length).toBeGreaterThanOrEqual(9);
    expect(result.segments.length).toBeLessThanOrEqual(12);
    expect(checkTeruah(result).some((i) => i.code === 'teruah_count')).toBe(false);
  });

  it('does not let late echo invent a ninth note from eight', () => {
    const samples = new Float32Array(Math.floor(1.7 * SR));
    for (let i = 0; i < 8; i++) {
      burst(samples, 0.2 + i * 0.12, 0.07, 8, 400);
    }
    const withEcho = addEcho(hardClip(samples), 0.2, 0.35);
    const result = analyzeSingleBlast(recording(withEcho), 0.1, 'teruah');
    expect(result.segments.length).toBeLessThan(9);
    expect(checkTeruah(result).some((i) => i.code === 'teruah_count')).toBe(true);
  });

  it('fails eight dry notes as short of nine', () => {
    const samples = new Float32Array(Math.floor(1.5 * SR));
    for (let i = 0; i < 8; i++) {
      burst(samples, 0.2 + i * 0.12, 0.07, 8, 400);
    }
    const result = analyzeSingleBlast(recording(hardClip(samples)), 0.1, 'teruah');
    expect(result.segments.length).toBeLessThan(9);
    expect(checkTeruah(result).some((i) => i.code === 'teruah_count')).toBe(true);
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
