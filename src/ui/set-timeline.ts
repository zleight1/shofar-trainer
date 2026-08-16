import { DEFAULT_HALACHA_CONFIG } from '../halacha/types';
import type { BlastType, ClassifiedBlast, ScoreIssue, SetPattern } from '../halacha/types';
import { middleDuration } from '../halacha/rules';
import { tekiahMinimumSec, unitsFor } from '../halacha/units';
import type { Locale } from '../i18n/locale';
import { blastLabel, catalog } from '../i18n/t';
import { el } from './components';

export const BLAST_ABBREV: Record<BlastType, string> = {
  tekiah: 'T',
  shevarim: 'Sh',
  teruah: 'Tr',
  tekiah_gedolah: 'T↑',
  shevarim_teruah: 'Sh+Tr',
};

export type TimelineStatus = 'ok' | 'warn' | 'error';
export type TimelineNoteKind = 'ok' | 'short' | 'long' | 'ghost';

export interface TimelineNoteView {
  durationSec: number;
  kind: TimelineNoteKind;
  heightPct: number;
}

export interface TimelineBlastView {
  type: BlastType;
  index: number;
  abbrev: string;
  durationSec: number;
  flexGrow: number;
  fillPct: number;
  minSec: number | null;
  status: TimelineStatus;
  notes: TimelineNoteView[];
  expectedNotes: number | null;
}

