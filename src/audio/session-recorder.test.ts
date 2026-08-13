import { describe, expect, it } from 'vitest';
import { SessionRecorder } from './session-recorder';

describe('SessionRecorder playback mute', () => {
  it('mute and unmute do not throw before the mic is open', () => {
    const session = new SessionRecorder();
    expect(() => session.muteForPlayback()).not.toThrow();
    expect(() => session.unmuteAfterPlayback()).not.toThrow();
  });
});
