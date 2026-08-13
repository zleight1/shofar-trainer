import { describe, expect, it } from 'vitest';
import { calloutUrl, clipIdForBlast } from './callout-player';

describe('callout clips', () => {
  it('maps each blast type to a clip id', () => {
    expect(clipIdForBlast('tekiah')).toBe('tekiah');
    expect(clipIdForBlast('shevarim')).toBe('shevarim');
    expect(clipIdForBlast('shevarim_teruah')).toBe('shevarim');
    expect(clipIdForBlast('teruah')).toBe('teruah');
    expect(clipIdForBlast('tekiah_gedolah')).toBe('gedolah');
  });

  it('builds locale-scoped public URLs', () => {
    expect(calloutUrl('tekiah', 'en')).toBe('/callouts/en-tekiah.wav');
    expect(calloutUrl('gedolah', 'he')).toBe('/callouts/he-gedolah.wav');
    expect(calloutUrl('calibrateComplete', 'he')).toBe(
      '/callouts/he-calibrateComplete.wav',
    );
  });
});
