import { describe, expect, it, beforeEach, vi } from 'vitest';
import { findMatchingVoice, shouldSpeakCallouts, utteranceForCallout } from './speech';

function voice(lang: string): SpeechSynthesisVoice {
  return { lang, name: lang, voiceURI: lang, default: false, localService: true };
}

beforeEach(() => {
  class FakeUtterance {
    text: string;
    lang = '';
    rate = 1;
    voice: SpeechSynthesisVoice | null = null;
    constructor(text: string) {
      this.text = text;
    }
  }
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
});

describe('speech helpers', () => {
  it('sets he-IL matching when a Hebrew voice exists', () => {
    const v = findMatchingVoice([voice('he-IL')], 'he');
    expect(v?.lang).toBe('he-IL');
  });

  it('skips speech when locale is he and no Hebrew voice exists', () => {
    expect(shouldSpeakCallouts('he', [voice('en-US')])).toBe(false);
    expect(shouldSpeakCallouts('en', [voice('en-US')])).toBe(true);
    expect(utteranceForCallout('תקיעה', 'he', [voice('en-US')])).toBeNull();
  });

  it('sets utterance.lang to he-IL when a Hebrew voice exists', () => {
    const u = utteranceForCallout('תקיעה', 'he', [voice('he-IL')]);
    expect(u?.lang).toBe('he-IL');
  });
});
