import type { Locale } from './locale';
import { getLocale } from './locale';

let voicesCache: SpeechSynthesisVoice[] | null = null;
let voicesInflight: Promise<SpeechSynthesisVoice[]> | null = null;

/** Must run in a tap handler. iOS ignores later speak() without this. */
export function unlockSpeechSynthesis(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const synth = window.speechSynthesis;
  try {
    synth.resume();
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    u.rate = 10;
    synth.speak(u);
    synth.cancel();
  } catch {
    // ignore
  }
}

export function findMatchingVoice(
  voices: SpeechSynthesisVoice[],
  locale: Locale,
): SpeechSynthesisVoice | undefined {
  const prefix = locale === 'he' ? 'he' : 'en';
  return voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
}

export function shouldSpeakCallouts(
  locale: Locale,
  voices: SpeechSynthesisVoice[],
): boolean {
  if (locale === 'en') return true;
  return Boolean(findMatchingVoice(voices, 'he'));
}

export function utteranceForCallout(
  text: string,
  locale: Locale,
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisUtterance | null {
  if (!shouldSpeakCallouts(locale, voices)) return null;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.9;
  u.lang = locale === 'he' ? 'he-IL' : 'en-US';
  const voice = findMatchingVoice(voices, locale);
  if (voice) u.voice = voice;
  return u;
}

export function cachedVoices(): SpeechSynthesisVoice[] {
  if (voicesCache) return voicesCache;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices();
}

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (voicesCache && voicesCache.length > 0) return Promise.resolve(voicesCache);
  if (voicesInflight) return voicesInflight;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    voicesCache = [];
    return Promise.resolve(voicesCache);
  }
  const existing = window.speechSynthesis.getVoices();
  if (existing.length > 0) {
    voicesCache = existing;
    return Promise.resolve(existing);
  }
  voicesInflight = new Promise((resolve) => {
    const finish = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', finish);
      clearTimeout(timer);
      voicesCache = window.speechSynthesis.getVoices();
      voicesInflight = null;
      resolve(voicesCache);
    };
    const timer = setTimeout(finish, 600);
    window.speechSynthesis.addEventListener('voiceschanged', finish, { once: true });
  });
  return voicesInflight;
}

export async function speakAndWait(text: string, postDelayMs = 500): Promise<void> {
  const locale = getLocale();
  const voices = await loadVoices();
  if (!shouldSpeakCallouts(locale, voices)) {
    await delay(postDelayMs);
    return;
  }
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    await delay(postDelayMs);
    return;
  }

  const synth = window.speechSynthesis;
  await new Promise<void>((resolve) => {
    let settled = false;
    let keepAlive: ReturnType<typeof setInterval> | undefined;
    const done = () => {
      if (settled) return;
      settled = true;
      if (keepAlive !== undefined) clearInterval(keepAlive);
      setTimeout(resolve, postDelayMs);
    };

    if (synth.speaking || synth.pending) synth.cancel();
    synth.resume();

    const u = utteranceForCallout(text, locale, voices);
    if (!u) {
      done();
      return;
    }
    u.volume = 1;
    u.onend = done;
    u.onerror = done;
    synth.speak(u);
    synth.resume();

    keepAlive = setInterval(() => {
      if (synth.paused) synth.resume();
    }, 200);
    setTimeout(() => {
      if (!synth.speaking && !synth.pending) done();
    }, 400);
    setTimeout(done, 6000);
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
