import type { SetGroup, ShevarimTeruahBreath } from './seder';
import type { BlastType } from './types';

export interface GuidedBlastStep {
  id: string;
  type: BlastType;
  /** Makrei phrase. Independent of whether a breath is taken. */
  callout: BlastType;
  breath: ShevarimTeruahBreath | null;
  /** After a two-breath shevarim take, record teruah with no second voice. */
  skipVoice: boolean;
}

export const CALIBRATION_SET: SetGroup = {
  id: 'calibration-tst',
  label: 'Calibration — Tashrat (Tekiah · Shevarim-Teruah · Tekiah)',
  stepIds: ['cal-t1', 'cal-st', 'cal-t2'],
  pattern: 'tst',
  section: 'calibration',
  stBreath: 'none',
};

export function guidedStepsForSet(set: SetGroup): GuidedBlastStep[] {
  switch (set.pattern) {
    case 'tst':
      return set.stBreath === 'between' ? tashratTwoBreath() : tashratOneBreath();
    case 'tsh':
      return [
        step('t1', 'tekiah'),
        step('sh', 'shevarim'),
        step('t2', 'tekiah'),
      ];
    case 'tt':
      return [
        step('t1', 'tekiah'),
        step('tr', 'teruah'),
        set.closingGedolah
          ? step('t2', 'tekiah_gedolah', { callout: 'tekiah_gedolah' })
          : step('t2', 'tekiah'),
      ];
    case 'gedolah':
      return [step('tg', 'tekiah_gedolah')];
    default: {
      const _exhaustive: never = set.pattern;
      return _exhaustive;
    }
  }
}

function tashratOneBreath(): GuidedBlastStep[] {
  return [
    step('t1', 'tekiah'),
    step('st', 'shevarim_teruah', {
      callout: 'shevarim_teruah',
      breath: 'none',
    }),
    step('t2', 'tekiah'),
  ];
}

function tashratTwoBreath(): GuidedBlastStep[] {
  return [
    step('t1', 'tekiah'),
    step('sh', 'shevarim', {
      callout: 'shevarim_teruah',
      breath: 'between',
    }),
    step('tr', 'teruah', {
      callout: 'shevarim_teruah',
      breath: 'between',
      skipVoice: true,
    }),
    step('t2', 'tekiah'),
  ];
}

function step(
  id: string,
  type: BlastType,
  extra: Partial<Pick<GuidedBlastStep, 'callout' | 'breath' | 'skipVoice'>> = {},
): GuidedBlastStep {
  return {
    id,
    type,
    callout: extra.callout ?? type,
    breath: extra.breath ?? null,
    skipVoice: extra.skipVoice ?? false,
  };
}
