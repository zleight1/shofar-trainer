import type { BlastType } from '../halacha/types';
import type { Locale } from '../i18n/locale';
import { catalog } from '../i18n/t';
import { el, button } from './components';
import type { PracticeSection, SessionKol } from './seder-illumination-model';
import { passedSetCount, type SetTake } from './seder-illumination-model';

const NS_W = 280;
const CX = 140;
const TOP = 18;
const BOTTOM = 16;
const BAND_H = 7.35;
const GEDOLAH_H = 13.2;
const BAND_GAP = 0.62;
const ROUND_GAP = 3.1;
const SECTION_GAP = 9.2;
const MIN_SPAN = 34;
const MAX_SPAN = 112;

const SECTION_YARNS: Record<PracticeSection, readonly string[]> = {
  sitting: ['#c7d2fe', '#e9d5ff', '#fbcfe8', '#bae6fd', '#ddd6fe', '#fecaca', '#a5f3fc', '#fde68a'],
  malchuyot: ['#fbbf24', '#f59e0b', '#a78bfa', '#fde68a', '#c4b5fd', '#fcd34d', '#818cf8', '#e8c39e'],
  zichronot: ['#34d399', '#2dd4bf', '#6ee7b7', '#a3e635', '#059669', '#facc15', '#5eead4', '#86efac'],
  shofarot: ['#fb7185', '#f472b6', '#22d3ee', '#fbbf24', '#f97316', '#38bdf8', '#e879f9', '#4ade80'],
  afterMusaf: ['#818cf8', '#c084fc', '#f472b6', '#22d3ee', '#fbbf24', '#34d399', '#fb7185', '#a78bfa'],
};

export function sectionSwatch(section: PracticeSection): string {
  return SECTION_YARNS[section][0];
}

export interface IlluminationCopy {
  title: string;
  description: string;
}

interface PlacedBand {
  kol: SessionKol;
  y: number;
  h: number;
  span: number;
  fill: string;
  accent: string;
  edge: string;
  spine: string;
  wash: string;
}

export function illuminationSvg(kols: SessionKol[], copy: IlluminationCopy): string {
  const placed = layoutBands(kols);
  const height = placed.length === 0 ? TOP + BOTTOM + 40 : placed[placed.length - 1].y + placed[placed.length - 1].h + BOTTOM;
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${NS_W} ${n(height)}" role="img" aria-label="${xml(copy.description)}">`,
    `<title>${xml(copy.title)}</title>`,
    `<desc>${xml(copy.description)}</desc>`,
    `<rect class="parchment" width="${NS_W}" height="${n(height)}" fill="#f4ead6"/>`,
    textileGrain(height),
    borderRow(10, '#d6c4a3'),
    `<line class="spine" x1="${CX}" x2="${CX}" y1="${TOP - 4}" y2="${n(height - BOTTOM + 4)}" stroke="#c9b089" stroke-width="1.15"/>`,
  );

  for (let i = 0; i < placed.length; i++) {
    const band = placed[i];
    if (i > 0) {
      const prev = placed[i - 1];
      const gapY = prev.y + prev.h;
      const gapH = band.y - gapY;
      if (gapH > 1.6) {
        parts.push(sectionRule(gapY, gapH, band.kol.section !== prev.kol.section));
      } else if (gapH > 0.2) {
        parts.push(separatorStrip(gapY, gapH, band));
      }
    }
    parts.push(bandMarkup(band));
  }

  parts.push(
    borderRow(height - 12, '#d6c4a3'),
    `<rect fill="none" stroke="#e4d4b4" stroke-width="1.2" x="6" y="6" width="${NS_W - 12}" height="${n(height - 12)}"/>`,
    '</svg>',
  );
  return parts.join('');
}

