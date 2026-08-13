import { describe, expect, it } from 'vitest';
import { dropEchoTaps, estimateEchoLagSec, type FluxPeak } from './echo-taps';

const HOP = 256 / 44100;

function peaksAt(timesSec: number[], strengths: number[]): FluxPeak[] {
  return timesSec.map((t, i) => ({ i: Math.round(t / HOP), v: strengths[i] ?? 1 }));
}

describe('estimateEchoLagSec', () => {
  it('finds a 200 ms weaker tap after eight notes', () => {
    const times: number[] = [];
    const strengths: number[] = [];
    for (let n = 0; n < 8; n++) {
      times.push(0.2 + n * 0.12);
      strengths.push(1);
    }
    times.push(0.2 + 7 * 0.12 + 0.2);
    strengths.push(0.35);
    times.push(0.2 + 6 * 0.12 + 0.2);
    strengths.push(0.35);
    const lag = estimateEchoLagSec(peaksAt(times, strengths), HOP);
    expect(lag).not.toBeNull();
    expect(lag!).toBeGreaterThan(0.16);
    expect(lag!).toBeLessThan(0.24);
  });

  it('does not treat the playing period as echo', () => {
    const times = Array.from({ length: 9 }, (_, n) => 0.2 + n * 0.12);
    const lag = estimateEchoLagSec(peaksAt(times, Array(9).fill(1)), HOP);
    expect(lag).toBeNull();
  });
});

describe('dropEchoTaps', () => {
  it('drops the late weaker copies and keeps eight notes', () => {
    const times: number[] = [];
    const strengths: number[] = [];
    for (let n = 0; n < 8; n++) {
      times.push(0.2 + n * 0.12);
      strengths.push(1);
    }
    times.push(1.04 + 0.2, 0.92 + 0.2);
    strengths.push(0.35, 0.35);
    const { kept, dropped } = dropEchoTaps(peaksAt(times, strengths), 0.2, HOP);
    expect(dropped.length).toBeGreaterThanOrEqual(1);
    expect(kept.length).toBe(8);
  });

  it('does not drop equal-strength notes at that lag', () => {
    const times = [0.2, 0.4];
    const { kept, dropped } = dropEchoTaps(peaksAt(times, [1, 1]), 0.2, HOP);
    expect(dropped).toHaveLength(0);
    expect(kept).toHaveLength(2);
  });
});
