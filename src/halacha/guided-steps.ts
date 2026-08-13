import type { SetGroup } from './seder';
import type { BlastType } from './types';

export interface GuidedBlastStep {
  id: string;
  type: BlastType;
}

export const CALIBRATION_SET: SetGroup = {
  id: 'calibration-tst',
  label: 'Calibration — Tashrat (Tekiah · Shevarim · Teruah · Tekiah)',
  stepIds: ['cal-t1', 'cal-sh', 'cal-tr', 'cal-t2'],
  pattern: 'tst',
};

export function guidedStepsForSet(set: SetGroup): GuidedBlastStep[] {
  switch (set.pattern) {
    case 'tst':
      return [
        { id: 't1', type: 'tekiah' },
        { id: 'sh', type: 'shevarim' },
        { id: 'tr', type: 'teruah' },
        { id: 't2', type: 'tekiah' },
      ];
    case 'tsh':
      return [
        { id: 't1', type: 'tekiah' },
        { id: 'sh', type: 'shevarim' },
        { id: 't2', type: 'tekiah' },
      ];
    case 'tt':
      return [
        { id: 't1', type: 'tekiah' },
        { id: 'tr', type: 'teruah' },
        { id: 't2', type: 'tekiah' },
      ];
    case 'gedolah':
      return [{ id: 'tg', type: 'tekiah_gedolah' }];
    default: {
      const _exhaustive: never = set.pattern;
      return _exhaustive;
    }
  }
}
