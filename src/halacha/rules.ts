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
  if (count !== config.shevarimNoteCount) {
    issues.push({
      severity: 'error',
      code: 'shevarim_count',
      message: `Expected ${config.shevarimNoteCount} shevarim notes, detected ${count}`,
    });
  }
  const minDur = config.minShevarimNoteUnits * unitSec;
  for (let i = 0; i < blast.segments.length; i++) {
    if (blast.segments[i].durationSec < minDur) {
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
    issues.push({
      severity: 'error',
      code: 'teruah_count',
      message: `Expected at least ${config.minTeruahBlasts} teruah blasts, detected ${count}`,
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
