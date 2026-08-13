import { describe, expect, it } from 'vitest';
import { encodeWavPcm16 } from './wav';

describe('encodeWavPcm16', () => {
  it('writes a 44-byte header plus two bytes per sample', () => {
    const samples = new Float32Array([0, 0.5, -0.5, 1]);
    const buf = encodeWavPcm16(samples, 44100);
    const view = new DataView(buf);
    expect(buf.byteLength).toBe(44 + 8);
    expect(String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))).toBe(
      'RIFF',
    );
    expect(view.getUint32(24, true)).toBe(44100);
    expect(view.getUint16(22, true)).toBe(1);
  });
});
