import { kolCountForSet, SET_GROUPS, type SetGroup } from '../halacha/seder';
import {
  countedKolos,
  overviewBlocks,
  overviewKolosForSet,
  type OverviewBlock,
} from '../halacha/seder-overview';
import type { BlastType } from '../halacha/types';
import type { MessageCatalog } from '../i18n/en';
import type { Locale } from '../i18n/locale';
import { getLocale } from '../i18n/locale';
import { blastLabel, catalog, patternLabel, sectionLabel } from '../i18n/t';
import { renderDisclaimer } from './chrome';
import { el } from './components';
import { sectionSwatch } from './seder-illumination';
import { isPracticeSection } from './seder-illumination-model';
import { BLAST_ABBREV } from './set-timeline';

export interface SederOverviewMountOptions {
  onBack: () => void;
  onLocale: (next: Locale) => void;
  onRefreshRegister?: (refresh: () => void) => void;
}

export function mountSederOverview(
  root: HTMLElement,
  options: SederOverviewMountOptions,
): () => void {
  const container = el('div', 'seder-overview');
  root.appendChild(container);

  function render(): void {
    container.replaceChildren();
    const locale = getLocale();
    const c = catalog(locale);
    const blocks = overviewBlocks();

    renderDisclaimer(container, locale);

    const hero = el('div', 'hero');
    hero.appendChild(el('p', 'eyebrow', c.sederEyebrow));
    hero.appendChild(el('p', 'tagline', c.sederTotalLine({ n: countedKolos(blocks) })));
    hero.appendChild(el('p', 'instructions', c.sederIntro));
    container.appendChild(hero);

    container.appendChild(renderRoundExplainer(c, locale));
    container.appendChild(renderNotes(c, locale));

    container.appendChild(el('h2', 'seder-when-title', c.sederWhenTitle));
    for (const block of blocks) {
      container.appendChild(renderBlock(block, c, locale));
    }

    const pacing = el('article', 'seder-section seder-pacing');
    pacing.appendChild(el('h3', '', c.sederPacingTitle));
    pacing.appendChild(el('p', 'instructions', c.liveSessionHint));
    container.appendChild(pacing);
  }

  options.onRefreshRegister?.(render);
  render();
  return () => container.remove();
}

function renderRoundExplainer(c: MessageCatalog, locale: Locale): HTMLElement {
  const wrap = el('section', 'seder-card');
  wrap.appendChild(el('h2', '', c.sederRoundTitle));
  wrap.appendChild(el('p', 'instructions', c.sederRoundBlurb));
  wrap.appendChild(
    renderRoundRow(
      SET_GROUPS.filter((s) => s.section === 'malchuyot'),
      c,
      locale,
    ),
  );
  return wrap;
}

function renderNotes(c: MessageCatalog, locale: Locale): HTMLElement {
  const wrap = el('section', 'seder-card');
  wrap.appendChild(el('h2', '', c.sederNotesTitle));
  const list = el('ul', 'seder-notes');
  const notes: { type: BlastType; text: string }[] = [
    { type: 'tekiah', text: c.sederNoteTekiah },
    { type: 'shevarim', text: c.sederNoteShevarim },
    { type: 'teruah', text: c.sederNoteTeruah },
    { type: 'tekiah_gedolah', text: c.sederNoteGedolah },
  ];
  for (const note of notes) {
    const li = el('li', 'seder-note');
    li.appendChild(kolChip(note.type, locale));
    const body = el('div', 'seder-note-body');
    body.appendChild(el('h3', '', blastLabel(note.type, locale)));
    body.appendChild(el('p', '', note.text));
    li.appendChild(body);
    list.appendChild(li);
  }
  wrap.appendChild(list);
  return wrap;
}

function renderBlock(block: OverviewBlock, c: MessageCatalog, locale: Locale): HTMLElement {
  const article = el('article', 'seder-section');
  const swatch = isPracticeSection(block.section)
    ? sectionSwatch(block.section)
    : 'var(--accent)';
  article.style.setProperty('--section-swatch', swatch);

  const head = el('header', 'seder-section-head');
  const titles = el('div');
  titles.appendChild(el('h3', '', sectionLabel(block.section, c)));
  titles.appendChild(el('p', 'seder-section-meta', sectionMeta(block, c)));
  head.appendChild(titles);
  article.appendChild(head);

  if (block.stBreath === 'none') {
    article.appendChild(el('p', 'breath-cue none', c.breathNone));
  } else if (block.stBreath === 'between') {
    article.appendChild(el('p', 'breath-cue between', c.breathBetween));
  }
  if (block.closingGedolah) {
    article.appendChild(el('p', 'seder-gedolah-flag', c.sederEndsGedolah));
  }

  for (const round of block.rounds) {
    article.appendChild(renderRoundRow(round.sets, c, locale));
  }
  return article;
}

function sectionMeta(block: OverviewBlock, c: MessageCatalog): string {
  const parts = [c.sederKolos({ n: block.kolos })];
  if (block.counted) parts.push(c.sederRounds({ n: block.rounds.length }));
  if (!block.counted) parts.push(c.sederNotCounted);
  return parts.join(' · ');
}

function renderRoundRow(sets: SetGroup[], c: MessageCatalog, locale: Locale): HTMLElement {
  const row = el('div', 'seder-round');
  for (const set of sets) {
    const cell = el('div', 'seder-set');
    cell.appendChild(
      el('p', 'seder-set-label', `${patternLabel(set, c)} · ${kolCountForSet(set)}`),
    );
    const strip = el('div', 'seder-kol-strip');
    for (const kol of overviewKolosForSet(set)) {
      strip.appendChild(kolChip(kol.type, locale));
      if (kol.breathAfter) {
        strip.appendChild(el('span', 'seder-breath', c.sederBreathMark));
      }
    }
    cell.appendChild(strip);
    row.appendChild(cell);
  }
  return row;
}

function kolChip(type: BlastType, locale: Locale): HTMLElement {
  const chip = el('span', `seder-kol type-${type}`, BLAST_ABBREV[type]);
  const label = blastLabel(type, locale);
  chip.setAttribute('title', label);
  chip.setAttribute('aria-label', label);
  return chip;
}
