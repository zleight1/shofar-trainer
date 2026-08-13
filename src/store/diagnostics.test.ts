import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  clearRoomProfile,
  getRoomProfile,
  isDiagnosticsEnabled,
  rememberEchoFromDiagnosis,
  setDiagnosticsEnabled,
  setRoomProfile,
} from './diagnostics';

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

describe('diagnostics store', () => {
  it('toggles the diagnostics flag', () => {
    expect(isDiagnosticsEnabled()).toBe(false);
    setDiagnosticsEnabled(true);
    expect(isDiagnosticsEnabled()).toBe(true);
    setDiagnosticsEnabled(false);
    expect(isDiagnosticsEnabled()).toBe(false);
  });

  it('remembers an echo lag after two dropped taps', () => {
    setDiagnosticsEnabled(true);
    rememberEchoFromDiagnosis({
      rawPeakCount: 11,
      keptCount: 9,
      droppedEchoCount: 2,
      echoLagSec: 0.2,
      onsetSec: [],
    });
    expect(getRoomProfile()?.echoLagSec).toBeCloseTo(0.2);
  });

  it('does not save a lag from a single drop', () => {
    setDiagnosticsEnabled(true);
    rememberEchoFromDiagnosis({
      rawPeakCount: 10,
      keptCount: 9,
      droppedEchoCount: 1,
      echoLagSec: 0.2,
      onsetSec: [],
    });
    expect(getRoomProfile()).toBeNull();
  });

  it('clears a saved room profile', () => {
    setRoomProfile({ echoLagSec: 0.18, updatedAt: '2026-08-13T00:00:00Z' });
    clearRoomProfile();
    expect(getRoomProfile()).toBeNull();
  });
});