export function expectedNoteCount(type: BlastType): number | null {
  switch (type) {
    case 'shevarim':
      return DEFAULT_HALACHA_CONFIG.shevarimNoteCount;
    case 'teruah':
      return DEFAULT_HALACHA_CONFIG.minTeruahBlasts;
    case 'shevarim_teruah':
      return (
        DEFAULT_HALACHA_CONFIG.shevarimNoteCount + DEFAULT_HALACHA_CONFIG.minTeruahBlasts
      );
    case 'tekiah':
    case 'tekiah_gedolah':
      return null;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function buildSetTimelineModel(
  blasts: ClassifiedBlast[],
  issues: ScoreIssue[],
  unitSec: number,
  pattern: SetPattern,
): TimelineBlastView[] {
  const middle = middleDuration(blasts);
  const tekiahMin =
    pattern === 'gedolah' ? null : tekiahMinimumSec(pattern, unitSec, middle);
  const gedolahMin = unitsFor('gedolah', 'tekiah_gedolah') * unitSec;

  return blasts.map((blast, index) => {
    const related = issuesForBlast(blast, index, blasts, issues);
    const status = statusFromIssues(related);
    const minSec = minForBlast(blast.type, tekiahMin, gedolahMin);
    const durationSec = Math.max(0, blast.totalDurationSec);
    const displaySec =
      minSec != null && durationSec < minSec ? minSec : Math.max(durationSec, 0.08);
    const fillPct =
      minSec != null && durationSec < minSec && minSec > 0
        ? (durationSec / minSec) * 100
        : 100;
    const expected = expectedNoteCount(blast.type);
    return {
      type: blast.type,
      index,
      abbrev: BLAST_ABBREV[blast.type],
      durationSec,
      flexGrow: displaySec,
      fillPct,
      minSec,
      status,
      notes: noteViews(blast, expected, related),
      expectedNotes: expected,
    };
  });
}

export function renderSetTimeline(
  parent: HTMLElement,
  blasts: ClassifiedBlast[],
  issues: ScoreIssue[],
  passed: boolean,
  unitSec: number,
  pattern: SetPattern,
  locale: Locale,
): HTMLElement {
  const c = catalog(locale);
  const model = buildSetTimelineModel(blasts, issues, unitSec, pattern);
  const wrap = el('section', 'set-timeline');
  wrap.setAttribute('aria-label', c.setTimelineTitle);

  const head = el('div', 'set-timeline-head');
  head.appendChild(el('h3', 'set-timeline-title', c.setTimelineTitle));
  const verdict = el('span', `timeline-verdict ${passed ? 'pass' : 'fail'}`, passed ? c.passed : c.needsWork);
  head.appendChild(verdict);
  wrap.appendChild(head);

  const track = el('div', 'set-timeline-track');
  track.setAttribute('role', 'list');
  for (const blast of model) {
    track.appendChild(renderBlastCard(blast, locale));
  }
  wrap.appendChild(track);
  parent.appendChild(wrap);
  return wrap;
}

function renderBlastCard(blast: TimelineBlastView, locale: Locale): HTMLElement {
  const c = catalog(locale);
  const card = el('article', `timeline-blast type-${blast.type} status-${blast.status}`);
  card.setAttribute('role', 'listitem');
  card.style.setProperty('--blast-flex', String(blast.flexGrow));

  const label = blastLabel(blast.type, locale);
  const sec = blast.durationSec.toFixed(1);
  const parts = [label, c.timelineDuration({ sec })];
  if (blast.expectedNotes != null) {
    parts.push(c.timelineNotes({ count: blast.notes.filter((n) => n.kind !== 'ghost').length, expected: blast.expectedNotes }));
  }
  card.setAttribute('aria-label', parts.join(', '));

  const nameRow = el('div', 'timeline-name');
  nameRow.appendChild(el('span', 'timeline-abbrev', blast.abbrev));
  nameRow.appendChild(el('span', 'timeline-label', label));
  card.appendChild(nameRow);

  if (blast.notes.length > 0) {
    const row = el('div', 'timeline-notes');
    for (const note of blast.notes) {
      const chip = el('span', `timeline-note ${note.kind}`);
      chip.style.height = `${note.heightPct}%`;
      chip.style.flexGrow = String(Math.max(note.durationSec, 0.04));
      row.appendChild(chip);
    }
    card.appendChild(row);
  } else {
    const bar = el('div', 'timeline-bar');
    const fill = el('div', 'timeline-bar-fill');
    fill.style.width = `${Math.max(0, Math.min(100, blast.fillPct))}%`;
    bar.appendChild(fill);
    card.appendChild(bar);
  }

  const meta = el('div', 'timeline-meta');
  meta.appendChild(el('span', 'timeline-duration', c.timelineDuration({ sec })));
  if (blast.minSec != null && blast.minSec > 0) {
    meta.appendChild(el('span', 'timeline-min', c.timelineMin({ sec: blast.minSec.toFixed(1) })));
  }
  if (blast.expectedNotes != null) {
    const detected = blast.notes.filter((n) => n.kind !== 'ghost').length;
    meta.appendChild(
      el('span', 'timeline-count', c.timelineNotes({ count: detected, expected: blast.expectedNotes })),
    );
  }
  card.appendChild(meta);
  return card;
}

function minForBlast(
  type: BlastType,
  tekiahMin: number | null,
  gedolahMin: number,
): number | null {
  switch (type) {
    case 'tekiah':
      return tekiahMin;
    case 'tekiah_gedolah':
      return gedolahMin;
    case 'shevarim':
    case 'teruah':
    case 'shevarim_teruah':
      return null;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

function noteViews(
  blast: ClassifiedBlast,
  expected: number | null,
  related: ScoreIssue[],
): TimelineNoteView[] {
  if (expected == null && blast.segments.length <= 1) return [];
  const detected = blast.segments.length;
  const slots = Math.max(expected ?? 0, detected);
  if (slots === 0) return [];
  const durs = blast.segments.map((s) => s.durationSec);
  const maxDur = Math.max(0.08, ...durs);
  const notes: TimelineNoteView[] = [];
  for (let i = 0; i < slots; i++) {
    if (i >= detected) {
      notes.push({ durationSec: maxDur * 0.45, kind: 'ghost', heightPct: 38 });
      continue;
    }
    const durationSec = durs[i];
    const kind = noteKind(related, i + 1);
    notes.push({
      durationSec,
      kind,
      heightPct: 38 + 62 * (durationSec / maxDur),
    });
  }
  return notes;
}

function noteKind(related: ScoreIssue[], n: number): TimelineNoteKind {
  for (const issue of related) {
    if (Number(issue.params?.n ?? 0) !== n) continue;
    if (issue.code === 'shever_too_long') return 'long';
    if (issue.code === 'shevarim_note_short') return 'short';
  }
  return 'ok';
}

function statusFromIssues(related: ScoreIssue[]): TimelineStatus {
  if (related.some((i) => i.severity === 'error')) return 'error';
  if (related.some((i) => i.severity === 'warn')) return 'warn';
  return 'ok';
}

export function issuesForBlast(
  blast: ClassifiedBlast,
  index: number,
  blasts: ClassifiedBlast[],
  issues: ScoreIssue[],
): ScoreIssue[] {
  const tekiahIndex = blasts.slice(0, index + 1).filter((b) => b.type === 'tekiah').length - 1;
  switch (blast.type) {
    case 'tekiah':
      if (blasts.length === 1) {
        return issues.filter((i) => i.code === 'tekiah_min_length');
      }
      if (tekiahIndex === 0) {
        return issues.filter((i) => i.code === 'opening_tekiah_too_short');
      }
      return issues.filter((i) => i.code === 'closing_tekiah_too_short');
    case 'shevarim':
      return issues.filter(
        (i) =>
          i.code === 'shevarim_count' ||
          i.code === 'shevarim_count_ok_length' ||
          i.code === 'shevarim_extra' ||
          i.code === 'shevarim_note_short' ||
          i.code === 'shever_too_long',
      );
    case 'teruah':
      return issues.filter((i) => i.code === 'teruah_count');
    case 'shevarim_teruah':
      return issues.filter(
        (i) =>
          i.code === 'teruah_count' ||
          i.code === 'shevarim_count' ||
          i.code === 'shevarim_count_ok_length' ||
          i.code === 'shevarim_extra' ||
          i.code === 'shevarim_note_short' ||
          i.code === 'shever_too_long',
      );
    case 'tekiah_gedolah':
      return [];
    default: {
      const _exhaustive: never = blast.type;
      return _exhaustive;
    }
  }
}
