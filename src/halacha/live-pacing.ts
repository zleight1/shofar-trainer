import { SET_GROUPS, type SederSection, type SetGroup } from './seder';

export type ReviewPacing = 'auto' | 'wait';

const CONTINUOUS_SECTIONS: ReadonlySet<SederSection> = new Set(['sitting', 'afterMusaf']);

/**
 * After a set review, whether a live session should continue on its own.
 *
 * Sitting 30 and the closing after-musaf 40 run through like a live tekiot
 * block. Musaf (the amidah repetition) waits between each set. A failed set
 * always waits so the baal tokea can redo it.
 */
export function reviewPacing(args: {
  liveSession: boolean;
  setIndex: number;
  passed: boolean;
  groups?: readonly SetGroup[];
}): ReviewPacing {
  const groups = args.groups ?? SET_GROUPS;
  if (!args.liveSession) return 'wait';
  if (!args.passed) return 'wait';
  if (args.setIndex >= groups.length - 1) return 'auto';

  const current = groups[args.setIndex];
  const next = groups[args.setIndex + 1];
  if (!current || !next) return 'wait';
  if (CONTINUOUS_SECTIONS.has(current.section) && current.section === next.section) {
    return 'auto';
  }
  return 'wait';
}

export function canGoToPreviousSet(setIndex: number): boolean {
  return setIndex > 0;
}

export function autoAdvanceDelayMs(reduceMotion = false): number {
  return reduceMotion ? 400 : 1600;
}
