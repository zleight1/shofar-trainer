import { describe, expect, it } from 'vitest';
import { expectedTiming, liveTimingState } from './live-timing';

describe('liveTimingState', () => {
  const unit = 0.1;

  it('shows building for short tekiah', () => {
    const s = liveTimingState('tekiah', 0.3, { unitSec: unit }, 'sounding');
    expect(s.status).toBe('building');
  });

  it('shows good in range for teruah', () => {
    const { idealSec } = expectedTiming('teruah', unit, { unitSec: unit });
    const s = liveTimingState('teruah', idealSec, { unitSec: unit }, 'sounding');
    expect(s.status).toBe('good');
  });

  it('uses middle duration for closing tekiah', () => {
    const s = liveTimingState(
      'tekiah',
      0.9,
      { unitSec: unit, middleDurationSec: 0.9, isClosingTekiah: true },
      'sounding',
    );
    expect(s.status).toBe('good');
  });
});
