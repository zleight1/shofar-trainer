import type {
  AnalysisResult,
  BlastSegment,
  ClassifiedBlast,
  HalachaConfig,
  ScoreIssue,
} from './types';
import { DEFAULT_HALACHA_CONFIG } from './types';

export function middleDuration(classified: ClassifiedBlast[]): number {
  const middle = classified.filter(
    (b) => b.type === 'shevarim' || b.type === 'teruah' || b.type === 'shevarim_teruah',
  );
  return middle.reduce((sum, b) => sum + b.totalDurationSec, 0);
}

export function tekiahDurations(classified: ClassifiedBlast[]): number[] {
  return classified
    .filter((b) => b.type === 'tekiah' || b.type === 'tekiah_gedolah')
    .map((b) => b.totalDurationSec);
}

export function computeTekiahRatio(classified: ClassifiedBlast[]): number | null {
  const tekiahs = tekiahDurations(classified);
  const middle = middleDuration(classified);
  if (tekiahs.length === 0 || middle <= 0) return null;
  const avgTekiah = tekiahs.reduce((a, b) => a + b, 0) / tekiahs.length;
  return avgTekiah / middle;
}

export function checkTekiahRatio(
  classified: ClassifiedBlast[],
  config: HalachaConfig = DEFAULT_HALACHA_CONFIG,
): ScoreIssue[] {
  const issues: ScoreIssue[] = [];
  const ratio = computeTekiahRatio(classified);
  if (ratio === null) return issues;

  const low = 1 - config.ratioTolerance;
  const high = 1 + config.ratioTolerance;

  if (ratio < low) {
    issues.push({
      severity: 'error',
      code: 'tekiah_too_short',
      message: `Tekiah is too short relative to middle (${(ratio * 100).toFixed(0)}% — aim for ~100%)`,
    });
  } else if (ratio > high) {
    issues.push({
      severity: 'warn',
      code: 'tekiah_too_long',
      message: `Tekiah is longer than middle (${(ratio * 100).toFixed(0)}% — aim for ~100%)`,
    });
  }
  return issues;
}

export function checkShevarim(
  blast: ClassifiedBlast,
  unitSec: number,
  config: HalachaConfig = DEFAULT_HALACHA_CONFIG,
): ScoreIssue[] {
  const issues: ScoreIssue[] = [];
  const count = blast.segments.length;
  const minTotal = config.minShevarimNoteUnits * config.shevarimNoteCount * unitSec * 0.75;

  if (count !== config.shevarimNoteCount) {
    const totalOk = blast.totalDurationSec >= minTotal;
    issues.push({
      severity: totalOk ? 'warn' : 'error',
      code: 'shevarim_count',
      message: totalOk
        ? `Could not detect ${config.shevarimNoteCount} separate notes (${count} detected) — total length ${blast.totalDurationSec.toFixed(1)}s looks OK`
        : `Expected ${config.shevarimNoteCount} shevarim notes, detected ${count}`,
    });
  }
  const minDur = config.minShevarimNoteUnits * unitSec;
  for (let i = 0; i < blast.segments.length; i++) {
    if (blast.segments[i].durationSec < minDur && blast.segments[i].durationSec < blast.totalDurationSec * 0.4) {
      issues.push({
        severity: 'warn',
        code: 'shevarim_note_short',
        message: `Shevarim note ${i + 1} may be too short (${blast.segments[i].durationSec.toFixed(2)}s)`,
      });
    }
  }
  return issues;
}

export function checkTeruah(
  blast: ClassifiedBlast,
  config: HalachaConfig = DEFAULT_HALACHA_CONFIG,
): ScoreIssue[] {
  const issues: ScoreIssue[] = [];
  const count = blast.segments.length;
  if (count < config.minTeruahBlasts) {
    const totalLikelyOk = blast.totalDurationSec >= 4.5;
    issues.push({
      severity: totalLikelyOk && count >= 1 ? 'warn' : 'error',
      code: 'teruah_count',
      message:
        totalLikelyOk && count >= 1
          ? `Detected ${count} teruah blasts (expected ~${config.minTeruahBlasts}) — total ${blast.totalDurationSec.toFixed(1)}s may be OK`
          : `Expected at least ${config.minTeruahBlasts} teruah blasts, detected ${count}`,
    });
  }
  return issues;
}

