import { SET_GROUPS } from '../halacha/seder';
import type { SetGroup } from '../halacha/seder';
import { analyzeRecording } from '../audio/analyze';
import { AudioRecorder } from '../audio/capture';
import { getUnitDuration, saveSession } from '../store/sessions';
import { button, el, renderAnalysisFeedback, renderWaveform, speak } from './components';

export interface PracticeMountOptions {
  onBack: () => void;
}

export function mountPractice(root: HTMLElement, options: PracticeMountOptions): () => void {
  let setIndex = 0;
  let recorder: AudioRecorder | null = null;
  let recording = false;
  let lastSamples: Float32Array | null = null;
  let lastSampleRate = 44100;

  const container = el('div', 'practice-view');
  root.appendChild(container);

  function render(): void {
    container.innerHTML = '';
    const set = SET_GROUPS[setIndex];
    const unit = getUnitDuration();

    const header = el('div', 'practice-header');
    header.appendChild(el('h2', '', 'Practice'));
    header.appendChild(el('p', 'subtitle', `Set ${setIndex + 1} of ${SET_GROUPS.length}`));
    container.appendChild(header);

    if (!unit) {
      const warn = el('p', 'warn', 'Calibrate first to set your teruah unit length.');
      container.appendChild(warn);
      container.appendChild(button('Back', 'btn secondary')).addEventListener('click', options.onBack);
      return;
    }

    const setCard = el('div', 'set-card');
    setCard.appendChild(el('h3', '', set.label));
    const patternHint = el('p', 'pattern-hint', patternDescription(set.pattern));
    setCard.appendChild(patternHint);
    container.appendChild(setCard);

    const callout = el('div', 'callout');
    callout.textContent = `Blow: ${set.label}`;
    container.appendChild(callout);

    const canvas = el('canvas', 'waveform');
    canvas.height = 120;
    container.appendChild(canvas);

    const feedback = el('div', 'feedback');
    container.appendChild(feedback);

    const controls = el('div', 'controls');
    const callBtn = button('Call out', 'btn secondary');
    const recBtn = button(recording ? 'Stop & Analyze' : 'Record set', recording ? 'btn danger' : 'btn primary');
    const nextBtn = button('Next set', 'btn');
    const prevBtn = button('Previous', 'btn secondary');
    const backBtn = button('Back', 'btn secondary');

    callBtn.addEventListener('click', () => speak(set.label));
    recBtn.addEventListener('click', () => void toggleRecord(set, feedback, canvas));
    nextBtn.addEventListener('click', () => {
      if (setIndex < SET_GROUPS.length - 1) {
        setIndex++;
        render();
      }
    });
    prevBtn.addEventListener('click', () => {
      if (setIndex > 0) {
        setIndex--;
        render();
      }
    });
    backBtn.addEventListener('click', options.onBack);

    controls.append(recBtn, callBtn, prevBtn, nextBtn, backBtn);
    container.appendChild(controls);

    if (lastSamples) {
      const allSegments = analyzeRecording(lastSamples, lastSampleRate, unit, set.pattern).classified.flatMap(
        (c) => c.segments,
      );
      renderWaveform(canvas, lastSamples, allSegments);
    }
  }

  async function toggleRecord(
    set: SetGroup,
    feedbackEl: HTMLElement,
    canvas: HTMLCanvasElement,
  ): Promise<void> {
    const unit = getUnitDuration();
    if (!unit) return;

    if (!recording) {
      recorder = new AudioRecorder();
      await recorder.start();
      recording = true;
      speak(set.label);
      render();
      return;
    }

    recording = false;
    const result = recorder!.stop();
    lastSamples = result.samples;
    lastSampleRate = result.sampleRate;
    recorder = null;

    const analysis = analyzeRecording(result.samples, result.sampleRate, unit, set.pattern);
    renderAnalysisFeedback(feedbackEl, analysis);

    const allSegments = analysis.classified.flatMap((c) => c.segments);
    renderWaveform(canvas, result.samples, allSegments);

    saveSession({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      stepId: set.id,
      passed: analysis.passed,
      tekiahRatio: analysis.tekiahRatio,
      issues: analysis.issues,
      unitDurationSec: unit,
    });

    render();
  }

  render();
  return () => container.remove();
}

function patternDescription(pattern: SetGroup['pattern']): string {
  switch (pattern) {
    case 'tst':
      return 'Tekiah — Shevarim — Teruah — Tekiah (tekiah must equal shevarim + teruah)';
    case 'tsh':
      return 'Tekiah — Shevarim — Tekiah (tekiah must equal shevarim)';
    case 'tt':
      return 'Tekiah — Teruah — Tekiah (tekiah must equal teruah)';
    case 'gedolah':
      return 'One long tekiah gedolah';
    default: {
      const _exhaustive: never = pattern;
      return _exhaustive;
    }
  }
}
