import type { RecordingResult } from './capture';

/** Keeps the mic open across multiple blast captures in one practice session */
export class SessionRecorder {
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private silent: GainNode | null = null;
  private chunks: Float32Array[] = [];
  private capturing = false;
  private sampleRate = 44100;
  private open = false;

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  isOpen(): boolean {
    return this.open;
  }

  isCapturing(): boolean {
    return this.capturing;
  }

  async openMic(): Promise<void> {
    if (this.open) return;

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
    this.analyser.smoothingTimeConstant = 0.35;

    this.processor = this.context.createScriptProcessor(4096, 1, 1);
    this.silent = this.context.createGain();
    this.silent.gain.value = 0;

    this.processor.onaudioprocess = (e) => {
      if (!this.capturing) return;
      const input = e.inputBuffer.getChannelData(0);
      this.chunks.push(new Float32Array(input));
    };

    source.connect(this.analyser);
    source.connect(this.processor);
    this.processor.connect(this.silent);
    this.silent.connect(this.context.destination);
    this.open = true;
  }

  beginCapture(): void {
    if (!this.open) throw new Error('SessionRecorder not open');
    this.chunks = [];
    this.capturing = true;
  }

  endCapture(): RecordingResult {
    this.capturing = false;
    const totalLength = this.chunks.reduce((n, c) => n + c.length, 0);
    const samples = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of this.chunks) {
      samples.set(chunk, offset);
      offset += chunk.length;
    }
    return {
      samples,
      sampleRate: this.sampleRate,
      durationSec: samples.length / this.sampleRate,
    };
  }

  close(): void {
    this.capturing = false;
    this.processor?.disconnect();
    this.analyser?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.context?.close();
    this.processor = null;
    this.analyser = null;
    this.silent = null;
    this.context = null;
    this.stream = null;
    this.open = false;
    this.chunks = [];
  }
}
