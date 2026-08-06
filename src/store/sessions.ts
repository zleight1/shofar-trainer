import type { PracticeSession } from '../halacha/types';
import { SESSIONS_STORAGE_KEY } from '../halacha/types';

export function loadSessions(): PracticeSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PracticeSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSession(session: PracticeSession): void {
  const sessions = loadSessions();
  sessions.unshift(session);
  localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions.slice(0, 100)));
}

export function clearSessions(): void {
  localStorage.removeItem(SESSIONS_STORAGE_KEY);
}

export function getUnitDuration(): number | null {
  const raw = localStorage.getItem('shofar-trainer-unit-sec');
  if (!raw) return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function setUnitDuration(sec: number): void {
  localStorage.setItem('shofar-trainer-unit-sec', String(sec));
}

export function formatSessionSummary(session: PracticeSession): string {
  const date = new Date(session.timestamp).toLocaleString();
  const status = session.passed ? 'PASS' : 'FAIL';
  const ratio =
    session.tekiahRatio !== null ? ` ratio ${(session.tekiahRatio * 100).toFixed(0)}%` : '';
  return `${date} — ${session.stepId} — ${status}${ratio}`;
}
