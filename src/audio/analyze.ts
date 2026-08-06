import type { AnalysisResult } from '../halacha/types';
import { buildClassifiedFromSetPattern, scoreRecording } from '../halacha/rules';
import type { SetGroup } from '../halacha/seder';
import { computeEnvelope, normalizeEnvelope, smoothEnvelope } from './envelope';
import { segmentsFromEnvelope } from './onsets';

export function analyzeRecording(
  samples: Float32Array,
  sampleRate: number,
  unitSec: number,
  pattern: SetGroup['pattern'],
): AnalysisResult {
  const envelope = smoothEnvelope(normalizeEnvelope(computeEnvelope(samples, sampleRate)));
  const segments = segmentsFromEnvelope(envelope, sampleRate, {
    threshold: 0.1,
    minBlastMs: 35,
    minGapMs: 25,
  });
  const classified = buildClassifiedFromSetPattern(pattern, segments, unitSec);
  return scoreRecording(classified, unitSec);
}

export function analyzeCalibration(
  samples: Float32Array,
  sampleRate: number,
): number {
  const envelope = smoothEnvelope(normalizeEnvelope(computeEnvelope(samples, sampleRate)));
  const segments = segmentsFromEnvelope(envelope, sampleRate, {
    threshold: 0.1,
    minBlastMs: 30,
    minGapMs: 20,
  });
  if (segments.length === 0) {
    const active = envelope.filter((v) => v > 0.1);
    if (active.length === 0) return 0.15;
    return active.length / sampleRate / 9;
  }
  const durations = segments.map((s) => s.durationSec).sort((a, b) => a - b);
  return durations[Math.floor(durations.length / 2)];
}

export { computeEnvelope, normalizeEnvelope, smoothEnvelope, segmentsFromEnvelope };
