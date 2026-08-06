import { analyzeCalibration } from '../audio/analyze';
import { AudioRecorder } from '../audio/capture';
import { getUnitDuration, setUnitDuration } from '../store/sessions';
import { button, el, speakAndWait } from './components';
import { attachLiveWaveform } from './live-waveform';

export interface CalibrateMountOptions {
  onDone: () => void;
}

export function mountCalibrate(root: HTMLElement, options: CalibrateMountOptions): () => void {
  let recorder: AudioRecorder | null = null;
  let recording = false;
  let preparing = false;
  let detectedUnit: number | null = getUnitDuration();
  let stopLive: (() => void) | null = null;

  const container = el('div', 'calibrate-view');
  root.appendChild(container);

  function detachLive(): void {
    stopLive?.();
    stopLive = null;
  }

  function render(): void {
    detachLive();
    container.innerHTML = '';
    container.appendChild(el('h2', '', 'Calibrate'));
    container.appendChild(
      el(
        'p',
        'instructions',
        'Blow one short teruah-style blast (or a few quick staccato notes). The app learns the length of one teruah unit for all timing checks.',
      ),
    );

    const canvas = el('canvas', recording ? 'waveform live' : 'waveform');
    canvas.height = 180;
    container.appendChild(canvas);

    if (recording) {
      container.appendChild(el('p', 'live-hint', 'Watch the live waveform as you blow'));
    }

    const status = el('div', 'calibrate-status');
    if (recording) {
      status.appendChild(el('p', 'recording-label', '● Recording — blow now'));
    } else if (preparing) {
      status.appendChild(el('p', 'preparing-label', 'Callout… get ready to blow'));
    } else if (detectedUnit) {
      status.appendChild(el('p', 'unit-display', `Current unit: ${(detectedUnit * 1000).toFixed(0)} ms`));
    }
    container.appendChild(status);

    const controls = el('div', 'controls');
    const recBtn = button(
      preparing ? 'Starting…' : recording ? 'Stop' : 'Record teruah',
      recording ? 'btn danger' : 'btn primary',
    );
    const saveBtn = button('Save & continue', 'btn');
    const backBtn = button('Skip for now', 'btn secondary');

    recBtn.addEventListener('click', () => void toggleRecord());
    saveBtn.addEventListener('click', () => {
      if (detectedUnit) {
        setUnitDuration(detectedUnit);
        options.onDone();
      }
    });
    recBtn.disabled = preparing;
    saveBtn.disabled = !detectedUnit || recording || preparing;
    backBtn.addEventListener('click', () => {
      detachLive();
      if (recording && recorder) {
        recorder.stop();
        recorder = null;
        recording = false;
      }
      options.onDone();
    });

    controls.append(recBtn, saveBtn, backBtn);
    container.appendChild(controls);

    if (recording && recorder) {
      stopLive = attachLiveWaveform(canvas, () => recorder!.getAnalyser());
    }
  }

  async function toggleRecord(): Promise<void> {
    if (!recording) {
      preparing = true;
      render();
      await speakAndWait('Teruah');
      preparing = false;
      recorder = new AudioRecorder();
      await recorder.start();
      recording = true;
      render();
      return;
    }

    detachLive();
    recording = false;
    const result = recorder!.stop();
    recorder = null;
    detectedUnit = analyzeCalibration(result.samples, result.sampleRate);
    render();
  }

  render();
  return () => {
    detachLive();
    if (recording && recorder) {
      recorder.stop();
    }
    container.remove();
  };
}