export function renderSederIllumination(
  parent: HTMLElement,
  takes: SetTake[],
  kols: SessionKol[],
  locale: Locale,
): HTMLElement {
  const c = catalog(locale);
  const stats = passedSetCount(takes);
  const wrap = el('section', 'seder-illumination');
  wrap.appendChild(el('h2', 'illumination-title', c.illuminationTitle));
  wrap.appendChild(el('p', 'illumination-blurb', c.illuminationBlurb));

  const frame = el('div', 'illumination-frame');
  const mat = el('div', 'illumination-mat');
  mat.innerHTML = illuminationSvg(kols, {
    title: c.illuminationTitle,
    description: c.illuminationAria({ kolos: kols.length, passed: stats.passed, total: stats.total }),
  });
  frame.appendChild(mat);
  wrap.appendChild(frame);

  const legend = el('div', 'illumination-legend');
  for (const section of legendSections()) {
    const item = el('span', 'illumination-swatch');
    const chip = el('i');
    chip.style.background = sectionSwatch(section);
    item.appendChild(chip);
    item.appendChild(document.createTextNode(sectionLegendLabel(section, c)));
    legend.appendChild(item);
  }
  wrap.appendChild(legend);

  wrap.appendChild(
    el('p', 'illumination-stats', c.illuminationStats({ passed: stats.passed, total: stats.total })),
  );

  const actions = el('div', 'illumination-actions');
  const saveBtn = button(c.illuminationSave, 'btn secondary');
  saveBtn.addEventListener('click', () => {
    const svg = mat.querySelector('svg');
    if (svg) downloadSvg(svg, 'shofar-100.svg');
  });
  actions.appendChild(saveBtn);
  wrap.appendChild(actions);

  parent.appendChild(wrap);
  return wrap;
}

function legendSections(): PracticeSection[] {
  return ['sitting', 'malchuyot', 'zichronot', 'shofarot', 'afterMusaf'];
}

function sectionLegendLabel(
  section: PracticeSection,
  c: ReturnType<typeof catalog>,
): string {
  switch (section) {
    case 'sitting':
      return c.sectionSitting;
    case 'malchuyot':
      return c.sectionMalchuyot;
    case 'zichronot':
      return c.sectionZichronot;
    case 'shofarot':
      return c.sectionShofarot;
    case 'afterMusaf':
      return c.sectionAfterMusaf;
    default: {
      const _exhaustive: never = section;
      return _exhaustive;
    }
  }
}

function layoutBands(kols: SessionKol[]): PlacedBand[] {
  const placed: PlacedBand[] = [];
  let y = TOP;
  for (let i = 0; i < kols.length; i++) {
    const kol = kols[i];
    if (i > 0) {
      const prev = kols[i - 1];
      if (kol.section !== prev.section) y += SECTION_GAP;
      else if (i % 10 === 0) y += ROUND_GAP;
      else y += BAND_GAP;
    }
    const h = kol.type === 'tekiah_gedolah' ? GEDOLAH_H : BAND_H;
    placed.push({
      kol,
      y,
      h,
      span: spanFor(kol),
      ...yarnFor(kol),
    });
    y += h;
  }
  return placed;
}

function spanFor(kol: SessionKol): number {
  const t = clamp(kol.fill, 0.2, 1.16);
  const extra = kol.type === 'tekiah_gedolah' ? 8 : 0;
  return MIN_SPAN + extra + (MAX_SPAN - MIN_SPAN) * Math.min(1, t);
}

function yarnFor(kol: SessionKol): Pick<PlacedBand, 'fill' | 'accent' | 'edge' | 'spine' | 'wash'> {
  const yarns = SECTION_YARNS[kol.section];
  const fill = yarns[hash32(kol.index * 7 + typeSeed(kol.type)) % yarns.length];
  const accent = yarns[(hash32(kol.index * 11 + 3) + 2) % yarns.length];
  let edge = mixHex(fill, '#3f2a14', 0.28);
  let spine = '#f8f1e3';
  let wash = fill;
  if (kol.status === 'error') {
    edge = '#7f1d1d';
    spine = '#7f1d1d';
    wash = mixHex(fill, '#4a1c1c', 0.42);
  } else if (kol.status === 'warn') {
    edge = '#b45309';
    spine = '#f59e0b';
    wash = mixHex(fill, '#78350f', 0.18);
  } else if (kol.type === 'tekiah_gedolah') {
    spine = '#d4a017';
  }
  return { fill: kol.status === 'error' ? mixHex(fill, '#4a1c1c', 0.35) : fill, accent, edge, spine, wash };
}

