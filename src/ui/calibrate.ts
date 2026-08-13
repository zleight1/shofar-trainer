import { analyzeCalibration } from '../audio/analyze';
import { AudioRecorder } from '../audio/capture';
import { catalog } from '../i18n/t';
import type { Locale } from '../i18n/locale';
import { getLocale } from '../i18n/locale';
import { getUnitDuration, setUnitDuration } from '../store/sessions';
import { renderAppHeader } from './chrome';
import { button, el, speakAndWait } from './components';
import { attachLiveWaveform } from './live-waveform';

export interface CalibrateMountOptions {
  onDone: () => void;
  onLocale: (next: Locale) => void;
  onBusy?: (busy: boolean) => void;
  onRefreshRegister?: (refresh: () => void) => void;
}

export function mountCalibrate(root: HTMLElement, options: CalibrateMountOptions): () => void {
  let recorder: AudioRecorder | null = null;
  let recording = false;
  let preparing = false;
  let detectedUnit: number | null = getUnitDuration();
  let stopLive: (() => void) | null = null;

  const container = el('div', 'calibrate-view');
  root.appendChild(container);

  function busy(): boolean {
    return recording || preparing;
  }

  function detachLive(): void {
    stopLive?.();
    stopLive = null;
  }

  function render(): void {
    detachLive();
    container.innerHTML = '';
    const locale = getLocale();
    const c = catalog(locale);
    renderAppHeader(container, {
      title: c.calibrateTitle,
      locale,
      onLocale: options.onLocale,
      localeDisabled: busy(),
    });
    container.appendChild(el('p', 'instructions', c.calibrateIntro));

    const canvas = el('canvas', recording ? 'waveform live' : 'waveform');
    canvas.height = 180;
    container.appendChild(canvas);

    if (recording) {
      container.appendChild(el('p', 'live-hint', c.liveHint));
    }

    const status = el('div', 'calibrate-status');
    if (recording) {
      status.appendChild(el('p', 'recording-label', c.recordingNow));
    } else if (preparing) {
      status.appendChild(el('p', 'preparing-label', c.calloutReady));
    } else if (detectedUnit) {
      status.appendChild(el('p', 'unit-display', c.currentUnit({ ms: Math.round(detectedUnit * 1000) })));
    }
    container.appendChild(status);

    const controls = el('div', 'controls');
    const recBtn = button(
      preparing ? c.starting : recording ? c.stop : c.recordTeruah,
      recording ? 'btn danger' : 'btn primary',
    );
    const saveBtn = button(c.saveContinue, 'btn');
    const backBtn = button(c.skipForNow, 'btn secondary');

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
      options.onBusy?.(true);
      render();
      await speakAndWait(catalog(getLocale()).calloutTeruah);
      preparing = false;
      recorder = new AudioRecorder();
      await recorder.start();
      recording = true;
      render();
      return;
    }

    detachLive();
    recording = false;
    options.onBusy?.(false);
    const result = recorder!.stop();
    recorder = null;
    detectedUnit = analyzeCalibration(result.samples, result.sampleRate);
    render();
  }

  render();
  options.onRefreshRegister?.(render);
  return () => {
    detachLive();
    if (recording && recorder) {
      recorder.stop();
    }
    options.onBusy?.(false);
    container.remove();
  };
}
