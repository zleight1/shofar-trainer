import { describe, expect, it, vi } from 'vitest';
import { catalog } from '../i18n/t';
import {
  KABBALAH_ART_ARTIST,
  KABBALAH_ART_URL,
  canSharePayload,
  illuminationSharePayload,
  isShareAbort,
  nativeShareAvailable,
} from './seder-illumination-share';

describe('illuminationSharePayload', () => {
  it('credits Avraham Loewenthal and links to kabbalahart.com in English', () => {
    const payload = illuminationSharePayload(catalog('en'));
    expect(payload.title.length).toBeGreaterThan(0);
    expect(payload.text).toContain(KABBALAH_ART_ARTIST);
    expect(payload.text).toContain(KABBALAH_ART_URL);
  });

  it('credits the original artist in Hebrew share text', () => {
    const payload = illuminationSharePayload(catalog('he'));
    expect(payload.text).toContain('אברהם לוונטל');
    expect(payload.text).toContain(KABBALAH_ART_URL);
  });
});

describe('canSharePayload', () => {
  it('is false when share is missing', () => {
    expect(canSharePayload(undefined, { text: 'x' })).toBe(false);
    expect(canSharePayload({}, { text: 'x' })).toBe(false);
  });

  it('trusts canShare when the browser provides it', () => {
    expect(
      canSharePayload({ share: async () => undefined, canShare: () => true }, { text: 'x' }),
    ).toBe(true);
    expect(
      canSharePayload({ share: async () => undefined, canShare: () => false }, { text: 'x' }),
    ).toBe(false);
  });

  it('assumes shareable when only share exists', () => {
    expect(canSharePayload({ share: async () => undefined }, { text: 'x' })).toBe(true);
  });

  it('treats a throwing canShare as unsupported', () => {
    expect(
      canSharePayload(
        {
          share: async () => undefined,
          canShare: () => {
            throw new Error('no files');
          },
        },
        { text: 'x' },
      ),
    ).toBe(false);
  });
});

describe('nativeShareAvailable', () => {
  it('follows whether share exists on the navigator', () => {
    expect(nativeShareAvailable({})).toBe(false);
    expect(nativeShareAvailable({ share: async () => undefined })).toBe(true);
  });
});

describe('isShareAbort', () => {
  it('detects a cancelled share sheet', () => {
    expect(isShareAbort(new DOMException('Dismissed', 'AbortError'))).toBe(true);
    expect(isShareAbort(new Error('fail'))).toBe(false);
  });
});

describe('sharePng abort', () => {
  it('does not swallow a cancelled native share as success', async () => {
    const { sharePng } = await import('./seder-illumination-share');
    const blob = new Blob(['png'], { type: 'image/png' });
    const share = vi.fn().mockRejectedValue(new DOMException('Dismissed', 'AbortError'));
    await expect(
      sharePng(blob, { title: 't', text: 'x' }, { share, canShare: () => true }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(share).toHaveBeenCalledOnce();
  });
});