function typeSeed(type: BlastType): number {
  switch (type) {
    case 'tekiah':
      return 1;
    case 'shevarim':
      return 2;
    case 'teruah':
      return 3;
    case 'shevarim_teruah':
      return 4;
    case 'tekiah_gedolah':
      return 5;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

function bandMarkup(band: PlacedBand): string {
  const { kol, y, h, span, fill, accent, edge, spine, wash } = band;
  const mid = y + h / 2;
  const left = motifMarkup(kol, y, h, span, fill, accent);
  const diamondR = kol.type === 'tekiah_gedolah' ? 3.4 : kol.status === 'error' ? 2.1 : 2.4;
  const spineShape = kol.status === 'error' ? squarePath(CX, mid, 1.7) : diamondPath(CX, mid, diamondR);
  return [
    `<g class="kol-band" data-kol="${kol.index}" data-type="${kol.type}" data-section="${kol.section}" data-status="${kol.status}">`,
    `<rect class="wash" x="16" y="${n(y)}" width="248" height="${n(h)}" fill="${wash}" opacity="0.16"/>`,
    `<g class="left">${left}</g>`,
    `<g class="right" transform="matrix(-1 0 0 1 ${NS_W} 0)">${left}</g>`,
    `<path class="spine-mark" d="${spineShape}" fill="${spine}" stroke="${edge}" stroke-width="0.55"/>`,
    '</g>',
  ].join('');
}

function motifMarkup(
  kol: SessionKol,
  y: number,
  h: number,
  span: number,
  fill: string,
  accent: string,
): string {
  switch (kol.type) {
    case 'tekiah':
      return [
        `<path d="${archBar(y, h, span, 4 + (hash32(kol.index) % 3))}" fill="${fill}" stroke="${accent}" stroke-width="0.35"/>`,
        `<path d="${slab(y, h, span * 0.58)}" fill="${accent}" opacity="0.55"/>`,
      ].join('');
    case 'tekiah_gedolah':
      return [
        `<path d="${archBar(y, h, span, 7)}" fill="${fill}" stroke="${accent}" stroke-width="0.4"/>`,
        `<path d="${slab(y, h, span * 0.72)}" fill="${accent}" opacity="0.45"/>`,
        `<path d="${diamondPath(CX - span * 0.22, y + h / 2, 2.6)}" fill="#f8f1e3" opacity="0.9"/>`,
      ].join('');
    case 'shevarim':
      return chevrons(y, h, span, 3, kol.noteCount, fill, accent);
    case 'teruah': {
      const teeth = Math.max(kol.noteCount, kol.expectedNotes ?? 9);
      return sawtooth(y, h, span, teeth, kol.noteCount, fill, accent);
    }
    case 'shevarim_teruah':
      return (
        chevrons(y, h, span * 0.48, 3, Math.min(3, kol.noteCount), fill, accent) +
        sawtooth(y, h, span, Math.max(6, kol.noteCount), kol.noteCount, accent, fill)
      );
    default: {
      const _exhaustive: never = kol.type;
      return _exhaustive;
    }
  }
}

function archBar(y: number, h: number, span: number, lobes: number): string {
  const top = y + 0.55;
  const bot = y + h - 0.55;
  const mid = y + h / 2;
  const left = CX - span;
  const lobeW = span / Math.max(1, lobes);
  let d = `M ${n(CX)} ${n(top)}`;
  for (let i = 0; i < lobes; i++) {
    const x0 = CX - i * lobeW;
    const x1 = CX - (i + 1) * lobeW;
    d += ` Q ${n((x0 + x1) / 2)} ${n(top - h * 0.32)} ${n(x1)} ${n(top)}`;
  }
  d += ` Q ${n(left - 0.8)} ${n(mid)} ${n(left + 2.2)} ${n(bot)}`;
  for (let i = lobes - 1; i >= 0; i--) {
    const x1 = CX - i * lobeW;
    const x0 = CX - (i + 1) * lobeW;
    d += ` Q ${n((x0 + x1) / 2)} ${n(bot + h * 0.32)} ${n(x1)} ${n(bot)}`;
  }
  d += ' Z';
  return d;
}

function slab(y: number, h: number, span: number): string {
  const top = y + 1.25;
  const bot = y + h - 1.25;
  const mid = y + h / 2;
  const left = CX - span;
  return `M ${n(CX)} ${n(top)} L ${n(left + 2)} ${n(top)} L ${n(left)} ${n(mid)} L ${n(left + 2)} ${n(bot)} L ${n(CX)} ${n(bot)} Z`;
}

function chevrons(
  y: number,
  h: number,
  span: number,
  count: number,
  detected: number,
  fill: string,
  accent: string,
): string {
  const top = y + 0.4;
  const bot = y + h - 0.4;
  const mid = y + h / 2;
  const slot = span / count;
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const outer = CX - span + i * slot + slot * 0.06;
    const inner = outer + slot * 0.8;
    const opacity = i < Math.max(detected, 0) ? 1 : 0.28;
    const color = i === 1 ? accent : fill;
    parts.push(
      `<path d="M ${n(outer)} ${n(mid)} L ${n(inner)} ${n(top)} L ${n(inner)} ${n(bot)} Z" fill="${color}" opacity="${opacity}"/>`,
    );
  }
  return parts.join('');
}

function sawtooth(
  y: number,
  h: number,
  span: number,
  teeth: number,
  detected: number,
  fill: string,
  accent: string,
): string {
  const top = y + 0.32;
  const bot = y + h - 0.32;
  const w = span / Math.max(1, teeth);
  const parts: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const x0 = CX - span + i * w;
    const x1 = x0 + w * 0.5;
    const x2 = x0 + w * 0.94;
    const opacity = i < Math.max(detected, 0) ? 1 : 0.22;
    const color = i % 2 === 0 ? fill : accent;
    parts.push(
      `<path d="M ${n(x0)} ${n(bot)} L ${n(x1)} ${n(top)} L ${n(x2)} ${n(bot)} Z" fill="${color}" opacity="${opacity}"/>`,
    );
  }
  return parts.join('');
}

