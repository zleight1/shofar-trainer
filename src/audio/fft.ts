/** In-place radix-2 FFT. `re.length` must be a power of two. */
export function fftRadix2(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  if (n !== im.length || n < 2 || (n & (n - 1)) !== 0) {
    throw new Error('fftRadix2 requires equal power-of-two buffers');
  }

  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wlenRe = Math.cos(ang);
    const wlenIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let wRe = 1;
      let wIm = 0;
      const half = len >> 1;
      for (let j = 0; j < half; j++) {
        const i0 = i + j;
        const i1 = i0 + half;
        const vRe = re[i1] * wRe - im[i1] * wIm;
        const vIm = re[i1] * wIm + im[i1] * wRe;
        re[i1] = re[i0] - vRe;
        im[i1] = im[i0] - vIm;
        re[i0] += vRe;
        im[i0] += vIm;
        const nWRe = wRe * wlenRe - wIm * wlenIm;
        wIm = wRe * wlenIm + wIm * wlenRe;
        wRe = nWRe;
      }
    }
  }
}
