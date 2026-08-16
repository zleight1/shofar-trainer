import { describe, expect, it } from 'vitest';
import { timingOverlayLayout } from './live-waveform';

describe('timingOverlayLayout', () => {
  it('keeps the compact elapsed/goal overlay on short phone-landscape canvases', () => {
    const layout = timingOverlayLayout(72);
    expect(layout.fontPx).toBe(11);
    expect(layout.barH).toBe(20);
    expect(layout.font).toBe('11px system-ui, sans-serif');
    expect(layout.y + layout.barH).toBeLessThanOrEqual(72);
  });

  it('makes elapsed versus goal large enough to read on desktop live waveforms', () => {
    const layout = timingOverlayLayout(200);
    expect(layout.fontPx).toBeGreaterThanOrEqual(26);
    expect(layout.barH).toBeGreaterThan(layout.fontPx);
    expect(layout.font).toMatch(/^bold \d+px system-ui, sans-serif$/);
    expect(layout.reserved).toBeLessThan(200 * 0.45);
  });

  it('grows the overlay on taller desktop canvases without covering the waveform', () => {
    const desktop = timingOverlayLayout(200);
    const wide = timingOverlayLayout(280);
    expect(wide.fontPx).toBeGreaterThan(desktop.fontPx);
    expect(wide.fontPx).toBeLessThanOrEqual(36);
    expect(wide.y).toBeGreaterThan(280 * 0.55);
  });
});
