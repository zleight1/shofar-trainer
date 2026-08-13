import type { BlastType } from '../halacha/types';
import type { Locale } from '../i18n/locale';
import { getLocale } from '../i18n/locale';
import { catalog } from '../i18n/t';
import { speakAndWait, unlockSpeechSynthesis } from '../i18n/speech';

export type CalloutClipId =
  | 'tekiah'
  | 'shevarim'
  | 'teruah'
  | 'gedolah'
  | 'calibrateComplete';

export interface CalloutGate {
  context?: AudioContext | null;
  pause?: () => void;
  resume?: () => void;
}

const rawCache = new Map<string, ArrayBuffer>();
let fallbackContext: AudioContext | null = null;
let gate: CalloutGate = {};

export function clipIdForBlast(type: BlastType): CalloutClipId {
  switch (type) {
    case 'tekiah':
      return 'tekiah';
    case 'shevarim':
    case 'shevarim_teruah':
      return 'shevarim';
    case 'teruah':
      return 'teruah';
    case 'tekiah_gedolah':
      return 'gedolah';
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function calloutUrl(id: CalloutClipId, locale: Locale = getLocale()): string {
  return `/callouts/${locale}-${id}.wav`;
}

export function setCalloutGate(next: CalloutGate): void {
  gate = next;
}

function audioContextCtor(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') return undefined;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  );
}

export function getOrCreatePlaybackContext(): AudioContext | null {
  const Ctor = audioContextCtor();
  if (!Ctor) return null;
  if (!fallbackContext || fallbackContext.state === 'closed') {
    fallbackContext = new Ctor();
  }
  return fallbackContext;
}

export function markPlaybackContextClosed(): void {
  if (fallbackContext) {
    fallbackContext = null;
  }
}

function activeContext(): AudioContext | null {
  if (gate.context && gate.context.state !== 'closed') return gate.context;
  return getOrCreatePlaybackContext();
}

function playSilentUnlock(ctx: AudioContext): void {
  const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start(0);
}

/** Must run in a tap handler before any `await`, or iOS will not play audio. */
export function unlockCallouts(): void {
  const ctx = getOrCreatePlaybackContext();
  if (ctx) {
    void ctx.resume();
    playSilentUnlock(ctx);
  }
  unlockSpeechSynthesis();
  void preloadCallouts(getLocale());
}

export async function preloadCallouts(locale: Locale = getLocale()): Promise<void> {
  const ids: CalloutClipId[] = [
    'tekiah',
    'shevarim',
    'teruah',
    'gedolah',
    'calibrateComplete',
  ];
  await Promise.all(ids.map((id) => loadRaw(calloutUrl(id, locale))));
}

async function loadRaw(url: string): Promise<ArrayBuffer | null> {
  if (typeof fetch === 'undefined') return null;
  const cached = rawCache.get(url);
  if (cached) return cached;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const raw = await res.arrayBuffer();
    rawCache.set(url, raw);
    return raw;
  } catch {
    return null;
  }
}

function decodeAudio(ctx: AudioContext, raw: ArrayBuffer): Promise<AudioBuffer> {
  const copy = raw.slice(0);
  return new Promise((resolve, reject) => {
    const result = ctx.decodeAudioData(copy, resolve, reject);
    if (result && typeof result.then === 'function') {
      void result.then(resolve, reject);
    }
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function playBuffer(ctx: AudioContext, buffer: AudioBuffer): Promise<void> {
  await ctx.resume();
  await new Promise<void>((resolve) => {
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = 1;
    src.buffer = buffer;
    src.connect(gain);
    gain.connect(ctx.destination);
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    src.onended = done;
    src.start();
    setTimeout(done, Math.ceil((buffer.duration + 0.4) * 1000));
  });
}

function clipSpeechText(id: CalloutClipId, locale: Locale): string {
  const c = catalog(locale);
  switch (id) {
    case 'tekiah':
      return c.calloutTekiah;
    case 'shevarim':
      return c.calloutShevarim;
    case 'teruah':
      return c.calloutTeruah;
    case 'gedolah':
      return c.calloutGedolah;
    case 'calibrateComplete':
      return c.calibrateCompleteSpeech;
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export async function speakCallout(
  id: CalloutClipId,
  postDelayMs = 500,
): Promise<void> {
  const locale = getLocale();
  gate.pause?.();
  try {
    const ctx = activeContext();
    const raw = ctx ? await loadRaw(calloutUrl(id, locale)) : null;
    if (ctx && raw) {
      try {
        const buffer = await decodeAudio(ctx, raw);
        await playBuffer(ctx, buffer);
        await delay(postDelayMs);
        return;
      } catch {
        // fall through to SpeechSynthesis
      }
    }
    await speakAndWait(clipSpeechText(id, locale), postDelayMs);
  } finally {
    gate.resume?.();
  }
}
