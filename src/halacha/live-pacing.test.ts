import { describe, expect, it } from 'vitest';
import { SET_GROUPS } from './seder';
import { autoAdvanceDelayMs, canGoToPreviousSet, reviewPacing } from './live-pacing';

function indexOf(id: string): number {
  const index = SET_GROUPS.findIndex((s) => s.id === id);
  expect(index).toBeGreaterThanOrEqual(0);
  return index;
}

describe('reviewPacing', () => {
  it('always waits when live session is off', () => {
    expect(
      reviewPacing({ liveSession: false, setIndex: indexOf('sit-1-tst'), passed: true }),
    ).toBe('wait');
    expect(
      reviewPacing({ liveSession: false, setIndex: SET_GROUPS.length - 1, passed: true }),
    ).toBe('wait');
  });

  it('auto-continues through the sitting 30 when the set passed', () => {
    expect(
      reviewPacing({ liveSession: true, setIndex: indexOf('sit-1-tst'), passed: true }),
    ).toBe('auto');
    expect(
      reviewPacing({ liveSession: true, setIndex: indexOf('sit-3-tsh'), passed: true }),
    ).toBe('auto');
  });

  it('waits after the last sitting set before musaf', () => {
    expect(
      reviewPacing({ liveSession: true, setIndex: indexOf('sit-3-tt'), passed: true }),
    ).toBe('wait');
  });

  it('waits between every musaf set, including section changes', () => {
    expect(
      reviewPacing({ liveSession: true, setIndex: indexOf('malchuyot-tst'), passed: true }),
    ).toBe('wait');
    expect(
      reviewPacing({ liveSession: true, setIndex: indexOf('malchuyot-tt'), passed: true }),
    ).toBe('wait');
    expect(
      reviewPacing({ liveSession: true, setIndex: indexOf('zichronot-tsh'), passed: true }),
    ).toBe('wait');
    expect(
      reviewPacing({ liveSession: true, setIndex: indexOf('shofarot-tt'), passed: true }),
    ).toBe('wait');
  });

  it('auto-continues through after musaf when the set passed', () => {
    expect(
      reviewPacing({ liveSession: true, setIndex: indexOf('after-1-tst'), passed: true }),
    ).toBe('auto');
    expect(
      reviewPacing({ liveSession: true, setIndex: indexOf('after-4-tsh'), passed: true }),
    ).toBe('auto');
  });

  it('auto-finishes after the last set when it passed', () => {
    expect(
      reviewPacing({ liveSession: true, setIndex: indexOf('after-4-tt'), passed: true }),
    ).toBe('auto');
  });

  it('waits on a failed set so it can be repeated', () => {
    expect(
      reviewPacing({ liveSession: true, setIndex: indexOf('sit-1-tst'), passed: false }),
    ).toBe('wait');
    expect(
      reviewPacing({ liveSession: true, setIndex: indexOf('after-2-tt'), passed: false }),
    ).toBe('wait');
    expect(
      reviewPacing({ liveSession: true, setIndex: SET_GROUPS.length - 1, passed: false }),
    ).toBe('wait');
  });
});

describe('canGoToPreviousSet', () => {
  it('is only available after the first seder set', () => {
    expect(canGoToPreviousSet(0)).toBe(false);
    expect(canGoToPreviousSet(1)).toBe(true);
  });
});

describe('autoAdvanceDelayMs', () => {
  it('shortens the glance delay when motion is reduced', () => {
    expect(autoAdvanceDelayMs(false)).toBe(1600);
    expect(autoAdvanceDelayMs(true)).toBe(400);
  });
});