function separatorStrip(y: number, h: number, band: PlacedBand): string {
  const mid = y + h / 2;
  const span = MAX_SPAN * 0.72;
  return [
    `<g class="separator" data-after="${band.kol.index - 1}">`,
    `<path d="${slab(y - 0.2, h + 0.4, span)}" fill="${band.wash}" opacity="0.55"/>`,
    `<g transform="matrix(-1 0 0 1 ${NS_W} 0)"><path d="${slab(y - 0.2, h + 0.4, span)}" fill="${band.wash}" opacity="0.55"/></g>`,
    `<path d="${squarePath(CX, mid, 1.05)}" fill="#f8f1e3" stroke="#c9b089" stroke-width="0.4"/>`,
    '</g>',
  ].join('');
}

function sectionRule(y: number, h: number, major: boolean): string {
  const mid = y + h / 2;
  const color = major ? '#c4a056' : '#d7c39a';
  const r = major ? 2.6 : 1.7;
  return [
    `<g class="section-rule">`,
    `<line x1="28" x2="${NS_W - 28}" y1="${n(mid)}" y2="${n(mid)}" stroke="${color}" stroke-width="${major ? 1.1 : 0.7}"/>`,
    `<path d="${diamondPath(CX, mid, r)}" fill="#f8f1e3" stroke="${color}" stroke-width="0.55"/>`,
    '</g>',
  ].join('');
}

function textileGrain(height: number): string {
  const lines: string[] = [];
  for (let i = 0; i < 14; i++) {
    const y = 14 + (i * (height - 28)) / 13;
    lines.push(
      `<line x1="18" x2="${NS_W - 18}" y1="${n(y)}" y2="${n(y)}" stroke="#e8dcc4" stroke-width="0.4" opacity="0.35"/>`,
    );
  }
  return `<g class="grain" aria-hidden="true">${lines.join('')}</g>`;
}

function borderRow(y: number, color: string): string {
  const parts: string[] = [];
  for (let i = 0; i < 9; i++) {
    const x = 28 + i * 28;
    parts.push(`<path d="${diamondPath(x, y, 2.1)}" fill="${color}"/>`);
  }
  return `<g class="border-row">${parts.join('')}</g>`;
}

function diamondPath(cx: number, cy: number, r: number): string {
  return `M ${n(cx)} ${n(cy - r)} L ${n(cx + r)} ${n(cy)} L ${n(cx)} ${n(cy + r)} L ${n(cx - r)} ${n(cy)} Z`;
}

function squarePath(cx: number, cy: number, r: number): string {
  return `M ${n(cx - r)} ${n(cy - r)} H ${n(cx + r)} V ${n(cy + r)} H ${n(cx - r)} Z`;
}

function downloadSvg(svg: SVGSVGElement, filename: string): void {
  const xmlDoc = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([xmlDoc], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function n(v: number): string {
  return v.toFixed(2);
}

function xml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function hash32(n: number): number {
  let x = Math.imul(n + 1, 2654435761);
  x ^= x >>> 16;
  x = Math.imul(x, 2246822519);
  x ^= x >>> 13;
  x = Math.imul(x, 3266489917);
  x ^= x >>> 16;
  return x >>> 0;
}

function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexRgb(a);
  const [br, bg, bb] = hexRgb(b);
  return rgbHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbHex(r: number, g: number, b: number): string {
  const h = (ch: number) => Math.round(ch).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}
