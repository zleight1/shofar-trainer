import type { MessageCatalog } from '../i18n/en';

export const KABBALAH_ART_URL = 'https://www.kabbalahart.com/';
export const KABBALAH_ART_ARTIST = 'Avraham Loewenthal';
export const ILLUMINATION_PNG_NAME = 'shofar-100.png';
export const ILLUMINATION_PNG_WIDTH = 1080;

export interface IlluminationSharePayload {
  title: string;
  text: string;
}

export interface ShareNavigator {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data: ShareData) => boolean;
}

export function illuminationSharePayload(
  c: Pick<MessageCatalog, 'illuminationShareTitle' | 'illuminationShareText'>,
): IlluminationSharePayload {
  return {
    title: c.illuminationShareTitle,
    text: c.illuminationShareText,
  };
}

export function canSharePayload(nav: ShareNavigator | undefined, data: ShareData): boolean {
  if (typeof nav?.share !== 'function') return false;
  if (typeof nav.canShare !== 'function') return true;
  try {
    return nav.canShare(data);
  } catch {
    return false;
  }
}

export function nativeShareAvailable(nav: ShareNavigator | undefined = globalThis.navigator): boolean {
  return typeof nav?.share === 'function';
}

export function isShareAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

export function pngFile(blob: Blob, name = ILLUMINATION_PNG_NAME): File {
  return new File([blob], name, { type: 'image/png' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function svgPixelSize(svg: SVGSVGElement): { width: number; height: number } {
  const vb = svg.viewBox.baseVal;
  if (vb.width > 0 && vb.height > 0) return { width: vb.width, height: vb.height };
  const width = Number(svg.getAttribute('width'));
  const height = Number(svg.getAttribute('height'));
  return {
    width: width > 0 ? width : 280,
    height: height > 0 ? height : 1,
  };
}

export function rasterizeSvgElement(
  svg: SVGSVGElement,
  targetWidth = ILLUMINATION_PNG_WIDTH,
): Promise<Blob> {
  const { width, height } = svgPixelSize(svg);
  const scale = targetWidth / width;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>${new XMLSerializer().serializeToString(svg)}`;
  return rasterizeSvgXml(xml, width, height, scale);
}

export function rasterizeSvgXml(
  svgXml: string,
  width: number,
  height: number,
  scale: number,
): Promise<Blob> {
  if (typeof Image === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('PNG export needs a browser'));
  }
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('PNG export needs a canvas'));
          return;
        }
        ctx.fillStyle = '#f4ead6';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((png) => {
          URL.revokeObjectURL(url);
          if (!png) reject(new Error('PNG export failed'));
          else resolve(png);
        }, 'image/png');
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not draw the illumination'));
    };
    img.src = url;
  });
}

export async function sharePng(
  blob: Blob,
  payload: IlluminationSharePayload,
  nav: ShareNavigator | undefined = globalThis.navigator,
): Promise<'shared' | 'saved'> {
  const file = pngFile(blob);
  const data: ShareData = {
    files: [file],
    title: payload.title,
    text: payload.text,
  };
  if (canSharePayload(nav, data) && nav?.share) {
    await nav.share(data);
    return 'shared';
  }
  downloadBlob(blob, ILLUMINATION_PNG_NAME);
  return 'saved';
}
