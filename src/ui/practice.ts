import { SET_GROUPS } from '../halacha/seder';
import type { SetGroup } from '../halacha/seder';
import { analyzeRecording, type DetailedAnalysisResult } from '../audio/analyze';
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
  let lastAnalysis: DetailedAnalysisResult | null = null;

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
    canvas.height = 160;
    container.appendChild(canvas);

    const legend = el('div', 'waveform-legend');
    legend.innerHTML =
      '<span class="leg-t">T Tekiah</span><span class="leg-sh">Sh Shevarim</span><span class="leg-tr">Tr Teruah</span>';
    container.appendChild(legend);

    const feedback = el('div', 'feedback');
    container.appendChild(feedback);

    if (lastAnalysis) {
      renderAnalysisFeedback(feedback, lastAnalysis);
    }

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
        lastAnalysis = null;
        lastSamples = null;
        render();
      }
    });
    prevBtn.addEventListener('click', () => {
      if (setIndex > 0) {
        setIndex--;
        lastAnalysis = null;
        lastSamples = null;
        render();
      }
    });
    backBtn.addEventListener('click', options.onBack);

    controls.append(recBtn, callBtn, prevBtn, nextBtn, backBtn);
    container.appendChild(controls);

    if (lastSamples && lastAnalysis) {
      renderWaveform(canvas, lastSamples, lastAnalysis);
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
    recorder = null;

    lastAnalysis = analyzeRecording(result.samples, result.sampleRate, unit, set.pattern);
    renderAnalysisFeedback(feedbackEl, lastAnalysis);
    renderWaveform(canvas, result.samples, lastAnalysis);

    saveSession({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      stepId: set.id,
      passed: lastAnalysis.passed,
      tekiahRatio: lastAnalysis.tekiahRatio,
      issues: lastAnalysis.issues,
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
