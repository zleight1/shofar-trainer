import { CALIBRATION_SET, guidedStepsForSet } from './guided-steps';
import {
  SET_GROUPS,
  kolCountForSet,
  totalKolos,
  type SederSection,
  type SetGroup,
  type ShevarimTeruahBreath,
} from './seder';
import type { BlastType } from './types';

export interface OverviewKol {
  type: BlastType;
  /** Show a breath mark after this kol (later tashrat shevarim). */
  breathAfter: boolean;
}

export interface OverviewRound {
  sets: SetGroup[];
  kolos: number;
}

export interface OverviewBlock {
  id: string;
  section: SederSection;
  sets: SetGroup[];
  rounds: OverviewRound[];
  kolos: number;
  counted: boolean;
  stBreath: ShevarimTeruahBreath | null;
  closingGedolah: boolean;
}

export function overviewKolosForSet(set: SetGroup): OverviewKol[] {
  const out: OverviewKol[] = [];
  for (const step of guidedStepsForSet(set)) {
    if (step.type === 'shevarim_teruah') {
      out.push({ type: 'shevarim', breathAfter: false });
      out.push({ type: 'teruah', breathAfter: false });
      continue;
    }
    out.push({
      type: step.type,
      breathAfter: step.type === 'shevarim' && step.breath === 'between',
    });
  }
  return out;
}

export function roundsFromSets(sets: SetGroup[]): OverviewRound[] {
  const rounds: OverviewRound[] = [];
  for (let i = 0; i < sets.length; i += 3) {
    const slice = sets.slice(i, i + 3);
    rounds.push({
      sets: slice,
      kolos: slice.reduce((sum, set) => sum + kolCountForSet(set), 0),
    });
  }
  return rounds;
}

export function overviewBlocks(
  groups: SetGroup[] = SET_GROUPS,
  calibration: SetGroup = CALIBRATION_SET,
): OverviewBlock[] {
  return [
    blockFromSets('calibration', [calibration], false),
    ...groupConsecutiveSections(groups).map((sets) =>
      blockFromSets(sets[0].section, sets, true),
    ),
  ];
}

export function countedKolos(blocks: OverviewBlock[] = overviewBlocks()): number {
  return blocks.filter((b) => b.counted).reduce((sum, b) => sum + b.kolos, 0);
}

export function practiceKolos(): number {
  return totalKolos();
}

function groupConsecutiveSections(groups: SetGroup[]): SetGroup[][] {
  const out: SetGroup[][] = [];
  for (const set of groups) {
    const last = out[out.length - 1];
    if (last && last[0].section === set.section) {
      last.push(set);
    } else {
      out.push([set]);
    }
  }
  return out;
}

function blockFromSets(section: SederSection, sets: SetGroup[], counted: boolean): OverviewBlock {
  const tst = sets.find((s) => s.pattern === 'tst');
  return {
    id: section === 'calibration' ? 'calibration' : section,
    section,
    sets,
    rounds: roundsFromSets(sets),
    kolos: sets.reduce((sum, set) => sum + kolCountForSet(set), 0),
    counted,
    stBreath: tst?.stBreath ?? null,
    closingGedolah: sets.some((s) => Boolean(s.closingGedolah)),
  };
}
