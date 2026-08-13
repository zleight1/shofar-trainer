import { SET_GROUPS } from '../halacha/seder';
import type { SetGroup } from '../halacha/seder';
import { CALIBRATION_SET, guidedStepsForSet } from '../halacha/guided-steps';
import type { GuidedBlastStep } from '../halacha/guided-steps';
import { expectedDurationForType } from '../halacha/duration-targets';
import { liveTimingState, type LiveTimingState } from '../halacha/live-timing';
import { scoreRecording } from '../halacha/rules';
import type { BlastType, ClassifiedBlast } from '../halacha/types';
import { analyzeSingleBlast, buildGuidedSetAnalysis, inferUnitFromBlasts } from '../audio/analyze-blast';
import { waitForBlastEnd } from '../audio/auto-stop';
import { SessionRecorder } from '../audio/session-recorder';
import { getUnitDuration, saveSession, setUnitDuration } from '../store/sessions';
import { blastLabel, calloutForType, catalog, formatLiveLine } from '../i18n/t';
import { getLocale } from '../i18n/locale';
import { loadVoices, shouldSpeakCallouts } from '../i18n/speech';
import {
  button,
  el,
  renderAnalysisFeedback,
  renderWaveform,
  speakAndWait,
} from './components';
import { renderAppHeader, renderDisclaimer } from './chrome';
import { attachLiveWaveform } from './live-waveform';
import type { DetailedAnalysisResult } from '../audio/analyze';

export interface PracticeMountOptions {
  onBack: () => void;
  onLocale: () => void;
  onBusy?: (busy: boolean) => void;
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
  let heVoiceNotice = false;

  const container = el('div', 'practice-view');
  root.appendChild(container);

  function localeBusy(): boolean {
    return running || (phase !== 'idle' && phase !== 'set_review' && phase !== 'done');
  }

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

  function setLabel(set: SetGroup): string {
    const c = catalog(getLocale());
    const n = Number(set.id.match(/(\d+)/)?.[1] ?? 1);
    switch (set.pattern) {
      case 'tst':
        return set.id.startsWith('calibration') ? c.setCalibration : c.setTst({ n });
      case 'tsh':
        return c.setTsh({ n });
      case 'tt':
        return c.setTt({ n });
      case 'gedolah':
        return c.setGedolah;
      default: {
        const _exhaustive: never = set.pattern;
        return _exhaustive;
      }
    }
  }

  function render(): void {
    detachLive();
    container.innerHTML = '';
    const locale = getLocale();
    const c = catalog(locale);

    renderAppHeader(container, {
      title: c.practiceTitle,
      locale,
      onLocale: options.onLocale,
      localeDisabled: localeBusy() && phase !== 'set_review' && phase !== 'done' && phase !== 'idle',
    });

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

    container.appendChild(el('p', 'subtitle', phaseSubtitle()));

    if (phase === 'calibration') {
      container.appendChild(el('p', 'calibration-intro', c.calibrationIntro));
    }

    const setCard = el('div', 'set-card');
    setCard.appendChild(el('h3', '', setLabel(set)));
    setCard.appendChild(el('div', 'step-dots', renderStepDots(steps, stepIndex)));
    container.appendChild(setCard);

    const callout = el('div', running ? 'callout recording' : 'callout preparing');
    callout.textContent = running
      ? step
        ? c.blow({ callout: calloutForType(step.type, locale) })
        : '…'
      : phase === 'set_review'
        ? c.setComplete
        : c.listen;
    container.appendChild(callout);

    const timingEl = el('div', 'live-timing');
    if (currentTiming) {
      timingEl.textContent = formatLiveLine(currentTiming, locale);
      timingEl.className = `live-timing status-${currentTiming.status}`;
    }
    container.appendChild(timingEl);

    const canvas = el('canvas', 'waveform live');
    canvas.height = 220;
    container.appendChild(canvas);

    const feedback = el('div', 'feedback');
    container.appendChild(feedback);

    if (lastAnalysis && phase === 'set_review') {
      renderAnalysisFeedback(feedback, lastAnalysis, locale);
      renderBlastSummary(feedback, setBlasts);
      if (lastSamples) renderWaveform(canvas, lastSamples, lastAnalysis);
    }

    if (unitSec > 0) {
      container.appendChild(el('p', 'unit-badge', c.teruahUnit({ ms: Math.round(unitSec * 1000) })));
    }

    const controls = el('div', 'controls');
    if (phase === 'set_review') {
      const nextBtn = button(
        setIndex >= SET_GROUPS.length - 1 ? c.finish : c.nextSet,
        'btn primary',
      );
      nextBtn.addEventListener('click', () => void advanceAfterSet());
      controls.appendChild(nextBtn);
    } else if (!running) {
      const stopBtn = button(c.stopSession, 'btn secondary');
      stopBtn.addEventListener('click', () => {
        abortSession = true;
        void teardownAndBack();
      });
      controls.appendChild(stopBtn);
    }
    const exitBtn = button(c.exit, 'btn secondary');
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
    const locale = getLocale();
    const c = catalog(locale);
    renderDisclaimer(container, locale);
    container.appendChild(el('p', 'instructions', c.practiceIntro));
    if (heVoiceNotice) {
      container.appendChild(el('p', 'speech-notice', c.speechHeMissing));
    }
    const startBtn = button(c.startGuided, 'btn primary');
    startBtn.addEventListener('click', () => void startSession());
    container.appendChild(startBtn);
    const backBtn = button(c.back, 'btn secondary');
    backBtn.addEventListener('click', options.onBack);
    container.appendChild(backBtn);
  }

