import type { AnalysisResult, BlastSegment, BlastType, ClassifiedBlast } from '../halacha/types';
import { clampUnit, UNIT_DEFAULT_SEC } from '../halacha/duration-targets';
import { prepareAnalysisEnvelope } from './envelope';
import { segmentRecording } from './onsets';
import type { RecordingResult } from './capture';
import { DEFAULT_HALACHA_CONFIG } from '../halacha/types';

function fullSegment(recording: RecordingResult): BlastSegment {
  return {
    startSample: 0,
    endSample: recording.samples.length,
    durationSec: recording.durationSec,
  };
}

export function analyzeSingleBlast(
  recording: RecordingResult,
  unitSec: number,
  expectedType: BlastType,
): ClassifiedBlast {
  const dur = recording.durationSec;

  if (dur < 0.04) {
    return { type: expectedType, segments: [], totalDurationSec: 0 };
  }

  if (expectedType === 'tekiah' || expectedType === 'tekiah_gedolah') {
    return {
      type: expectedType,
      segments: [fullSegment(recording)],
      totalDurationSec: dur,
    };
  }

  const envelope = prepareAnalysisEnvelope(recording.samples, recording.sampleRate);
  const { noteSegments, rawSegments } = segmentRecording(envelope, recording.sampleRate, unitSec);

  if (expectedType === 'shevarim') {
    const minNote = Math.max(0.15, unitSec * 2);
    let segments = noteSegments.filter((s) => s.durationSec >= minNote);
    if (segments.length < 2) {
      segments = rawSegments.filter((s) => s.durationSec >= minNote);
    }
    if (segments.length === 0) {
      return { type: 'shevarim', segments: [fullSegment(recording)], totalDurationSec: dur };
    }
    return { type: 'shevarim', segments, totalDurationSec: dur };
  }

  if (expectedType === 'teruah') {
    const minBlast = Math.max(0.035, unitSec * 0.5);
    let segments = noteSegments.filter((s) => s.durationSec >= minBlast);
    if (segments.length < 5) {
      segments = rawSegments.filter((s) => s.durationSec >= minBlast);
    }
    if (segments.length === 0) {
      return { type: 'teruah', segments: [fullSegment(recording)], totalDurationSec: dur };
    }
    return { type: 'teruah', segments, totalDurationSec: dur };
  }

  return { type: expectedType, segments: [fullSegment(recording)], totalDurationSec: dur };
}

export function inferUnitFromBlasts(
  blasts: ClassifiedBlast[],
  fallback = UNIT_DEFAULT_SEC,
): number {
  const teruah = blasts.find((b) => b.type === 'teruah');
  if (teruah && teruah.totalDurationSec > 0.4) {
    if (teruah.segments.length >= 5) {
      const durs = teruah.segments.map((s) => s.durationSec).sort((a, b) => a - b);
      return clampUnit(durs[Math.floor(durs.length / 2)]);
    }
    return clampUnit(teruah.totalDurationSec / DEFAULT_HALACHA_CONFIG.minTeruahBlasts);
  }

  const shevarim = blasts.find((b) => b.type === 'shevarim');
  if (shevarim && shevarim.totalDurationSec > 0.5) {
    if (shevarim.segments.length >= 3) {
      const durs = shevarim.segments.map((s) => s.durationSec).sort((a, b) => a - b);
      const medianNote = durs[Math.floor(durs.length / 2)];
      return clampUnit(medianNote / DEFAULT_HALACHA_CONFIG.minShevarimNoteUnits);
    }
    return clampUnit(shevarim.totalDurationSec / DEFAULT_HALACHA_CONFIG.minTekiahUnits);
  }

  const tekiah = blasts.find((b) => b.type === 'tekiah');
  if (tekiah && tekiah.totalDurationSec > 2) {
    return clampUnit(tekiah.totalDurationSec / DEFAULT_HALACHA_CONFIG.minTekiahUnits);
  }

  return clampUnit(fallback);
}

export function buildGuidedSetAnalysis(
  blasts: ClassifiedBlast[],
  scored: AnalysisResult,
): AnalysisResult & { noteSegments: BlastSegment[]; rawSegments: BlastSegment[] } {
  const noteSegments = blasts.flatMap((b) => b.segments);
  return {
    ...scored,
    noteSegments,
    rawSegments: noteSegments,
  };
}
