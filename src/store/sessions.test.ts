import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  formatSessionSummary,
  loadSessions,
  saveSession,
  clearSessions,
  setUnitDuration,
  getUnitDuration,
} from './sessions';
import type { PracticeSession } from '../halacha/types';

const storage: Record<string, string> = {};

beforeEach(() => {
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => storage[k] ?? null,
    setItem: (k: string, v: string) => {
      storage[k] = v;
    },
    removeItem: (k: string) => {
      delete storage[k];
    },
  });
  clearSessions();
});

describe('sessions store', () => {
  it('roundtrips session save/load', () => {
    const session: PracticeSession = {
      id: '1',
      timestamp: '2026-08-06T12:00:00Z',
      stepId: 'tsh-set-1',
      passed: true,
      tekiahRatio: 1.02,
      issues: [],
      unitDurationSec: 0.1,
    };
    saveSession(session);
    const loaded = loadSessions();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].stepId).toBe('tsh-set-1');
  });

  it('formats summary string', () => {
    const s: PracticeSession = {
      id: '1',
      timestamp: '2026-08-06T12:00:00Z',
      stepId: 'tt-set-1',
      passed: false,
      tekiahRatio: 0.8,
      issues: [],
      unitDurationSec: 0.1,
    };
    expect(formatSessionSummary(s)).toContain('FAIL');
    expect(formatSessionSummary(s)).toContain('80%');
  });

  it('stores unit duration', () => {
    setUnitDuration(0.12);
    expect(getUnitDuration()).toBeCloseTo(0.12);
  });
});
