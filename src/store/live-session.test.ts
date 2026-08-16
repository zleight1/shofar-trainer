import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  LIVE_SESSION_STORAGE_KEY,
  isLiveSessionEnabled,
  setLiveSessionEnabled,
} from './live-session';

const storage: Record<string, string> = {};

beforeEach(() => {
  for (const key of Object.keys(storage)) delete storage[key];
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => storage[k] ?? null,
    setItem: (k: string, v: string) => {
      storage[k] = v;
    },
    removeItem: (k: string) => {
      delete storage[k];
    },
  });
});

describe('live session preference', () => {
  it('defaults to on when unset', () => {
    expect(isLiveSessionEnabled()).toBe(true);
  });

  it('persists off and on', () => {
    setLiveSessionEnabled(false);
    expect(storage[LIVE_SESSION_STORAGE_KEY]).toBe('0');
    expect(isLiveSessionEnabled()).toBe(false);
    setLiveSessionEnabled(true);
    expect(storage[LIVE_SESSION_STORAGE_KEY]).toBe('1');
    expect(isLiveSessionEnabled()).toBe(true);
  });
});