export function checkStandaloneTekiah(
  blast: ClassifiedBlast,
  unitSec: number,
  config: HalachaConfig = DEFAULT_HALACHA_CONFIG,
): ScoreIssue[] {
  const minSec = config.minTekiahUnits * unitSec;
  if (blast.totalDurationSec < minSec) {
    return [
      {
        severity: 'warn',
        code: 'tekiah_min_length',
        message: `Tekiah may be below minimum length (${blast.totalDurationSec.toFixed(2)}s vs ~${minSec.toFixed(2)}s)`,
      },
    ];
  }
  return [];
}

export function scoreRecording(
  classified: ClassifiedBlast[],
  unitSec: number,
  config: HalachaConfig = DEFAULT_HALACHA_CONFIG,
): AnalysisResult {
  const issues: ScoreIssue[] = [];

  issues.push(...checkTekiahRatio(classified, config));

  for (const blast of classified) {
    switch (blast.type) {
      case 'shevarim':
        issues.push(...checkShevarim(blast, unitSec, config));
        break;
      case 'teruah':
        issues.push(...checkTeruah(blast, config));
        break;
      case 'tekiah':
      case 'tekiah_gedolah':
        if (classified.length === 1) {
          issues.push(...checkStandaloneTekiah(blast, unitSec, config));
        }
        break;
      case 'shevarim_teruah':
        issues.push(...checkShevarim(blast, unitSec, config));
        issues.push(...checkTeruah(blast, config));
        break;
      default: {
        const _exhaustive: never = blast.type;
        void _exhaustive;
      }
    }
  }

  const passed = !issues.some((i) => i.severity === 'error');
  return {
    classified,
    issues,
    passed,
    tekiahRatio: computeTekiahRatio(classified),
  };
}

/** Split segments into shevarim portion (first 3 medium) and teruah portion for T-S-T sets */
export function partitionShevarimTeruah(
  segments: BlastSegment[],
  unitSec: number,
): { shevarim: BlastSegment[]; teruah: BlastSegment[] } {
  const mediumThreshold = unitSec * 2;
  const shevarim: BlastSegment[] = [];
  const teruah: BlastSegment[] = [];

  for (const seg of segments) {
    if (shevarim.length < 3 && seg.durationSec >= mediumThreshold) {
      shevarim.push(seg);
    } else {
      teruah.push(seg);
    }
  }
  return { shevarim, teruah };
}

/** Build classified blasts from clustered notes using known set pattern (positional). */
export function buildClassifiedFromNotes(
  pattern: 'tst' | 'tsh' | 'tt' | 'gedolah',
  notes: BlastSegment[],
  unitSec: number,
): ClassifiedBlast[] {
  if (notes.length === 0) return [];

  if (pattern === 'gedolah') {
    const total = spanDuration(notes);
    return [{ type: 'tekiah_gedolah', segments: notes, totalDurationSec: total }];
  }

  if (notes.length === 1) {
    return [{ type: 'tekiah', segments: notes, totalDurationSec: notes[0].durationSec }];
  }

  const first = notes[0];
  const last = notes[notes.length - 1];
  const middle = notes.slice(1, -1);

  if (pattern === 'tsh') {
    const shNotes = middle.length > 0 ? middle : notes.slice(1);
    return [
      blast('tekiah', [first]),
      blast('shevarim', shNotes.length >= 3 ? shNotes.slice(0, 3) : shNotes),
      blast('tekiah', [last]),
    ].filter((b) => b.segments.length > 0);
  }

  if (pattern === 'tt') {
    const trNotes = middle.length > 0 ? middle : notes.slice(1, -1);
    return [
      blast('tekiah', [first]),
      blast('teruah', trNotes),
      blast('tekiah', [last]),
    ].filter((b) => b.segments.length > 0);
  }

  // tst — split middle into shevarim (medium notes) + teruah (short notes)
  const mediumThreshold = unitSec * 1.6;
  const shevarimNotes: BlastSegment[] = [];
  const teruahNotes: BlastSegment[] = [];

  for (const note of middle) {
    if (shevarimNotes.length < 3 && note.durationSec >= mediumThreshold) {
      shevarimNotes.push(note);
    } else {
      teruahNotes.push(note);
    }
  }

  if (shevarimNotes.length === 0 && middle.length >= 3) {
    shevarimNotes.push(...middle.slice(0, 3));
    teruahNotes.push(...middle.slice(3));
  } else if (teruahNotes.length === 0 && middle.length > shevarimNotes.length) {
    teruahNotes.push(...middle.filter((n) => !shevarimNotes.includes(n)));
  }

  const result: ClassifiedBlast[] = [blast('tekiah', [first])];
  if (shevarimNotes.length > 0) result.push(blast('shevarim', shevarimNotes));
  if (teruahNotes.length > 0) result.push(blast('teruah', teruahNotes));
  result.push(blast('tekiah', [last]));
  return result.filter((b) => b.segments.length > 0);
}

