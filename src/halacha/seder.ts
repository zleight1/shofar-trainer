import type { SederStep, SetPattern } from './types';

/** Rosh Hashana practice seder — 30 blast sets plus gedolah */
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

/** Steps that form a complete analyzable set (e.g. T-Sh-T as one recording) */
export interface SetGroup {
  id: string;
  label: string;
  stepIds: string[];
  pattern: SetPattern;
}

export const SET_GROUPS: SetGroup[] = [
  ...Array.from({ length: 3 }, (_, i) => ({
    id: `tst-set-${i + 1}`,
    label: `Tekiah–Shevarim–Teruah–Tekiah ${i + 1}`,
    stepIds: [`tst-${i + 1}-t1`, `tst-${i + 1}-sh`, `tst-${i + 1}-tr`, `tst-${i + 1}-t2`],
    pattern: 'tst' as const,
  })),
  ...Array.from({ length: 3 }, (_, i) => ({
    id: `tsh-set-${i + 1}`,
    label: `Tekiah–Shevarim–Tekiah ${i + 1}`,
    stepIds: [`tsh-${i + 1}-t1`, `tsh-${i + 1}-sh`, `tsh-${i + 1}-t2`],
    pattern: 'tsh' as const,
  })),
  ...Array.from({ length: 3 }, (_, i) => ({
    id: `tt-set-${i + 1}`,
    label: `Tekiah–Teruah–Tekiah ${i + 1}`,
    stepIds: [`tt-${i + 1}-t1`, `tt-${i + 1}-tr`, `tt-${i + 1}-t2`],
    pattern: 'tt' as const,
  })),
  {
    id: 'gedolah-set',
    label: 'Tekiah Gedolah',
    stepIds: ['gedolah'],
    pattern: 'gedolah',
  },
];

export function calloutForStep(step: SederStep): string {
  return step.label;
}
