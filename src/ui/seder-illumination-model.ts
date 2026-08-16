import { expectedDurationForType } from '../halacha/duration-targets';
import { partitionShevarimTeruah } from '../halacha/rules';
import type { SederSection, SetGroup } from '../halacha/seder';
import type { BlastType, ClassifiedBlast, ScoreIssue, SetPattern } from '../halacha/types';
import { expectedNoteCount, issuesForBlast, type TimelineStatus } from './set-timeline';

export type PracticeSection = Exclude<SederSection, 'calibration'>;

export interface SetTake {
  set: SetGroup;
  blasts: ClassifiedBlast[];
  issues: ScoreIssue[];
  passed: boolean;
  unitSec: number;
}

export interface SessionKol {
  index: number;
  setId: string;
  section: PracticeSection;
  pattern: SetPattern;
  type: BlastType;
  durationSec: number;
  noteCount: number;
  expectedNotes: number | null;
  status: TimelineStatus;
  setPassed: boolean;
  fill: number;
}

export function isPracticeSection(section: SederSection): section is PracticeSection {
  switch (section) {
    case 'sitting':
    case 'malchuyot':
    case 'zichronot':
    case 'shofarot':
    case 'afterMusaf':
      return true;
    case 'calibration':
      return false;
    default: {
      const _exhaustive: never = section;
      return _exhaustive;
    }
  }
}

export function expandClassified(
  blasts: ClassifiedBlast[],
  unitSec: number,
): ClassifiedBlast[] {
  const out: ClassifiedBlast[] = [];
  for (const blast of blasts) {
    if (blast.type !== 'shevarim_teruah') {
      out.push(blast);
      continue;
    }
    out.push(...splitShevarimTeruah(blast, unitSec));
  }
  return out;
}

export function kolosFromSet(take: SetTake, startIndex: number): SessionKol[] {
  if (!isPracticeSection(take.set.section)) return [];
  const section = take.set.section;
  const expanded = expandClassified(take.blasts, take.unitSec);
  const middleSec = expanded
    .filter((b) => b.type === 'shevarim' || b.type === 'teruah' || b.type === 'shevarim_teruah')
    .reduce((sum, b) => sum + b.totalDurationSec, 0);

  return expanded.map((blast, i) => {
    const related = issuesForBlast(blast, i, expanded, take.issues);
    const closing = isClosingTekiah(blast.type, i, expanded.length);
    const band = expectedDurationForType(
      blast.type,
      take.unitSec,
      take.set.pattern,
      middleSec,
      closing,
    );
    const durationSec = Math.max(0, blast.totalDurationSec);
    const fill = band.minSec > 0 ? durationSec / band.minSec : 1;
    return {
      index: startIndex + i,
      setId: take.set.id,
      section,
      pattern: take.set.pattern,
      type: blast.type,
      durationSec,
      noteCount: blast.segments.length,
      expectedNotes: expectedNoteCount(blast.type),
      status: statusFromIssues(related),
      setPassed: take.passed,
      fill,
    };
  });
}

export function buildSessionKols(takes: SetTake[]): SessionKol[] {
  const kols: SessionKol[] = [];
  for (const take of takes) {
    kols.push(...kolosFromSet(take, kols.length));
  }
  return kols;
}

export function passedSetCount(takes: SetTake[]): { passed: number; total: number } {
  const practice = takes.filter((t) => isPracticeSection(t.set.section));
  return {
    passed: practice.filter((t) => t.passed).length,
    total: practice.length,
  };
}

function splitShevarimTeruah(blast: ClassifiedBlast, unitSec: number): ClassifiedBlast[] {
  const parts = partitionShevarimTeruah(blast.segments, unitSec);
  let shevarim = parts.shevarim;
  let teruah = parts.teruah;
  if (shevarim.length === 0 && teruah.length === 0) {
    if (blast.segments.length >= 4) {
      shevarim = blast.segments.slice(0, 3);
      teruah = blast.segments.slice(3);
    } else if (blast.totalDurationSec > 0) {
      shevarim = [seg(blast.totalDurationSec * 0.35)];
      teruah = [seg(blast.totalDurationSec * 0.65)];
    }
  }
  return [
    {
      type: 'shevarim',
      segments: shevarim,
      totalDurationSec: sumDur(shevarim),
    },
    {
      type: 'teruah',
      segments: teruah,
      totalDurationSec: sumDur(teruah),
    },
  ];
}

function seg(durationSec: number): ClassifiedBlast['segments'][number] {
  return { startSample: 0, endSample: Math.max(1, Math.round(durationSec * 44100)), durationSec };
}

function sumDur(segments: ClassifiedBlast['segments']): number {
  return segments.reduce((sum, s) => sum + s.durationSec, 0);
}

function isClosingTekiah(type: BlastType, index: number, length: number): boolean {
  return (type === 'tekiah' || type === 'tekiah_gedolah') && length > 1 && index === length - 1;
}

function statusFromIssues(related: ScoreIssue[]): TimelineStatus {
  if (related.some((i) => i.severity === 'error')) return 'error';
  if (related.some((i) => i.severity === 'warn')) return 'warn';
  return 'ok';
}
