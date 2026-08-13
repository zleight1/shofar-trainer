export interface FluxPeak {
  i: number;
  v: number;
}

export interface AttackDiagnosis {
  rawPeakCount: number;
  keptCount: number;
  droppedEchoCount: number;
  echoLagSec: number | null;
  onsetSec: number[];
}

export const ECHO_MIN_LAG_SEC = 0.035;
export const ECHO_MAX_LAG_SEC = 0.28;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function periodSec(peaks: FluxPeak[], hopSec: number): number {
  const strong = [...peaks].sort((a, b) => b.v - a.v).slice(0, Math.min(8, peaks.length));
  const timed = [...strong].sort((a, b) => a.i - b.i);
  const ioi: number[] = [];
  for (let k = 1; k < timed.length; k++) {
    ioi.push((timed[k].i - timed[k - 1].i) * hopSec);
  }
  return median(ioi) || 0.12;
}

function nearPlayingPeriod(lagSec: number, period: number): boolean {
  const slop = period * 0.28;
  return Math.abs(lagSec - period) <= slop || Math.abs(lagSec - 2 * period) <= slop;
}

/** Most common delay of a weaker peak after a stronger one, not the playing period. */
export function estimateEchoLagSec(
  peaks: FluxPeak[],
  hopSec: number,
  knownLagSec: number | null = null,
): number | null {
  if (peaks.length < 3) return knownLagSec;
  const period = periodSec(peaks, hopSec);
  const byTime = [...peaks].sort((a, b) => a.i - b.i);
  const binSec = 0.008;
  const votes = new Map<number, number>();

  for (let a = 0; a < byTime.length; a++) {
    for (let b = a + 1; b < byTime.length; b++) {
      const lagSec = (byTime[b].i - byTime[a].i) * hopSec;
      if (lagSec < ECHO_MIN_LAG_SEC || lagSec > ECHO_MAX_LAG_SEC) continue;
      if (nearPlayingPeriod(lagSec, period)) continue;
      if (byTime[b].v >= byTime[a].v * 0.85) continue;
      const key = Math.round(lagSec / binSec);
      votes.set(key, (votes.get(key) ?? 0) + 1);
    }
  }

  let bestKey = -1;
  let bestCount = 0;
  for (const [key, count] of votes) {
    if (count > bestCount || (count === bestCount && key > bestKey)) {
      bestCount = count;
      bestKey = key;
    }
  }

  if (bestCount >= 2) return bestKey * binSec;
  return knownLagSec;
}

export function dropEchoTaps(
  peaks: FluxPeak[],
  lagSec: number,
  hopSec: number,
): { kept: FluxPeak[]; dropped: FluxPeak[] } {
  const lagFrames = lagSec / hopSec;
  const slop = Math.max(1, Math.round(0.012 / hopSec));
  const byTime = [...peaks].sort((a, b) => a.i - b.i);
  const drop = new Set<number>();

  for (let a = 0; a < byTime.length; a++) {
    if (drop.has(a)) continue;
    for (let b = a + 1; b < byTime.length; b++) {
      if (drop.has(b)) continue;
      if (Math.abs(byTime[b].i - byTime[a].i - lagFrames) > slop) continue;
      if (byTime[b].v >= byTime[a].v * 0.85) continue;
      drop.add(b);
    }
  }

  const kept: FluxPeak[] = [];
  const dropped: FluxPeak[] = [];
  for (let i = 0; i < byTime.length; i++) {
    if (drop.has(i)) dropped.push(byTime[i]);
    else kept.push(byTime[i]);
  }

  if (kept.length < 8 && peaks.length >= 8) {
    return { kept: [...peaks].sort((a, b) => a.i - b.i), dropped: [] };
  }
  return { kept, dropped };
}
