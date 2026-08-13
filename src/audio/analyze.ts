import type { AnalysisResult, BlastSegment } from '../halacha/types';
import { buildClassifiedFromNotes, scoreRecording } from '../halacha/rules';
import type { SetGroup } from '../halacha/seder';
import { prepareAnalysisEnvelope } from './envelope';
import { segmentRecording } from './onsets';
import { analyzeAttacks } from './spectral-flux';
import { getRoomProfile, rememberEchoFromDiagnosis } from '../store/diagnostics';

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
  const picked = analyzeAttacks(samples, sampleRate, {
    minDistanceSec: 0.065,
    minBlastSec: 0.028,
    isochronous: true,
    echoLagSec: getRoomProfile()?.echoLagSec ?? null,
  });
  rememberEchoFromDiagnosis(picked.diagnosis);
  const attacks = picked.segments;
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
