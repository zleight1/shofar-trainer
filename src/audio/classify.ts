import type { BlastType, ClassifiedBlast } from '../halacha/types';
import type { BlastSegment } from '../halacha/types';

export function classifySegments(
  segments: BlastSegment[],
  unitSec: number,
): ClassifiedBlast {
  if (segments.length === 0) {
    return { type: 'tekiah', segments: [], totalDurationSec: 0 };
  }

  const total = segments.reduce((s, seg) => s + seg.durationSec, 0);
  const longThreshold = unitSec * 4;
  const mediumThreshold = unitSec * 2;

  const allLong = segments.every((s) => s.durationSec >= longThreshold);
  const allShort = segments.every((s) => s.durationSec < mediumThreshold);

  if (segments.length === 1 && segments[0].durationSec >= longThreshold) {
    return { type: 'tekiah', segments, totalDurationSec: total };
  }

  if (allShort && segments.length >= 7) {
    return { type: 'teruah', segments, totalDurationSec: total };
  }

  if (segments.length === 3 && segments.every((s) => s.durationSec >= mediumThreshold)) {
    return { type: 'shevarim', segments, totalDurationSec: total };
  }

  if (segments.length >= 4 && !allLong && !allShort) {
    const shevarimCount = segments.filter((s) => s.durationSec >= mediumThreshold).length;
    if (shevarimCount >= 2 && segments.length > shevarimCount) {
      return { type: 'shevarim_teruah', segments, totalDurationSec: total };
    }
  }

  if (allLong) {
    return { type: 'tekiah_gedolah', segments, totalDurationSec: total };
  }

  if (segments.length >= 3 && segments.length <= 5) {
    return { type: 'shevarim', segments, totalDurationSec: total };
  }

  if (segments.length >= 6) {
    return { type: 'teruah', segments, totalDurationSec: total };
  }

  return { type: 'tekiah', segments, totalDurationSec: total };
}

export function classifyByExpectedType(
  segments: BlastSegment[],
  expectedType: BlastType,
): ClassifiedBlast {
  const total = segments.reduce((s, seg) => s + seg.durationSec, 0);
  return { type: expectedType, segments, totalDurationSec: total };
}

export function inferUnitFromTeruahSegments(segments: BlastSegment[]): number {
  if (segments.length === 0) return 0.15;
  const sorted = [...segments].map((s) => s.durationSec).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted[mid];
}
