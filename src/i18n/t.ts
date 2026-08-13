import { en, type MessageCatalog } from './en';
import { he } from './he';
import type { Locale } from './locale';
import { getLocale } from './locale';
import type { BlastType, ScoreIssue } from '../halacha/types';
import type { LiveTimingState } from '../halacha/live-timing';

export function catalog(locale: Locale = getLocale()): MessageCatalog {
  return locale === 'he' ? he : en;
}

export function formatIssue(issue: ScoreIssue, locale: Locale = getLocale()): string {
  const issues = catalog(locale).issues;
  const hasParams = issue.params != null && Object.keys(issue.params).length > 0;
  if (issue.code in issues && (hasParams || issue.message == null)) {
    const fn = issues[issue.code as keyof typeof issues];
    return fn({
      duration: num(issue.params?.duration),
      min: num(issue.params?.min),
      cap: num(issue.params?.cap),
      expected: Number(issue.params?.expected ?? 0),
      detected: Number(issue.params?.detected ?? 0),
      sec: num(issue.params?.sec ?? issue.params?.duration),
      n: Number(issue.params?.n ?? 0),
    } as never);
  }
  return issue.message ?? issue.code;
}

function num(value: string | number | undefined): string {
  if (typeof value === 'number') return value.toFixed(1);
  if (typeof value === 'string' && value.length > 0) return value;
  return '';
}

export function formatLiveLine(state: LiveTimingState, locale: Locale = getLocale()): string {
  const c = catalog(locale);
  const elapsed = state.elapsedSec.toFixed(1);
  const min = state.targetMinSec.toFixed(1);
  switch (state.status) {
    case 'waiting':
      return c.liveWaiting;
    case 'building':
      return c.liveBuilding({ min });
    case 'too_short':
      return c.liveTooShort({ elapsed, min });
    case 'good':
      return c.liveGood({ elapsed });
    case 'too_long':
      return c.liveTooLongShevarim({ elapsed });
    default: {
      const _exhaustive: never = state.status;
      return _exhaustive;
    }
  }
}

export function calloutForType(type: BlastType, locale: Locale = getLocale()): string {
  const c = catalog(locale);
  switch (type) {
    case 'tekiah':
      return c.calloutTekiah;
    case 'shevarim':
    case 'shevarim_teruah':
      return c.calloutShevarim;
    case 'teruah':
      return c.calloutTeruah;
    case 'tekiah_gedolah':
      return c.calloutGedolah;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function blastLabel(type: BlastType, locale: Locale = getLocale()): string {
  return calloutForType(type, locale);
}
