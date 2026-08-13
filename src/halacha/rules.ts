import type {
  AnalysisResult,
  BlastSegment,
  ClassifiedBlast,
  HalachaConfig,
  ScoreIssue,
  SetPattern,
} from './types';
import { DEFAULT_HALACHA_CONFIG } from './types';
import { inferPattern, tekiahMinimumSec, unitsFor } from './units';

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

export function checkPerTekiah(
  classified: ClassifiedBlast[],
  unitSec: number,
  pattern: SetPattern,
  config: HalachaConfig = DEFAULT_HALACHA_CONFIG,
): ScoreIssue[] {
  if (pattern === 'gedolah') return [];
  const tekiahs = classified.filter((b) => b.type === 'tekiah');
  const middle = middleDuration(classified);
  const minSec = tekiahMinimumSec(pattern, unitSec, middle, config);
  const issues: ScoreIssue[] = [];

  tekiahs.forEach((blast, index) => {
    if (blast.totalDurationSec >= minSec) return;
    const code = index === 0 ? 'opening_tekiah_too_short' : 'closing_tekiah_too_short';
    issues.push({
      severity: 'error',
      code,
      params: {
        duration: blast.totalDurationSec,
        min: minSec,
        units: unitsFor(pattern, 'tekiah'),
      },
    });
  });
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
  const capSec = config.sheverCapUnits * unitSec;

  if (count > config.shevarimNoteCount) {
    issues.push({
      severity: 'warn',
      code: 'shevarim_extra',
      params: { detected: count, expected: config.shevarimNoteCount },
    });
  } else if (count !== config.shevarimNoteCount) {
    const totalOk = blast.totalDurationSec >= minTotal;
    issues.push({
      severity: totalOk ? 'warn' : 'error',
      code: totalOk ? 'shevarim_count_ok_length' : 'shevarim_count',
      params: {
        expected: config.shevarimNoteCount,
        detected: count,
        sec: blast.totalDurationSec,
      },
    });
  }

  const minDur = config.minShevarimNoteUnits * unitSec;
  for (let i = 0; i < blast.segments.length; i++) {
    const note = blast.segments[i];
    if (note.durationSec >= capSec) {
      issues.push({
        severity: 'error',
        code: 'shever_too_long',
        params: { duration: note.durationSec, cap: capSec, n: i + 1 },
      });
    } else if (note.durationSec < minDur && note.durationSec < blast.totalDurationSec * 0.4) {
      issues.push({
        severity: 'warn',
        code: 'shevarim_note_short',
        params: { n: i + 1, sec: note.durationSec },
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
    issues.push({
      severity: 'error',
      code: 'teruah_count',
      params: { expected: config.minTeruahBlasts, detected: count },
    });
  }
  return issues;
}

export function checkStandaloneTekiah(
  blast: ClassifiedBlast,
  unitSec: number,
  pattern: SetPattern,
  config: HalachaConfig = DEFAULT_HALACHA_CONFIG,
): ScoreIssue[] {
  if (blast.type === 'tekiah_gedolah') return [];
  const minSec = tekiahMinimumSec(pattern, unitSec, 0, config);
  if (blast.totalDurationSec < minSec) {
    return [
      {
        severity: 'error',
        code: 'tekiah_min_length',
        params: { duration: blast.totalDurationSec, min: minSec },
      },
    ];
  }
  return [];
}

export function scoreRecording(
  classified: ClassifiedBlast[],
  unitSec: number,
  pattern: SetPattern = inferPattern(classified.map((b) => b.type)),
  config: HalachaConfig = DEFAULT_HALACHA_CONFIG,
): AnalysisResult {
  const issues: ScoreIssue[] = [];

  issues.push(...checkPerTekiah(classified, unitSec, pattern, config));

  for (const blast of classified) {
    switch (blast.type) {
      case 'shevarim':
        issues.push(...checkShevarim(blast, unitSec, config));
        break;
      case 'teruah':
        issues.push(...checkTeruah(blast, config));
        break;
      case 'tekiah':
        if (classified.length === 1) {
          issues.push(...checkStandaloneTekiah(blast, unitSec, pattern, config));
        }
        break;
      case 'tekiah_gedolah':
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
  pattern: SetPattern,
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
  pattern: SetPattern,
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
