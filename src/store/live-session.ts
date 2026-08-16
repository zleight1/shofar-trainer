export const LIVE_SESSION_STORAGE_KEY = 'shofar-trainer-live-session';

function storage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

/** Default on: a guided run should feel like a live seder unless turned off. */
export function isLiveSessionEnabled(): boolean {
  const value = storage()?.getItem(LIVE_SESSION_STORAGE_KEY);
  if (value == null) return true;
  return value === '1';
}

export function setLiveSessionEnabled(on: boolean): void {
  const s = storage();
  if (!s) return;
  s.setItem(LIVE_SESSION_STORAGE_KEY, on ? '1' : '0');
}
