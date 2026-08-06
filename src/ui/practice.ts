import { SET_GROUPS } from '../halacha/seder';
import type { SetGroup } from '../halacha/seder';
import { CALIBRATION_SET, guidedStepsForSet } from '../halacha/guided-steps';
import type { GuidedBlastStep } from '../halacha/guided-steps';
import { liveTimingState, type LiveTimingState } from '../halacha/live-timing';
import { scoreRecording } from '../halacha/rules';
import type { BlastType, ClassifiedBlast } from '../halacha/types';
import { analyzeSingleBlast, buildGuidedSetAnalysis, inferUnitFromBlasts } from '../audio/analyze-blast';
import { waitForBlastEnd } from '../audio/auto-stop';
import { SessionRecorder } from '../audio/session-recorder';
import { getUnitDuration, saveSession, setUnitDuration } from '../store/sessions';
import {
  button,
  el,
  renderAnalysisFeedback,
  renderWaveform,
  speakAndWait,
} from './components';
import { attachLiveWaveform } from './live-waveform';
import type { DetailedAnalysisResult } from '../audio/analyze';

export interface PracticeMountOptions {
  onBack: () => void;
}

type SessionPhase = 'idle' | 'calibration' | 'set' | 'set_review' | 'done';

export function mountPractice(root: HTMLElement, options: PracticeMountOptions): () => void {
  const session = new SessionRecorder();
  let phase: SessionPhase = 'idle';
  let setIndex = 0;
  let stepIndex = 0;
  let unitSec = getUnitDuration() ?? 0.1;
  let middleDurationSec = 0;
  let setBlasts: ClassifiedBlast[] = [];
  let lastAnalysis: DetailedAnalysisResult | null = null;
  let lastSamples: Float32Array | null = null;
  let currentTiming: LiveTimingState | null = null;
  let stopLive: (() => void) | null = null;
  let abortSession = false;
  let running = false;

  const container = el('div', 'practice-view');
  root.appendChild(container);

  function detachLive(): void {
    stopLive?.();
    stopLive = null;
    currentTiming = null;
  }

  function delay(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  function currentSet(): SetGroup {
    if (phase === 'calibration') return CALIBRATION_SET;
    return SET_GROUPS[setIndex];
  }

  function currentSteps(): GuidedBlastStep[] {
    return guidedStepsForSet(currentSet());
  }

  function render(): void {
    detachLive();
    container.innerHTML = '';

    const header = el('div', 'practice-header');
    header.appendChild(el('h2', '', 'Guided Practice'));
    container.appendChild(header);

    if (phase === 'idle') {
      renderIdle();
      return;
    }

    if (phase === 'done') {
      renderDone();
      return;
    }

    const set = currentSet();
    const steps = currentSteps();
    const step = steps[stepIndex];

    const subtitle = el('p', 'subtitle', phaseSubtitle());
    container.appendChild(subtitle);

    if (phase === 'calibration') {
      container.appendChild(
        el(
          'p',
          'calibration-intro',
          'First, blow one tashrat (Tekiah · Shevarim · Teruah · Tekiah). The app learns your timing from this.',
        ),
      );
    }

    const setCard = el('div', 'set-card');
    setCard.appendChild(el('h3', '', set.label));
    setCard.appendChild(el('div', 'step-dots', renderStepDots(steps, stepIndex)));
    container.appendChild(setCard);

    const callout = el('div', running ? 'callout recording' : 'callout preparing');
    callout.textContent = running
      ? step
        ? `Blow: ${step.callout}`
        : '…'
      : phase === 'set_review'
        ? 'Set complete'
        : 'Listen…';
    container.appendChild(callout);

    const timingEl = el('div', 'live-timing');
    if (currentTiming) {
      timingEl.textContent = currentTiming.message;
      timingEl.className = `live-timing status-${currentTiming.status}`;
    }
    container.appendChild(timingEl);

    const canvas = el('canvas', 'waveform live');
    canvas.height = 220;
    container.appendChild(canvas);

    const feedback = el('div', 'feedback');
    container.appendChild(feedback);

    if (lastAnalysis && phase === 'set_review') {
      renderAnalysisFeedback(feedback, lastAnalysis);
      renderBlastSummary(feedback, setBlasts);
      if (lastSamples) renderWaveform(canvas, lastSamples, lastAnalysis);
    }

    if (unitSec > 0) {
      container.appendChild(
        el('p', 'unit-badge', `Teruah unit: ${(unitSec * 1000).toFixed(0)} ms`),
      );
    }

    const controls = el('div', 'controls');
    if (phase === 'set_review') {
      const nextBtn = button(setIndex >= SET_GROUPS.length - 1 ? 'Finish' : 'Next set', 'btn primary');
      nextBtn.addEventListener('click', () => void advanceAfterSet());
      controls.appendChild(nextBtn);
    } else if (!running) {
      const stopBtn = button('Stop session', 'btn secondary');
      stopBtn.addEventListener('click', () => {
        abortSession = true;
        void teardownAndBack();
      });
      controls.appendChild(stopBtn);
    }
    const exitBtn = button('Exit', 'btn secondary');
    exitBtn.addEventListener('click', () => void teardownAndBack());
    controls.appendChild(exitBtn);
    container.appendChild(controls);

    if (running && session.isOpen()) {
      stopLive = attachLiveWaveform(canvas, () => session.getAnalyser(), {
        getTiming: () => currentTiming,
      });
    }
  }

  function renderIdle(): void {
    container.appendChild(
      el(
        'p',
        'instructions',
        'Makrei-style practice: the app calls each blast, records automatically, and gives live length feedback. Starts with a calibration tashrat.',
      ),
    );
    const startBtn = button('Start guided session', 'btn primary');
    startBtn.addEventListener('click', () => void startSession());
    container.appendChild(startBtn);
    const backBtn = button('Back', 'btn secondary');
    backBtn.addEventListener('click', options.onBack);
    container.appendChild(backBtn);
  }

  function renderDone(): void {
    container.appendChild(el('p', '', 'Session complete. Well done.'));
    const backBtn = button('Back to home', 'btn primary');
    backBtn.addEventListener('click', options.onBack);
    container.appendChild(backBtn);
  }

  function phaseSubtitle(): string {
    if (phase === 'calibration') return 'Calibration — tashrat';
    if (phase === 'set_review') return `Set ${setIndex + 1} of ${SET_GROUPS.length} — review`;
    return `Set ${setIndex + 1} of ${SET_GROUPS.length} · blast ${stepIndex + 1} of ${currentSteps().length}`;
  }

  function renderStepDots(steps: GuidedBlastStep[], active: number): string {
    const labels: Record<string, string> = {
      tekiah: 'T',
      shevarim: 'Sh',
      teruah: 'Tr',
      tekiah_gedolah: 'T↑',
      shevarim_teruah: 'Sh+Tr',
    };
    return steps
      .map((s, i) => {
        const cls = i < active ? 'done' : i === active ? 'active' : '';
        return `<span class="dot ${cls}">${labels[s.type] ?? '?'}</span>`;
      })
      .join('');
  }

  async function startSession(): Promise<void> {
    abortSession = false;
    setIndex = 0;
    stepIndex = 0;
    setBlasts = [];
    middleDurationSec = 0;
    phase = 'calibration';
    await session.openMic();
    render();
    await runCalibration();
  }

  async function runCalibration(): Promise<void> {
    const steps = guidedStepsForSet(CALIBRATION_SET);
    const blasts: ClassifiedBlast[] = [];
    middleDurationSec = 0;

    for (let i = 0; i < steps.length; i++) {
      if (abortSession) return;
      stepIndex = i;
      const blast = await runGuidedBlast(steps[i], middleDurationSec, i === steps.length - 1);
      blasts.push(blast);
      middleDurationSec += middleContribution(blast.type, blast.totalDurationSec);
    }

    unitSec = inferUnitFromBlasts(blasts, unitSec);
    setUnitDuration(unitSec);
    running = false;
    phase = 'set';
    stepIndex = 0;
    setBlasts = [];
    middleDurationSec = 0;
    render();
    await delay(800);
    await speakAndWait('Calibration complete. Starting practice sets.');
    await runCurrentSet();
  }

  async function runCurrentSet(): Promise<void> {
    const set = SET_GROUPS[setIndex];
    const steps = guidedStepsForSet(set);
    setBlasts = [];
    middleDurationSec = 0;

    for (let i = 0; i < steps.length; i++) {
      if (abortSession) return;
      stepIndex = i;
      const isClosing = steps[i].type === 'tekiah' && i === steps.length - 1 && steps.length > 1;
      const blast = await runGuidedBlast(steps[i], middleDurationSec, isClosing);
      setBlasts.push(blast);
      middleDurationSec += middleContribution(blast.type, blast.totalDurationSec);
    }

    const classified = [...setBlasts];
    const scored = scoreRecording(classified, unitSec);
    lastAnalysis = buildGuidedSetAnalysis(classified, scored);
    lastSamples = concatClassifiedPreview(classified);

    saveSession({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      stepId: set.id,
      passed: scored.passed,
      tekiahRatio: scored.tekiahRatio,
      issues: scored.issues,
      unitDurationSec: unitSec,
    });

    running = false;
    phase = 'set_review';
    render();
  }

  function concatClassifiedPreview(blasts: ClassifiedBlast[]): Float32Array {
    const total = blasts.reduce((s, b) => s + Math.max(b.totalDurationSec, 0.01), 0);
    const len = Math.floor(total * 200);
    const out = new Float32Array(len);
    let offset = 0;
    for (const b of blasts) {
      const n = Math.floor(Math.max(b.totalDurationSec, 0.01) * 200);
      for (let i = 0; i < n && offset < len; i++, offset++) {
        out[offset] = 0.3 * Math.sin((offset / n) * Math.PI);
      }
    }
    return out;
  }

  async function runGuidedBlast(
    step: GuidedBlastStep,
    middleSoFar: number,
    isClosingTekiah: boolean,
  ): Promise<ClassifiedBlast> {
    running = false;
    currentTiming = null;
    render();

    await speakAndWait(step.callout);

    running = true;
    render();

    session.beginCapture();
    const autoStopOpts = autoStopOptionsForType(step.type);

    let latestTickPhase: 'waiting_for_sound' | 'sounding' | 'trailing_silence' = 'waiting_for_sound';

    const { promise, cancel } = waitForBlastEnd(() => session.getAnalyser(), {
      ...autoStopOpts,
      onTick: (tick) => {
        latestTickPhase = tick.phase;
        currentTiming = liveTimingState(
          step.type,
          tick.elapsedSec,
          {
            unitSec,
            middleDurationSec: middleSoFar,
            isClosingTekiah,
          },
          tick.phase,
        );
      },
    });

    const abortWatcher = new Promise<void>((resolve) => {
      const id = setInterval(() => {
        if (abortSession) {
          cancel();
          clearInterval(id);
          resolve();
        }
      }, 100);
    });

    await Promise.race([promise, abortWatcher]);
    const recording = session.endCapture();
    const blastDuration = recording.durationSec;
    running = false;
    currentTiming = liveTimingState(
      step.type,
      blastDuration,
      { unitSec, middleDurationSec: middleSoFar, isClosingTekiah },
      blastDuration > 0.1 ? 'sounding' : latestTickPhase,
    );
    render();
    await delay(450);

    return analyzeSingleBlast(recording, unitSec, step.type);
  }

  function autoStopOptionsForType(type: BlastType) {
    switch (type) {
      case 'teruah':
        return { silenceMs: 450, maxDurationSec: 10 };
      case 'shevarim':
        return { silenceMs: 650, maxDurationSec: 12 };
      case 'tekiah_gedolah':
        return { silenceMs: 900, maxDurationSec: 25 };
      default:
        return { silenceMs: 600, maxDurationSec: 15 };
    }
  }

  function middleContribution(type: BlastType, durationSec: number): number {
    if (type === 'shevarim' || type === 'teruah' || type === 'shevarim_teruah') {
      return durationSec;
    }
    return 0;
  }

  async function advanceAfterSet(): Promise<void> {
    if (setIndex >= SET_GROUPS.length - 1) {
      phase = 'done';
      render();
      session.close();
      return;
    }
    setIndex++;
    stepIndex = 0;
    phase = 'set';
    lastAnalysis = null;
    render();
    await delay(600);
    await runCurrentSet();
  }

  async function teardownAndBack(): Promise<void> {
    abortSession = true;
    detachLive();
    session.close();
    options.onBack();
  }

  function renderBlastSummary(container: HTMLElement, blasts: ClassifiedBlast[]): void {
    const ul = el('ul', 'blast-summary');
    const labels: Record<string, string> = {
      tekiah: 'Tekiah',
      shevarim: 'Shevarim',
      teruah: 'Teruah',
      tekiah_gedolah: 'Tekiah Gedolah',
    };
    for (const b of blasts) {
      const li = el('li', '', `${labels[b.type] ?? b.type}: ${b.totalDurationSec.toFixed(1)}s`);
      ul.appendChild(li);
    }
    container.appendChild(ul);
  }

  render();

  return () => {
    abortSession = true;
    detachLive();
    session.close();
    container.remove();
  };
}