function blast(type: ClassifiedBlast['type'], segments: BlastSegment[]): ClassifiedBlast {
  return { type, segments, totalDurationSec: spanDuration(segments) };
}

function spanDuration(segments: BlastSegment[]): number {
  if (segments.length === 0) return 0;
  const sampleRateGuess = segments[0].durationSec > 0
    ? (segments[0].endSample - segments[0].startSample) / segments[0].durationSec
    : 44100;
  const start = segments[0].startSample;
  const end = segments[segments.length - 1].endSample;
  return (end - start) / sampleRateGuess;
}

export function buildClassifiedFromSetPattern(
  pattern: 'tst' | 'tsh' | 'tt' | 'gedolah',
  segments: BlastSegment[],
  unitSec: number,
): ClassifiedBlast[] {
  if (segments.length === 0) return [];

  if (pattern === 'gedolah') {
    const total = segments.reduce((s, seg) => s + seg.durationSec, 0);
    return [{ type: 'tekiah_gedolah', segments, totalDurationSec: total }];
  }

  const longThreshold = unitSec * 4;
  const mediumThreshold = unitSec * 2;

  const longSegs = segments.filter((s) => s.durationSec >= longThreshold);
  const shortSegs = segments.filter((s) => s.durationSec < mediumThreshold);
  const mediumSegs = segments.filter(
    (s) => s.durationSec >= mediumThreshold && s.durationSec < longThreshold,
  );

  const result: ClassifiedBlast[] = [];

  if (pattern === 'tsh') {
    if (longSegs.length >= 2) {
      result.push({
        type: 'tekiah',
        segments: [longSegs[0]],
        totalDurationSec: longSegs[0].durationSec,
      });
    }
    if (mediumSegs.length >= 1 || segments.length >= 3) {
      const shSegs = mediumSegs.length >= 3 ? mediumSegs.slice(0, 3) : segments.slice(1, -1);
      const total = shSegs.reduce((s, seg) => s + seg.durationSec, 0);
      result.push({ type: 'shevarim', segments: shSegs, totalDurationSec: total });
    }
    if (longSegs.length >= 2) {
      result.push({
        type: 'tekiah',
        segments: [longSegs[longSegs.length - 1]],
        totalDurationSec: longSegs[longSegs.length - 1].durationSec,
      });
    }
    return result;
  }

  if (pattern === 'tt') {
    if (longSegs.length >= 1) {
      result.push({
        type: 'tekiah',
        segments: [longSegs[0]],
        totalDurationSec: longSegs[0].durationSec,
      });
    }
    const trSegs = shortSegs.length > 0 ? shortSegs : segments.slice(1, -1);
    const trTotal = trSegs.reduce((s, seg) => s + seg.durationSec, 0);
    result.push({ type: 'teruah', segments: trSegs, totalDurationSec: trTotal });
    if (longSegs.length >= 2) {
      result.push({
        type: 'tekiah',
        segments: [longSegs[longSegs.length - 1]],
        totalDurationSec: longSegs[longSegs.length - 1].durationSec,
      });
    } else if (longSegs.length === 1 && segments.length > 1) {
      const last = segments[segments.length - 1];
      if (last.durationSec >= longThreshold) {
        result.push({
          type: 'tekiah',
          segments: [last],
          totalDurationSec: last.durationSec,
        });
      }
    }
    return result;
  }

  // tst pattern
  if (longSegs.length >= 1) {
    result.push({
      type: 'tekiah',
      segments: [longSegs[0]],
      totalDurationSec: longSegs[0].durationSec,
    });
  }
  const { shevarim, teruah } = partitionShevarimTeruah(
    mediumSegs.length >= 3 ? mediumSegs.concat(shortSegs) : segments.slice(1, -1),
    unitSec,
  );
  if (shevarim.length > 0) {
    const total = shevarim.reduce((s, seg) => s + seg.durationSec, 0);
    result.push({ type: 'shevarim', segments: shevarim, totalDurationSec: total });
  }
  if (teruah.length > 0) {
    const total = teruah.reduce((s, seg) => s + seg.durationSec, 0);
    result.push({ type: 'teruah', segments: teruah, totalDurationSec: total });
  }
  if (longSegs.length >= 2) {
    result.push({
      type: 'tekiah',
      segments: [longSegs[longSegs.length - 1]],
      totalDurationSec: longSegs[longSegs.length - 1].durationSec,
    });
  }
  return result;
}
