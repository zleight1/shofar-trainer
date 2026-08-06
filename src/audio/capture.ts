export interface RecordingResult {
  samples: Float32Array;
  sampleRate: number;
  durationSec: number;
}

/** Browser-side recorder with AnalyserNode for live visualization */
export class AudioRecorder {
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private chunks: Float32Array[] = [];
  private recording = false;
  private sampleRate = 44100;

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  isRecording(): boolean {
    return this.recording;
  }

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

    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.45;

    const processor = this.context.createScriptProcessor(4096, 1, 1);
    const silent = this.context.createGain();
    silent.gain.value = 0;

    this.chunks = [];
    this.recording = true;

    processor.onaudioprocess = (e) => {
      if (!this.recording) return;
      const input = e.inputBuffer.getChannelData(0);
      this.chunks.push(new Float32Array(input));
    };

    source.connect(this.analyser);
    source.connect(processor);
    processor.connect(silent);
    silent.connect(this.context.destination);

    (this as unknown as { _processor: ScriptProcessorNode })._processor = processor;
    (this as unknown as { _silent: GainNode })._silent = silent;
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
    this.analyser?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.context?.close();
    this.context = null;
    this.stream = null;
    this.analyser = null;
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

/** Peak level 0–1 from time-domain analyser samples */
export function peakFromTimeDomain(data: ArrayLike<number>): number {
  let peak = 0;
  for (let i = 0; i < data.length; i++) {
    const abs = Math.abs(data[i]);
    if (abs > peak) peak = abs;
  }
  return peak;
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
