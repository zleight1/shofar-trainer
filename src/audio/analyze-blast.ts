import type { BlastType, ClassifiedBlast } from '../halacha/types';
import { prepareAnalysisEnvelope } from './envelope';
import { segmentRecording } from './onsets';
import { classifyByExpectedType } from './classify';
import type { RecordingResult } from './capture';

export function analyzeSingleBlast(
  recording: RecordingResult,
  unitSec: number,
  expectedType: BlastType,
): ClassifiedBlast {
  const envelope = prepareAnalysisEnvelope(recording.samples, recording.sampleRate);
  const { noteSegments } = segmentRecording(envelope, recording.sampleRate, unitSec);

  if (noteSegments.length === 0) {
    return {
      type: expectedType,
      segments: [
        {
          startSample: 0,
          endSample: recording.samples.length,
          durationSec: recording.durationSec,
        },
      ],
      totalDurationSec: recording.durationSec,
    };
  }

  return classifyByExpectedType(noteSegments, expectedType);
}

export function inferUnitFromBlasts(blasts: ClassifiedBlast[], unitFallback = 0.1): number {
  const teruah = blasts.find((b) => b.type === 'teruah');
  if (teruah && teruah.segments.length > 0) {
    const durs = teruah.segments.map((s) => s.durationSec).sort((a, b) => a - b);
    return durs[Math.floor(durs.length / 2)];
  }

  for (const b of blasts) {
    if (b.type === 'shevarim' && b.segments.length >= 3) {
      const avg = b.totalDurationSec / b.segments.length;
      return avg / 3;
    }
  }

  return unitFallback;
}
