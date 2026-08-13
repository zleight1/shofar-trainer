import type { AnalysisResult, BlastSegment } from '../halacha/types';
import { buildClassifiedFromNotes, scoreRecording } from '../halacha/rules';
import type { SetGroup } from '../halacha/seder';
import { prepareAnalysisEnvelope } from './envelope';
import { segmentRecording } from './onsets';
import { segmentAttacks } from './spectral-flux';

export interface DetailedAnalysisResult extends AnalysisResult {
  rawSegments: BlastSegment[];
  noteSegments: BlastSegment[];
}

export function analyzeRecording(
  samples: Float32Array,
  sampleRate: number,
  unitSec: number,
  pattern: SetGroup['pattern'],
): DetailedAnalysisResult {
  const envelope = prepareAnalysisEnvelope(samples, sampleRate);
  const { rawSegments, noteSegments } = segmentRecording(envelope, sampleRate, unitSec);
  const classified = buildClassifiedFromNotes(pattern, noteSegments, unitSec);
  const scored = scoreRecording(classified, unitSec, pattern);

  return {
    ...scored,
    rawSegments,
    noteSegments,
  };
}

export function analyzeCalibration(
  samples: Float32Array,
  sampleRate: number,
): number {
  const attacks = segmentAttacks(samples, sampleRate, {
    minDistanceSec: 0.032,
    minBlastSec: 0.028,
  });
  const envelope = prepareAnalysisEnvelope(samples, sampleRate);
  const { noteSegments, rawSegments } = segmentRecording(envelope, sampleRate, 0.1);
  const segments =
    attacks.length >= 5 ? attacks : noteSegments.length > 0 ? noteSegments : rawSegments;
  if (segments.length === 0) {
    return 0.12;
  }

  const durations = segments.map((s) => s.durationSec).sort((a, b) => a - b);
  return durations[Math.floor(durations.length / 2)];
}

export { prepareAnalysisEnvelope, segmentRecording };
