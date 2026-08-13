import type { AnalysisResult, BlastSegment, BlastType, ClassifiedBlast } from '../halacha/types';
import { clampUnit, UNIT_DEFAULT_SEC } from '../halacha/duration-targets';
import { prepareAnalysisEnvelope } from './envelope';
import { segmentRecording } from './onsets';
import type { RecordingResult } from './capture';
import { DEFAULT_HALACHA_CONFIG } from '../halacha/types';
import { partitionShevarimTeruah } from '../halacha/rules';
import { analyzeAttacks } from './spectral-flux';
import { getRoomProfile, rememberEchoFromDiagnosis } from '../store/diagnostics';

function fullSegment(recording: RecordingResult): BlastSegment {
  return {
    startSample: 0,
    endSample: recording.samples.length,
    durationSec: recording.durationSec,
  };
}

function byTime(a: BlastSegment, b: BlastSegment): number {
  return a.startSample - b.startSample;
}

/** Keep up to three shevarim groans; do not drop a shorter last note. */
export function pickShevarimNotes(segments: BlastSegment[]): BlastSegment[] {
  const usable = segments.filter((s) => s.durationSec >= 0.06).sort(byTime);
  if (usable.length <= 3) return usable;
  const longest = [...usable].sort((a, b) => b.durationSec - a.durationSec).slice(0, 3);
  return longest.sort(byTime);
}

function amplitudeNotes(
  recording: RecordingResult,
  unitSec: number,
): { noteSegments: BlastSegment[]; rawSegments: BlastSegment[] } {
  const envelope = prepareAnalysisEnvelope(recording.samples, recording.sampleRate);
  return segmentRecording(envelope, recording.sampleRate, unitSec);
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

  const picked = analyzeAttacks(recording.samples, recording.sampleRate, {
    minDistanceSec:
      expectedType === 'shevarim' ? Math.max(0.1, unitSec * 1.2) : Math.max(0.065, unitSec * 0.7),
    minBlastSec:
      expectedType === 'shevarim' ? Math.max(0.08, unitSec * 0.9) : Math.max(0.028, unitSec * 0.35),
    isochronous: expectedType === 'teruah',
    echoLagSec: getRoomProfile()?.echoLagSec ?? null,
  });
  const attacks = picked.segments;
  if (expectedType === 'teruah') {
    rememberEchoFromDiagnosis(picked.diagnosis);
  }

  if (expectedType === 'shevarim') {
    const fromAttacks = pickShevarimNotes(attacks);
    if (fromAttacks.length >= 2) {
      return {
        type: 'shevarim',
        segments: fromAttacks,
        totalDurationSec: dur,
        diagnosis: picked.diagnosis,
      };
    }
    const { noteSegments, rawSegments } = amplitudeNotes(recording, unitSec);
    const minNote = Math.max(0.06, unitSec * 0.8);
    let segments = pickShevarimNotes(noteSegments.filter((s) => s.durationSec >= minNote));
    if (segments.length < 2) {
      segments = pickShevarimNotes(rawSegments.filter((s) => s.durationSec >= minNote));
    }
    if (segments.length === 0) {
      return { type: 'shevarim', segments: [fullSegment(recording)], totalDurationSec: dur };
    }
    return { type: 'shevarim', segments, totalDurationSec: dur };
  }

  if (expectedType === 'teruah') {
    if (attacks.length >= 5) {
      return {
        type: 'teruah',
        segments: attacks,
        totalDurationSec: dur,
        diagnosis: picked.diagnosis,
      };
    }
    const { noteSegments, rawSegments } = amplitudeNotes(recording, unitSec);
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

  if (expectedType === 'shevarim_teruah') {
    rememberEchoFromDiagnosis(picked.diagnosis);
    let segments = attacks;
    if (segments.length < 8) {
      const { noteSegments, rawSegments } = amplitudeNotes(recording, unitSec);
      segments = noteSegments.length >= 8 ? noteSegments : rawSegments;
    }
    if (segments.length === 0) {
      return {
        type: 'shevarim_teruah',
        segments: [fullSegment(recording)],
        totalDurationSec: dur,
      };
    }
    return {
      type: 'shevarim_teruah',
      segments,
      totalDurationSec: dur,
      diagnosis: picked.diagnosis,
    };
  }

  return { type: expectedType, segments: [fullSegment(recording)], totalDurationSec: dur };
}

export function inferUnitFromBlasts(
  blasts: ClassifiedBlast[],
  fallback = UNIT_DEFAULT_SEC,
): number {
  const teruah = blasts.find((b) => b.type === 'teruah');
  const st = blasts.find((b) => b.type === 'shevarim_teruah');
  const teruahNotes = teruah?.segments?.length
    ? teruah.segments
    : st
      ? partitionShevarimTeruah(st.segments, fallback).teruah
      : [];
  const teruahTotal = teruah
    ? teruah.totalDurationSec
    : teruahNotes.reduce((sum, n) => sum + n.durationSec, 0);

  if (teruahNotes.length >= 5 || teruahTotal > 0.4) {
    if (teruahNotes.length >= 5) {
      const durs = teruahNotes.map((s) => s.durationSec).sort((a, b) => a - b);
      return clampUnit(durs[Math.floor(durs.length / 2)]);
    }
    return clampUnit(teruahTotal / DEFAULT_HALACHA_CONFIG.minTeruahBlasts);
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
