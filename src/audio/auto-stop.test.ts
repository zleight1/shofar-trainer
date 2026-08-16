import { describe, expect, it } from 'vitest';
import {
  advanceAutoStop,
  autoStopOptionsForBlast,
  createAutoStopState,
  soundingExclusiveSec,
  type AutoStopAdvance,
  type AutoStopOptions,
  type AutoStopState,
} from './auto-stop';

function resolved(partial: AutoStopOptions = {}): AutoStopOptions {
  return partial;
}

function drive(
  peaks: Array<{ at: number; peak: number }>,
  options: AutoStopOptions,
): AutoStopAdvance {
  let state: AutoStopState = createAutoStopState();
  let last: AutoStopAdvance | undefined;
  for (const sample of peaks) {
    last = advanceAutoStop(state, sample.at, 0, sample.peak, resolved(options));
    state = last.state;
    if (last.done) return last;
  }
  if (!last) throw new Error('drive requires at least one sample');
  return last;
}

const TEKIAH_HOLD: AutoStopOptions = {
  minSoundMs: 250,
  soundOnThreshold: 0.05,
  soundOffThreshold: 0.02,
  silenceMs: 1100,
  earlySilenceMs: 1800,
  holdMinSec: 2.16,
  maxDurationSec: 15,
};

describe('soundingExclusiveSec', () => {
  it('is 0 before any sound', () => {
    expect(soundingExclusiveSec(1000, null, null)).toBe(0);
  });

  it('excludes trailing silence from sounding time', () => {
    expect(soundingExclusiveSec(1600, 1000, 1400)).toBeCloseTo(0.4);
  });

  it('uses now when still sounding', () => {
    expect(soundingExclusiveSec(1300, 1000, null)).toBeCloseTo(0.3);
  });
});

describe('advanceAutoStop', () => {
  it('does not start a tekiah on a 100 ms peak then silence', () => {
    const result = drive(
      [
        { at: 0, peak: 0.2 },
        { at: 100, peak: 0.2 },
        { at: 101, peak: 0.001 },
        { at: 800, peak: 0.001 },
      ],
      TEKIAH_HOLD,
    );
    expect(result.done).toBeNull();
    expect(result.phase).toBe('waiting_for_sound');
    expect(result.state.soundStartedAt).toBeNull();
  });

  it('does not enter trailing silence on a dip that stays above the off threshold', () => {
    const result = drive(
      [
        { at: 0, peak: 0.08 },
        { at: 250, peak: 0.08 },
        { at: 400, peak: 0.03 },
      ],
      TEKIAH_HOLD,
    );
    expect(result.phase).toBe('sounding');
    expect(result.state.silenceStartedAt).toBeNull();
    expect(result.done).toBeNull();
  });

  it('does not end a short struggling tekiah after 700 ms of silence', () => {
    const result = drive(
      [
        { at: 0, peak: 0.2 },
        { at: 250, peak: 0.2 },
        { at: 400, peak: 0.2 },
        { at: 401, peak: 0.001 },
        { at: 1101, peak: 0.001 },
      ],
      TEKIAH_HOLD,
    );
    expect(result.done).toBeNull();
    expect(result.phase).toBe('trailing_silence');
    expect(result.soundingSec).toBeCloseTo(0.4, 2);
  });

  it('ends a short tekiah after the early hold-off silence', () => {
    const result = drive(
      [
        { at: 0, peak: 0.2 },
        { at: 250, peak: 0.2 },
        { at: 400, peak: 0.2 },
        { at: 401, peak: 0.001 },
        { at: 2201, peak: 0.001 },
      ],
      TEKIAH_HOLD,
    );
    expect(result.done).toBe('silence');
  });

  it('ends a floor-length tekiah after the post-floor silence window', () => {
    const result = drive(
      [
        { at: 0, peak: 0.2 },
        { at: 250, peak: 0.2 },
        { at: 2160, peak: 0.2 },
        { at: 2161, peak: 0.001 },
        { at: 3261, peak: 0.001 },
      ],
      TEKIAH_HOLD,
    );
    expect(result.done).toBe('silence');
    expect(result.soundingSec).toBeGreaterThanOrEqual(2.16);
  });

  it('resolves max_duration even while still above threshold', () => {
    const result = drive(
      [
        { at: 0, peak: 0.2 },
        { at: 250, peak: 0.2 },
        { at: 15_000, peak: 0.2 },
      ],
      TEKIAH_HOLD,
    );
    expect(result.done).toBe('max_duration');
  });

  it('still ends a teruah-shaped burst after 450 ms of silence', () => {
    const result = drive(
      [
        { at: 0, peak: 0.2 },
        { at: 80, peak: 0.2 },
        { at: 200, peak: 0.2 },
        { at: 201, peak: 0.001 },
        { at: 651, peak: 0.001 },
      ],
      { silenceMs: 450, minSoundMs: 80, maxDurationSec: 10 },
    );
    expect(result.done).toBe('silence');
  });
});

describe('autoStopOptionsForBlast', () => {
  const band = { minSec: 2.16, safetyAutoStopSec: 15 };

  it('applies tekiah hold-off from the duration band', () => {
    const opts = autoStopOptionsForBlast('tekiah', band, 600);
    expect(opts.earlySilenceMs).toBe(1800);
    expect(opts.holdMinSec).toBe(2.16);
    expect(opts.minSoundMs).toBe(250);
    expect(opts.silenceMs).toBe(1100);
    expect(opts.maxDurationSec).toBe(15);
  });

  it('does not apply hold-off to teruah', () => {
    const opts = autoStopOptionsForBlast('teruah', band, 450);
    expect(opts.earlySilenceMs).toBeUndefined();
    expect(opts.holdMinSec).toBeUndefined();
    expect(opts.silenceMs).toBe(450);
    expect(opts.minSoundMs).toBeUndefined();
  });
});
