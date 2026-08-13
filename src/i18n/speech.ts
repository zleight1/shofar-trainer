import type { Locale } from './locale';

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

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return Promise.resolve([]);
  }
  const existing = window.speechSynthesis.getVoices();
  if (existing.length > 0) return Promise.resolve(existing);
  return new Promise((resolve) => {
    const done = () => resolve(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, 600);
  });
}
