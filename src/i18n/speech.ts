import type { Locale } from './locale';

let voicesCache: SpeechSynthesisVoice[] | null = null;
let voicesInflight: Promise<SpeechSynthesisVoice[]> | null = null;

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