  function renderDone(): void {
    const locale = getLocale();
    const c = catalog(locale);
    renderDisclaimer(container, locale);
    container.appendChild(el('p', '', c.sessionComplete));
    const backBtn = button(c.backHome, 'btn primary');
    backBtn.addEventListener('click', options.onBack);
    container.appendChild(backBtn);
  }

  function phaseSubtitle(): string {
    const c = catalog(getLocale());
    if (phase === 'calibration') return c.calibrationSubtitle;
    if (phase === 'set_review') {
      return c.setReviewSubtitle({ n: setIndex + 1, total: SET_GROUPS.length });
    }
    return c.setProgressSubtitle({
      n: setIndex + 1,
      total: SET_GROUPS.length,
      blast: stepIndex + 1,
      blasts: currentSteps().length,
    });
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
    options.onBusy?.(true);
    const voices = await loadVoices();
    heVoiceNotice = getLocale() === 'he' && !shouldSpeakCallouts('he', voices);
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
    await speakAndWait(catalog(getLocale()).calibrateCompleteSpeech);
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
    const scored = scoreRecording(classified, unitSec, set.pattern);
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
      scoringRegime: 'per-tekiah-mb',
    });

    running = false;
    options.onBusy?.(false);
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

    await speakAndWait(calloutForType(step.type, getLocale()));

    running = true;
    options.onBusy?.(true);
    render();

    session.beginCapture();
    const pattern = currentSet().pattern;
    const autoStopOpts = autoStopOptionsForType(step.type, pattern, middleSoFar, isClosingTekiah);

    let latestTickPhase: 'waiting_for_sound' | 'sounding' | 'trailing_silence' = 'waiting_for_sound';
    const timingCtx = {
      unitSec,
      pattern,
      middleDurationSec: middleSoFar,
      isClosingTekiah,
    };

    const { promise, cancel } = waitForBlastEnd(() => session.getAnalyser(), {
      ...autoStopOpts,
      onTick: (tick) => {
        latestTickPhase = tick.phase;
        currentTiming = liveTimingState(step.type, tick.elapsedSec, timingCtx, tick.phase);
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
      timingCtx,
      blastDuration > 0.1 ? 'sounding' : latestTickPhase,
    );
    render();
    await delay(450);

    return analyzeSingleBlast(recording, unitSec, step.type);
  }

  function autoStopOptionsForType(
    type: BlastType,
    pattern: SetGroup['pattern'],
    middleSoFar: number,
    isClosingTekiah: boolean,
  ) {
    const band = expectedDurationForType(type, unitSec, pattern, middleSoFar, isClosingTekiah);
    const silenceMs =
      type === 'teruah' ? 450 : type === 'shevarim' ? 650 : type === 'tekiah_gedolah' ? 900 : 600;
    return { silenceMs, maxDurationSec: band.safetyAutoStopSec };
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
    options.onBusy?.(true);
    render();
    await delay(600);
    await runCurrentSet();
  }

  async function teardownAndBack(): Promise<void> {
    abortSession = true;
    detachLive();
    session.close();
    options.onBusy?.(false);
    options.onBack();
  }

  function renderBlastSummary(target: HTMLElement, blasts: ClassifiedBlast[]): void {
    const locale = getLocale();
    const c = catalog(locale);
    const ul = el('ul', 'blast-summary');
    for (const b of blasts) {
      const li = el(
        'li',
        '',
        c.blastDuration({
          label: blastLabel(b.type, locale),
          sec: b.totalDurationSec.toFixed(1),
        }),
      );
      ul.appendChild(li);
    }
    target.appendChild(ul);
  }

  void loadVoices().then((voices) => {
    heVoiceNotice = getLocale() === 'he' && !shouldSpeakCallouts('he', voices);
    if (phase === 'idle') render();
  });

  render();

  return () => {
    abortSession = true;
    detachLive();
    session.close();
    options.onBusy?.(false);
    container.remove();
  };
}
