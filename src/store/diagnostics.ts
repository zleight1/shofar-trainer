import type { AttackDiagnosis } from '../audio/echo-taps';

export const DIAGNOSTICS_ENABLED_KEY = 'shofar-trainer-diagnostics';
export const ROOM_PROFILE_KEY = 'shofar-trainer-room-profile';

export interface RoomProfile {
  echoLagSec: number;
  updatedAt: string;
}

function storage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function isDiagnosticsEnabled(): boolean {
  return storage()?.getItem(DIAGNOSTICS_ENABLED_KEY) === '1';
}

export function setDiagnosticsEnabled(on: boolean): void {
  const s = storage();
  if (!s) return;
  if (on) s.setItem(DIAGNOSTICS_ENABLED_KEY, '1');
  else s.removeItem(DIAGNOSTICS_ENABLED_KEY);
}

export function getRoomProfile(): RoomProfile | null {
  const raw = storage()?.getItem(ROOM_PROFILE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as RoomProfile;
    if (!Number.isFinite(parsed.echoLagSec) || parsed.echoLagSec <= 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setRoomProfile(profile: RoomProfile): void {
  storage()?.setItem(ROOM_PROFILE_KEY, JSON.stringify(profile));
}

export function clearRoomProfile(): void {
  storage()?.removeItem(ROOM_PROFILE_KEY);
}

export function rememberEchoFromDiagnosis(diagnosis: AttackDiagnosis): void {
  if (!isDiagnosticsEnabled()) return;
  if (diagnosis.echoLagSec == null || diagnosis.droppedEchoCount < 2) return;
  setRoomProfile({
    echoLagSec: diagnosis.echoLagSec,
    updatedAt: new Date().toISOString(),
  });
}
