import type { SederStep, SetPattern } from './types';

/** Legacy step list. Guided practice uses SET_GROUPS (100 kolos). */
export const PRACTICE_SEDER: SederStep[] = [
  // Tekiah–Shevarim–Teruah–Tekiah ×3
  ...Array.from({ length: 3 }, (_, i) => [
    {
      id: `tst-${i + 1}-t1`,
      label: 'Tekiah',
      expectedTypes: ['tekiah'] as const,
      groupLabel: `T–Sh–Tr–T ${i + 1}/3`,
    },
    {
      id: `tst-${i + 1}-sh`,
      label: 'Shevarim',
      expectedTypes: ['shevarim'] as const,
      groupLabel: `T–Sh–Tr–T ${i + 1}/3`,
    },
    {
      id: `tst-${i + 1}-tr`,
      label: 'Teruah',
      expectedTypes: ['teruah'] as const,
      groupLabel: `T–Sh–Tr–T ${i + 1}/3`,
    },
    {
      id: `tst-${i + 1}-t2`,
      label: 'Tekiah',
      expectedTypes: ['tekiah'] as const,
      groupLabel: `T–Sh–Tr–T ${i + 1}/3`,
    },
  ]).flat(),
  // Tekiah–Shevarim–Tekiah ×3
  ...Array.from({ length: 3 }, (_, i) => [
    {
      id: `tsh-${i + 1}-t1`,
      label: 'Tekiah',
      expectedTypes: ['tekiah'] as const,
      groupLabel: `T–Sh–T (short) ${i + 1}/3`,
    },
    {
      id: `tsh-${i + 1}-sh`,
      label: 'Shevarim',
      expectedTypes: ['shevarim'] as const,
      groupLabel: `T–Sh–T (short) ${i + 1}/3`,
    },
    {
      id: `tsh-${i + 1}-t2`,
      label: 'Tekiah',
      expectedTypes: ['tekiah'] as const,
      groupLabel: `T–Sh–T (short) ${i + 1}/3`,
    },
  ]).flat(),
  // Tekiah–Teruah–Tekiah ×3
  ...Array.from({ length: 3 }, (_, i) => [
    {
      id: `tt-${i + 1}-t1`,
      label: 'Tekiah',
      expectedTypes: ['tekiah'] as const,
      groupLabel: `T–T ${i + 1}/3`,
    },
    {
      id: `tt-${i + 1}-tr`,
      label: 'Teruah',
      expectedTypes: ['teruah'] as const,
      groupLabel: `T–T ${i + 1}/3`,
    },
    {
      id: `tt-${i + 1}-t2`,
      label: 'Tekiah',
      expectedTypes: ['tekiah'] as const,
      groupLabel: `T–T ${i + 1}/3`,
    },
  ]).flat(),
  {
    id: 'gedolah',
    label: 'Tekiah Gedolah',
    expectedTypes: ['tekiah_gedolah'],
    groupLabel: 'Final',
  },
];

export function getStepById(id: string): SederStep | undefined {
  return PRACTICE_SEDER.find((s) => s.id === id);
}

export function getSetStepsForGroup(groupLabel: string): SederStep[] {
  return PRACTICE_SEDER.filter((s) => s.groupLabel === groupLabel);
}

export type ShevarimTeruahBreath = 'none' | 'between';

export type SederSection =
  | 'calibration'
  | 'sitting'
  | 'malchuyot'
  | 'zichronot'
  | 'shofarot'
  | 'afterMusaf';

export interface SetGroup {
  id: string;
  label: string;
  stepIds: string[];
  pattern: SetPattern;
  section: SederSection;
  /** Sitting first-30: one breath. Later tashrat: breathe between. */
  stBreath?: ShevarimTeruahBreath;
  /** Last tekiah of this set is tekiah gedolah. */
  closingGedolah?: boolean;
}

function roundOfTen(
  idPrefix: string,
  section: SederSection,
  stBreath: ShevarimTeruahBreath,
  opts: { lastGedolah?: boolean } = {},
): SetGroup[] {
  return [
    {
      id: `${idPrefix}-tst`,
      label: `${idPrefix} tashrat`,
      stepIds: [`${idPrefix}-tst-t1`, `${idPrefix}-tst-st`, `${idPrefix}-tst-t2`],
      pattern: 'tst',
      section,
      stBreath,
    },
    {
      id: `${idPrefix}-tsh`,
      label: `${idPrefix} tashat`,
      stepIds: [`${idPrefix}-tsh-t1`, `${idPrefix}-tsh-sh`, `${idPrefix}-tsh-t2`],
      pattern: 'tsh',
      section,
    },
    {
      id: `${idPrefix}-tt`,
      label: `${idPrefix} tarat`,
      stepIds: [`${idPrefix}-tt-t1`, `${idPrefix}-tt-tr`, `${idPrefix}-tt-t2`],
      pattern: 'tt',
      section,
      closingGedolah: opts.lastGedolah,
    },
  ];
}

/** 100 kolos: sitting 30 + musaf 30 + after musaf 40. */
export const SET_GROUPS: SetGroup[] = [
  ...roundOfTen('sit-1', 'sitting', 'none'),
  ...roundOfTen('sit-2', 'sitting', 'none'),
  ...roundOfTen('sit-3', 'sitting', 'none'),
  ...roundOfTen('malchuyot', 'malchuyot', 'between'),
  ...roundOfTen('zichronot', 'zichronot', 'between'),
  ...roundOfTen('shofarot', 'shofarot', 'between', { lastGedolah: true }),
  ...roundOfTen('after-1', 'afterMusaf', 'between'),
  ...roundOfTen('after-2', 'afterMusaf', 'between'),
  ...roundOfTen('after-3', 'afterMusaf', 'between'),
  ...roundOfTen('after-4', 'afterMusaf', 'between', { lastGedolah: true }),
];

export function kolCountForSet(set: SetGroup): number {
  switch (set.pattern) {
    case 'tst':
      return 4;
    case 'tsh':
    case 'tt':
      return 3;
    case 'gedolah':
      return 1;
    default: {
      const _exhaustive: never = set.pattern;
      return _exhaustive;
    }
  }
}

export function totalKolos(groups: SetGroup[] = SET_GROUPS): number {
  return groups.reduce((sum, set) => sum + kolCountForSet(set), 0);
}

export function kolosBeforeIndex(index: number, groups: SetGroup[] = SET_GROUPS): number {
  return groups.slice(0, index).reduce((sum, set) => sum + kolCountForSet(set), 0);
}

export function indexInSectionPattern(
  set: SetGroup,
  groups: SetGroup[] = SET_GROUPS,
): { n: number; of: number } {
  const list = groups.filter((s) => s.section === set.section && s.pattern === set.pattern);
  return { n: list.findIndex((s) => s.id === set.id) + 1, of: list.length };
}

export function calloutForStep(step: SederStep): string {
  return step.label;
}
