import { ILLUMINATIONS_STORAGE_KEY } from '../halacha/types';
import type { BlastType, SetPattern } from '../halacha/types';
import type { Locale } from '../i18n/locale';
import { catalog } from '../i18n/t';
import type { PracticeSection, SessionKol } from '../ui/seder-illumination-model';

export const MAX_STORED_ILLUMINATIONS = 20;

export interface StoredIllumination {
  id: string;
  timestamp: string;
  passed: number;
  total: number;
  unitDurationSec: number;
  kols: SessionKol[];
}

const SECTIONS: readonly PracticeSection[] = [
  'sitting',
  'malchuyot',
  'zichronot',
  'shofarot',
  'afterMusaf',
];
const PATTERNS: readonly SetPattern[] = ['tst', 'tsh', 'tt', 'gedolah'];
const BLASTS: readonly BlastType[] = [
  'tekiah',
  'shevarim',
  'teruah',
  'shevarim_teruah',
  'tekiah_gedolah',
];
const STATUSES: readonly SessionKol['status'][] = ['ok', 'warn', 'error'];

export function loadIlluminations(): StoredIllumination[] {
  try {
    const raw = localStorage.getItem(ILLUMINATIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      const record = parseIllumination(item);
      return record ? [record] : [];
    });
  } catch {
    return [];
  }
}

export function saveIllumination(record: StoredIllumination): void {
  if (record.kols.length === 0) return;
  try {
    const next = [record, ...loadIlluminations().filter((item) => item.id !== record.id)];
    localStorage.setItem(
      ILLUMINATIONS_STORAGE_KEY,
      JSON.stringify(next.slice(0, MAX_STORED_ILLUMINATIONS)),
    );
  } catch {
    // Quota or private-mode storage can fail; the live graph still shows.
  }
}

export function getIllumination(id: string): StoredIllumination | null {
  return loadIlluminations().find((item) => item.id === id) ?? null;
}

export function clearIlluminations(): void {
  localStorage.removeItem(ILLUMINATIONS_STORAGE_KEY);
}

export function formatIlluminationSummary(
  record: StoredIllumination,
  locale: Locale = 'en',
): string {
  const c = catalog(locale);
  const date = new Date(record.timestamp).toLocaleString(locale === 'he' ? 'he-IL' : 'en-US');
  return c.historyIlluminationSummary({
    date,
    passed: record.passed,
    total: record.total,
  });
}

export function parseIllumination(value: unknown): StoredIllumination | null {
  const rec = asObject(value);
  if (!rec) return null;
  if (typeof rec.id !== 'string' || rec.id.length === 0) return null;
  if (typeof rec.timestamp !== 'string' || rec.timestamp.length === 0) return null;
  const passed = finiteNumber(rec.passed);
  const total = finiteNumber(rec.total);
  const unitDurationSec = finiteNumber(rec.unitDurationSec);
  if (passed === null || total === null || unitDurationSec === null) return null;
  if (!Array.isArray(rec.kols)) return null;
  const kols = rec.kols.flatMap((item) => {
    const kol = parseKol(item);
    return kol ? [kol] : [];
  });
  if (kols.length === 0) return null;
  return {
    id: rec.id,
    timestamp: rec.timestamp,
    passed,
    total,
    unitDurationSec,
    kols,
  };
}

function parseKol(value: unknown): SessionKol | null {
  const rec = asObject(value);
  if (!rec) return null;
  const section = oneOf(rec.section, SECTIONS);
  const pattern = oneOf(rec.pattern, PATTERNS);
  const type = oneOf(rec.type, BLASTS);
  const status = oneOf(rec.status, STATUSES);
  if (!section || !pattern || !type || !status) return null;
  if (typeof rec.setId !== 'string' || rec.setId.length === 0) return null;
  const index = finiteNumber(rec.index);
  const durationSec = finiteNumber(rec.durationSec);
  const noteCount = finiteNumber(rec.noteCount);
  const fill = finiteNumber(rec.fill);
  if (index === null || durationSec === null || noteCount === null || fill === null) return null;
  if (typeof rec.setPassed !== 'boolean') return null;
  const expectedNotes = rec.expectedNotes === null ? null : finiteNumber(rec.expectedNotes);
  if (expectedNotes === null && rec.expectedNotes != null) return null;
  return {
    index,
    setId: rec.setId,
    section,
    pattern,
    type,
    durationSec,
    noteCount,
    expectedNotes,
    status,
    setPassed: rec.setPassed,
    fill,
  };
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  if (typeof value !== 'string') return null;
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
}
