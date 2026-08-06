export interface RecordingResult {
  samples: Float32Array;
  sampleRate: number;
  durationSec: number;
}

/** Browser-side recorder using ScriptProcessor / AudioWorklet fallback */
export class AudioRecorder {
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private chunks: Float32Array[] = [];
  private recording = false;
  private sampleRate = 44100;

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    this.context = new AudioContext();
    this.sampleRate = this.context.sampleRate;
    const source = this.context.createMediaStreamSource(this.stream);
    const processor = this.context.createScriptProcessor(4096, 1, 1);
    this.chunks = [];
    this.recording = true;

    processor.onaudioprocess = (e) => {
      if (!this.recording) return;
      const input = e.inputBuffer.getChannelData(0);
      this.chunks.push(new Float32Array(input));
    };

    source.connect(processor);
    processor.connect(this.context.destination);
    (this as unknown as { _processor: ScriptProcessorNode })._processor = processor;
  }

  stop(): RecordingResult {
    this.recording = false;
    const totalLength = this.chunks.reduce((n, c) => n + c.length, 0);
    const samples = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of this.chunks) {
      samples.set(chunk, offset);
      offset += chunk.length;
    }

    this.cleanup();
    return {
      samples,
      sampleRate: this.sampleRate,
      durationSec: samples.length / this.sampleRate,
    };
  }

  private cleanup(): void {
    const proc = (this as unknown as { _processor?: ScriptProcessorNode })._processor;
    proc?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.context?.close();
    this.context = null;
    this.stream = null;
  }
}

/** Merge float32 chunks (for tests / offline use) */
export function concatSamples(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/** Generate synthetic test signal: bursts of sine at given intervals */
export function generateTestSignal(
  sampleRate: number,
  bursts: Array<{ startSec: number; durationSec: number; freq?: number }>,
): Float32Array {
  const maxEnd = bursts.reduce((m, b) => Math.max(m, b.startSec + b.durationSec), 0);
  const length = Math.ceil(maxEnd * sampleRate);
  const samples = new Float32Array(length);

  for (const burst of bursts) {
    const freq = burst.freq ?? 400;
    const start = Math.floor(burst.startSec * sampleRate);
    const end = Math.floor((burst.startSec + burst.durationSec) * sampleRate);
    for (let i = start; i < end && i < length; i++) {
      const t = (i - start) / sampleRate;
      const env = Math.min(1, t * 20) * Math.min(1, (burst.durationSec - t) * 20);
      samples[i] = Math.sin(2 * Math.PI * freq * t) * 0.8 * env;
    }
  }
  return samples;
}
