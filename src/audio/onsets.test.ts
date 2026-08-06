import { describe, expect, it } from 'vitest';
import { generateTestSignal } from './capture';
import { prepareAnalysisEnvelope } from './envelope';
import { clusterIntoNotes, segmentRecording } from './onsets';

describe('segmentRecording', () => {
  it('finds multiple teruah blasts without over-merging', () => {
    const sampleRate = 44100;
    const unit = 0.08;
    const bursts = Array.from({ length: 9 }, (_, i) => ({
      startSec: 0.3 + i * (unit + 0.05),
      durationSec: unit,
    }));
    const samples = generateTestSignal(sampleRate, bursts);
    const env = prepareAnalysisEnvelope(samples, sampleRate);
    const { noteSegments } = segmentRecording(env, sampleRate, unit);
    expect(noteSegments.length).toBeGreaterThanOrEqual(7);
  });

  it('keeps single tekiah as one note', () => {
    const sampleRate = 44100;
    const unit = 0.1;
    const samples = generateTestSignal(sampleRate, [{ startSec: 0.2, durationSec: 0.9 }]);
    const env = prepareAnalysisEnvelope(samples, sampleRate);
    const { noteSegments } = segmentRecording(env, sampleRate, unit);
    expect(noteSegments.length).toBeGreaterThanOrEqual(1);
    expect(noteSegments[0].durationSec).toBeGreaterThan(0.6);
  });
});

describe('clusterIntoNotes', () => {
  it('does not merge two short teruah blasts', () => {
    const sampleRate = 44100;
    const unit = 0.1;
    const raw = [
      { startSample: 0, endSample: 4000, durationSec: 0.08 },
      { startSample: 8000, endSample: 12000, durationSec: 0.08 },
    ];
    const notes = clusterIntoNotes(raw, sampleRate, unit);
    expect(notes).toHaveLength(2);
  });
});
