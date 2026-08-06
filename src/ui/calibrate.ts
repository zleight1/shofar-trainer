import { analyzeCalibration } from '../audio/analyze';
import { AudioRecorder } from '../audio/capture';
import { getUnitDuration, setUnitDuration } from '../store/sessions';
import { button, el, speak } from './components';

export interface CalibrateMountOptions {
  onDone: () => void;
}

export function mountCalibrate(root: HTMLElement, options: CalibrateMountOptions): () => void {
  let recorder: AudioRecorder | null = null;
  let recording = false;
  let detectedUnit: number | null = getUnitDuration();

  const container = el('div', 'calibrate-view');
  root.appendChild(container);

  function render(): void {
    container.innerHTML = '';
    container.appendChild(el('h2', '', 'Calibrate'));
    container.appendChild(
      el(
        'p',
        'instructions',
        'Blow one short teruah-style blast (or a few quick staccato notes). The app learns the length of one teruah unit for all timing checks.',
      ),
    );

    const status = el('div', 'calibrate-status');
    if (detectedUnit) {
      status.appendChild(el('p', 'unit-display', `Current unit: ${(detectedUnit * 1000).toFixed(0)} ms`));
    }
    container.appendChild(status);

    const controls = el('div', 'controls');
    const recBtn = button(recording ? 'Stop' : 'Record teruah', recording ? 'btn danger' : 'btn primary');
    const saveBtn = button('Save & continue', 'btn');
    const backBtn = button('Skip for now', 'btn secondary');

    recBtn.addEventListener('click', () => void toggleRecord(status));
    saveBtn.addEventListener('click', () => {
      if (detectedUnit) {
        setUnitDuration(detectedUnit);
        options.onDone();
      }
    });
    saveBtn.disabled = !detectedUnit;
    backBtn.addEventListener('click', options.onDone);

    controls.append(recBtn, saveBtn, backBtn);
    container.appendChild(controls);
  }

  async function toggleRecord(statusEl: HTMLElement): Promise<void> {
    if (!recording) {
      recorder = new AudioRecorder();
      await recorder.start();
      recording = true;
      speak('Teruah');
      render();
      return;
    }

    recording = false;
    const result = recorder!.stop();
    recorder = null;
    detectedUnit = analyzeCalibration(result.samples, result.sampleRate);
    statusEl.innerHTML = '';
    statusEl.appendChild(
      el('p', 'unit-display', `Detected unit: ${(detectedUnit * 1000).toFixed(0)} ms — save to apply`),
    );
    render();
  }

  render();
  return () => container.remove();
}
