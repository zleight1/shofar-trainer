import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ILLUMINATIONS_STORAGE_KEY } from '../halacha/types';
import { SET_GROUPS, totalKolos } from '../halacha/seder';
import { guidedStepsForSet } from '../halacha/guided-steps';
import type { BlastType, ClassifiedBlast } from '../halacha/types';
import {
  illuminationRecordFromTakes,
  type SetTake,
} from '../ui/seder-illumination-model';
import {
  MAX_STORED_ILLUMINATIONS,
  formatIlluminationSummary,
  getIllumination,
  loadIlluminations,
  parseIllumination,
  saveIllumination,
  type StoredIllumination,
} from './illuminations';
import { clearSessions } from './sessions';

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
  for (const key of Object.keys(storage)) delete storage[key];
});

function blast(type: BlastType, durations: number[]): ClassifiedBlast {
  const segments = durations.map((durationSec, i) => ({
    startSample: i * 1000,
    endSample: i * 1000 + 400,
    durationSec,
  }));
  return {
    type,
    segments,
    totalDurationSec: durations.reduce((sum, d) => sum + d, 0),
  };
}

function passingBlasts(type: BlastType): ClassifiedBlast {
  switch (type) {
    case 'tekiah':
      return blast('tekiah', [2.2]);
    case 'tekiah_gedolah':
      return blast('tekiah_gedolah', [4.2]);
    case 'shevarim':
      return blast('shevarim', [0.32, 0.3, 0.31]);
    case 'teruah':
      return blast('teruah', Array.from({ length: 9 }, () => 0.09));
    case 'shevarim_teruah':
      return blast('shevarim_teruah', [
        0.32, 0.3, 0.31,
        ...Array.from({ length: 9 }, () => 0.09),
      ]);
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

function takeFor(set: SetTake['set']): SetTake {
  return {
    set,
    blasts: guidedStepsForSet(set).map((step) => passingBlasts(step.type)),
    issues: [],
    passed: true,
    unitSec: 0.1,
  };
}

function sampleRecord(id = 'illum-1'): StoredIllumination {
  const built = illuminationRecordFromTakes(SET_GROUPS.map((set) => takeFor(set)));
  return {
    id,
    timestamp: '2026-08-16T12:00:00Z',
    unitDurationSec: 0.1,
    ...built,
  };
}

describe('illumination storage', () => {
  it('roundtrips a completed seder artwork', () => {
    const record = sampleRecord();
    expect(record.kols).toHaveLength(totalKolos());
    saveIllumination(record);
    const loaded = loadIlluminations();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('illum-1');
    expect(loaded[0].kols).toHaveLength(100);
    expect(loaded[0].kols[0].type).toBe('tekiah');
    expect(getIllumination('illum-1')?.passed).toBe(record.passed);
  });

  it('keeps the newest illuminations first and caps the list', () => {
    const base = sampleRecord('base');
    for (let i = 0; i < MAX_STORED_ILLUMINATIONS + 3; i++) {
      saveIllumination({ ...base, id: `illum-${i}` });
    }
    const loaded = loadIlluminations();
    expect(loaded).toHaveLength(MAX_STORED_ILLUMINATIONS);
    expect(loaded[0].id).toBe(`illum-${MAX_STORED_ILLUMINATIONS + 2}`);
    expect(loaded.at(-1)?.id).toBe('illum-3');
  });

  it('does not store an empty artwork', () => {
    saveIllumination({
      id: 'empty',
      timestamp: '2026-08-16T12:00:00Z',
      passed: 0,
      total: 0,
      unitDurationSec: 0.1,
      kols: [],
    });
    expect(loadIlluminations()).toEqual([]);
  });

  it('skips corrupt records mixed into storage', () => {
    localStorage.setItem(
      ILLUMINATIONS_STORAGE_KEY,
      JSON.stringify([
        { id: 'bad' },
        sampleRecord('good'),
        { not: 'an illumination' },
      ]),
    );
    const loaded = loadIlluminations();
    expect(loaded.map((r) => r.id)).toEqual(['good']);
  });

  it('clears stored artwork with the rest of history', () => {
    saveIllumination(sampleRecord());
    expect(loadIlluminations()).toHaveLength(1);
    clearSessions();
    expect(loadIlluminations()).toHaveLength(0);
  });

  it('names the saved artwork with the date and set count', () => {
    const text = formatIlluminationSummary(sampleRecord(), 'en');
    expect(text).toContain('30');
    expect(text).toContain('sets passed');
  });
});

describe('parseIllumination', () => {
  it('rejects a kol with an unknown section', () => {
    const record = sampleRecord();
    const bad = structuredClone(record);
    (bad.kols[0] as { section: string }).section = 'calibration';
    const parsed = parseIllumination({
      ...bad,
      kols: [bad.kols[0]],
    });
    expect(parsed).toBeNull();
  });
});
