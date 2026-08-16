import {
  SET_GROUPS,
  kolCountForSet,
  kolosBeforeIndex,
  indexInSectionPattern,
  totalKolos,
} from '../halacha/seder';
import type { SetGroup } from '../halacha/seder';
import {
  autoAdvanceDelayMs,
  canGoToPreviousSet,
  reviewPacing,
} from '../halacha/live-pacing';
import { CALIBRATION_SET, guidedStepsForSet } from '../halacha/guided-steps';
import type { GuidedBlastStep } from '../halacha/guided-steps';
import { expectedDurationForType } from '../halacha/duration-targets';
import { liveTimingState, type LiveTimingState } from '../halacha/live-timing';
import { scoreRecording } from '../halacha/rules';
import type { BlastType, ClassifiedBlast } from '../halacha/types';
import { analyzeSingleBlast, buildGuidedSetAnalysis, inferUnitFromBlasts } from '../audio/analyze-blast';
import {
  autoStopOptionsForBlast,
  waitForBlastEnd,
  type AutoStopResult,
} from '../audio/auto-stop';
import { SessionRecorder } from '../audio/session-recorder';
import { getUnitDuration, saveSession, setUnitDuration } from '../store/sessions';
import { isDiagnosticsEnabled } from '../store/diagnostics';
import { isLiveSessionEnabled, setLiveSessionEnabled } from '../store/live-session';
import { calloutForType, catalog, formatLiveLine } from '../i18n/t';
import type { Locale } from '../i18n/locale';
import { getLocale } from '../i18n/locale';
import { clipIdForBlast, setCalloutGate, speakCallout, unlockCallouts } from '../audio/callout-player';
import { button, el, renderAnalysisFeedback } from './components';
import { renderDiagnosticsToggle, renderDisclaimer } from './chrome';
import { attachLiveWaveform } from './live-waveform';
import { BLAST_ABBREV, renderSetTimeline } from './set-timeline';
import { renderDiagnosticsPanel, type BlastAudioClip } from './diagnostics-panel';
import { shouldCommitBlast } from './practice-run';
import type { DetailedAnalysisResult } from '../audio/analyze';

export interface PracticeMountOptions {
  onBack: () => void;
  onLocale: (next: Locale) => void;
  onBusy?: (busy: boolean) => void;
  onSessionLock?: (locked: boolean) => void;
  onRefreshRegister?: (refresh: () => void) => void;
}

type SessionPhase = 'idle' | 'calibration' | 'set' | 'set_review' | 'done';

const SILENCE_MS: Record<BlastType, number> = {
  teruah: 450,
  shevarim: 650,
  shevarim_teruah: 650,
  tekiah_gedolah: 900,
  tekiah: 600,
};

export function mountPractice(root: HTMLElement, options: PracticeMountOptions): () => void {
  const session = new SessionRecorder();
  let phase: SessionPhase = 'idle';
  let setIndex = 0;
  let stepIndex = 0;
  let unitSec = getUnitDuration() ?? 0.1;
  let middleDurationSec = 0;
  let setBlasts: ClassifiedBlast[] = [];
  let setAudio: BlastAudioClip[] = [];
  let lastAnalysis: DetailedAnalysisResult | null = null;
  let currentTiming: LiveTimingState | null = null;
  let stopLive: (() => void) | null = null;
  let abortSession = false;
  let running = false;
  let mounted = true;
  let setGeneration = 0;
  let cancelCurrentBlast: (() => void) | null = null;
  let setLoopActive = false;
  let launchToken = 0;
  let liveSession = isLiveSessionEnabled();
  let leavingReview = false;
  let autoAdvanceTimer: ReturnType<typeof setTimeout> | null = null;

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

  function prefersReducedMotion(): boolean {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function cancelAutoAdvance(): void {
    if (autoAdvanceTimer !== null) {
      clearTimeout(autoAdvanceTimer);
      autoAdvanceTimer = null;
    }
  }

  function currentReviewPacing(): ReturnType<typeof reviewPacing> {
    return reviewPacing({
      liveSession,
      setIndex,
      passed: lastAnalysis?.passed ?? false,
    });
  }

  function scheduleAutoAdvanceIfNeeded(): void {
    cancelAutoAdvance();
    if (phase !== 'set_review' || currentReviewPacing() !== 'auto') return;
    autoAdvanceTimer = setTimeout(() => {
      autoAdvanceTimer = null;
      void advanceAfterSet();
    }, autoAdvanceDelayMs(prefersReducedMotion()));
  }

  function beginLeaveReview(): boolean {
    if (phase !== 'set_review' || leavingReview) return false;
    leavingReview = true;
    cancelAutoAdvance();
    return true;
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
    if (set.section === 'calibration') return c.setCalibration;
    const { n, of } = indexInSectionPattern(set);
    return c.setLine({
      section: sectionName(set.section, c),
      pattern: patternName(set, c),
      n,
      of,
    });
  }

  function sectionName(
    section: SetGroup['section'],
    c: ReturnType<typeof catalog>,
  ): string {
    switch (section) {
      case 'calibration':
        return c.setCalibration;
      case 'sitting':
        return c.sectionSitting;
      case 'malchuyot':
        return c.sectionMalchuyot;
      case 'zichronot':
        return c.sectionZichronot;
      case 'shofarot':
        return c.sectionShofarot;
      case 'afterMusaf':
        return c.sectionAfterMusaf;
      default: {
        const _exhaustive: never = section;
        return _exhaustive;
      }
    }
  }

  function patternName(set: SetGroup, c: ReturnType<typeof catalog>): string {
    switch (set.pattern) {
      case 'tst':
        return c.patternTst;
      case 'tsh':
        return c.patternTsh;
      case 'tt':
        return set.closingGedolah ? c.patternTtGedolah : c.patternTt;
      case 'gedolah':
        return c.setGedolah;
      default: {
        const _exhaustive: never = set.pattern;
        return _exhaustive;
      }
    }
  }

  function visibleCallout(step: GuidedBlastStep, locale: Locale): string {
    const type = step.skipVoice ? step.type : step.callout;
    return calloutForType(type, locale);
  }

  function render(): void {
    detachLive();
    container.innerHTML = '';
    const locale = getLocale();
    const c = catalog(locale);

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
    setCard.appendChild(renderStepDots(steps, phase === 'set_review' ? steps.length : stepIndex));
    container.appendChild(setCard);

    if (phase !== 'set_review') {
      const stage = el('div', 'live-stage');
      const callout = el('div', running ? 'callout recording' : 'callout preparing');
      if (!step) {
        callout.textContent = '…';
      } else if (running) {
        callout.textContent = c.blow({ callout: visibleCallout(step, locale) });
      } else {
        callout.textContent = visibleCallout(step, locale);
      }
      stage.appendChild(callout);

      const meta = el('div', 'live-meta');
      if (step?.breath === 'none') {
        meta.appendChild(el('p', 'breath-cue none', c.breathNone));
      } else if (step?.breath === 'between') {
        meta.appendChild(el('p', 'breath-cue between', c.breathBetween));
      }

      const timingEl = el('div', 'live-timing');
      if (currentTiming) {
        timingEl.textContent = formatLiveLine(currentTiming, locale);
        timingEl.className = `live-timing status-${currentTiming.status}`;
      }
      meta.appendChild(timingEl);
      stage.appendChild(meta);

      const canvas = el('canvas', 'waveform live');
      canvas.height = 220;
      stage.appendChild(canvas);
      container.appendChild(stage);
      if (running && session.isOpen()) {
        stopLive = attachLiveWaveform(canvas, () => session.getAnalyser(), {
          getTiming: () => currentTiming,
        });
      }
    }

    if (lastAnalysis && phase === 'set_review') {
      renderSetTimeline(
        container,
        setBlasts,
        lastAnalysis.issues,
        lastAnalysis.passed,
        unitSec,
        set.pattern,
        locale,
      );
      const feedback = el('div', 'feedback');
      container.appendChild(feedback);
      renderAnalysisFeedback(feedback, lastAnalysis, locale, {
        showStatus: false,
        showNotes: false,
        showDetected: false,
      });
      if (isDiagnosticsEnabled()) {
        renderDiagnosticsPanel(container, setBlasts, setAudio, locale, () => render());
      }
    }

    if (unitSec > 0) {
      container.appendChild(el('p', 'unit-badge', c.teruahUnit({ ms: Math.round(unitSec * 1000) })));
    }

    const controls = el('div', 'controls');
    const redoBtn = button(c.redoSet, 'btn secondary');
    redoBtn.addEventListener('click', () => void requestRedoSet());
    if (phase === 'set_review') {
      const pacing = currentReviewPacing();
      container.appendChild(
        el('p', 'live-pacing-note', pacing === 'auto' ? c.liveContinuing : c.livePaused),
      );
      const nextBtn = button(
        setIndex >= SET_GROUPS.length - 1 ? c.finish : c.nextSet,
        'btn primary',
      );
      nextBtn.addEventListener('click', () => void advanceAfterSet());
      controls.appendChild(nextBtn);
      controls.appendChild(redoBtn);
      if (canGoToPreviousSet(setIndex)) {
        const prevBtn = button(c.previousSet, 'btn secondary');
        prevBtn.addEventListener('click', () => void goToPreviousSet());
        controls.appendChild(prevBtn);
      }
    } else if (phase === 'set' || phase === 'calibration') {
      controls.appendChild(redoBtn);
      if (!running) {
        const stopBtn = button(c.stopSession, 'btn secondary');
        stopBtn.addEventListener('click', () => {
          abortSession = true;
          void teardownAndBack();
        });
        controls.appendChild(stopBtn);
      }
    }
    const exitBtn = button(c.exit, 'btn secondary');
    exitBtn.addEventListener('click', () => void teardownAndBack());
    controls.appendChild(exitBtn);
    container.appendChild(controls);
  }

  function renderIdle(): void {
    const locale = getLocale();
    const c = catalog(locale);
    const unit = getUnitDuration();
    const hero = el('div', 'hero');
    hero.appendChild(el('p', 'eyebrow', c.appTitle));
    hero.appendChild(el('p', 'tagline', c.tagline));
    container.appendChild(hero);
    renderDisclaimer(container, locale);
    if (unit) {
      container.appendChild(el('p', 'unit-badge', c.lastUnit({ ms: Math.round(unit * 1000) })));
    }
    container.appendChild(el('p', 'instructions', c.practiceIntro));
    const liveToggle = el('label', 'live-toggle');
    const liveBox = el('input');
    liveBox.type = 'checkbox';
    liveBox.checked = isLiveSessionEnabled();
    liveBox.setAttribute('aria-describedby', 'live-session-hint');
    liveBox.addEventListener('change', () => {
      setLiveSessionEnabled(liveBox.checked);
      liveSession = liveBox.checked;
    });
    liveToggle.appendChild(liveBox);
    liveToggle.appendChild(document.createTextNode(c.liveSessionToggle));
    container.appendChild(liveToggle);
    const liveHint = el('p', 'diagnostics-muted', c.liveSessionHint);
    liveHint.id = 'live-session-hint';
    container.appendChild(liveHint);
    const startBtn = button(c.startGuided, 'btn primary btn-block');
    startBtn.addEventListener('click', () => {
      unlockCallouts();
      void startSession();
    });
    container.appendChild(startBtn);
    renderDiagnosticsToggle(container, locale);
  }

  function renderDone(): void {
    const locale = getLocale();
    const c = catalog(locale);
    options.onSessionLock?.(false);
    renderDisclaimer(container, locale);
    container.appendChild(el('p', 'session-complete', c.sessionComplete));
    const backBtn = button(c.backHome, 'btn primary btn-block');
    backBtn.addEventListener('click', options.onBack);
    container.appendChild(backBtn);
  }

  function phaseSubtitle(): string {
    const c = catalog(getLocale());
    if (phase === 'calibration') return c.calibrationSubtitle;
    const set = currentSet();
    const kolos = kolosBeforeIndex(setIndex);
    const total = totalKolos();
    if (phase === 'set_review') {
      return c.setReviewSubtitle({
        section: sectionName(set.section, c),
        n: setIndex + 1,
        total: SET_GROUPS.length,
        kolos: kolos + kolCountForSet(set),
        totalKolos: total,
      });
    }
    return c.setProgressSubtitle({
      section: sectionName(set.section, c),
      n: setIndex + 1,
      total: SET_GROUPS.length,
      blast: stepIndex + 1,
      blasts: currentSteps().length,
      kolos,
      totalKolos: total,
    });
  }

  function renderStepDots(steps: GuidedBlastStep[], active: number): HTMLDivElement {
    const row = el('div', 'step-dots');
    for (let i = 0; i < steps.length; i++) {
      const cls = i < active ? 'done' : i === active ? 'active' : '';
      row.appendChild(el('span', cls ? `dot ${cls}` : 'dot', BLAST_ABBREV[steps[i].type] ?? '?'));
    }
    return row;
  }

  async function startSession(): Promise<void> {
    abortSession = false;
    liveSession = isLiveSessionEnabled();
    leavingReview = false;
    cancelAutoAdvance();
    setGeneration = 0;
    setIndex = 0;
    stepIndex = 0;
    setBlasts = [];
    setAudio = [];
    middleDurationSec = 0;
    phase = 'calibration';
    options.onSessionLock?.(true);
    options.onBusy?.(true);
    try {
      await session.openMic();
    } catch {
      options.onSessionLock?.(false);
      options.onBusy?.(false);
      phase = 'idle';
      render();
      return;
    }
    setCalloutGate({
      context: session.getContext(),
      pause: () => session.muteForPlayback(),
      resume: () => session.unmuteAfterPlayback(),
    });
    render();
    await runCalibration();
  }

  function resetInProgressSet(): void {
    stepIndex = 0;
    setBlasts = [];
    setAudio = [];
    middleDurationSec = 0;
    lastAnalysis = null;
    currentTiming = null;
  }

  async function requestRedoSet(): Promise<void> {
    if (abortSession || !mounted) return;
    if (phase !== 'calibration' && phase !== 'set' && phase !== 'set_review') return;
    const fromReview = phase === 'set_review';
    if (fromReview && !beginLeaveReview()) return;
    cancelAutoAdvance();
    setGeneration += 1;
    cancelCurrentBlast?.();
    running = false;
    resetInProgressSet();
    if (fromReview) {
      phase = 'set';
      options.onBusy?.(true);
    }
    render();
    if (!fromReview) return;
    const token = ++launchToken;
    await delay(400);
    if (abortSession || !mounted || token !== launchToken) return;
    await runCurrentSet();
  }

  async function runCalibration(): Promise<void> {
    while (!abortSession && mounted) {
      const runId = setGeneration;
      const steps = guidedStepsForSet(CALIBRATION_SET);
      const blasts: ClassifiedBlast[] = [];
      middleDurationSec = 0;
      let discarded = false;

      for (let i = 0; i < steps.length; i++) {
        if (abortSession || !mounted) return;
        if (runId !== setGeneration) {
          discarded = true;
          break;
        }
        stepIndex = i;
        const blast = await runGuidedBlast(steps[i], middleDurationSec, i === steps.length - 1);
        if (!shouldCommitBlast({ runId, activeRunId: setGeneration, aborted: abortSession })) {
          discarded = true;
          break;
        }
        blasts.push(blast);
        middleDurationSec += middleContribution(blast.type, blast.totalDurationSec);
      }

      if (abortSession || !mounted) return;
      if (discarded || runId !== setGeneration) continue;

      unitSec = inferUnitFromBlasts(blasts, unitSec);
      setUnitDuration(unitSec);
      running = false;
      phase = 'set';
      resetInProgressSet();
      render();
      await delay(800);
      if (abortSession || !mounted) return;
      if (runId !== setGeneration) {
        await runCurrentSet();
        return;
      }
      await speakCallout('calibrateComplete');
      if (abortSession || !mounted) return;
      if (runId !== setGeneration) {
        await runCurrentSet();
        return;
      }
      await runCurrentSet();
      return;
    }
  }

  async function runCurrentSet(): Promise<void> {
    if (setLoopActive) return;
    setLoopActive = true;
    try {
      await runCurrentSetLoop();
    } finally {
      setLoopActive = false;
    }
  }

  async function runCurrentSetLoop(): Promise<void> {
    while (!abortSession && mounted) {
      const runId = setGeneration;
      const set = SET_GROUPS[setIndex];
      const steps = guidedStepsForSet(set);
      resetInProgressSet();
      let discarded = false;

      for (let i = 0; i < steps.length; i++) {
        if (abortSession || !mounted) return;
        if (runId !== setGeneration) {
          discarded = true;
          break;
        }
        stepIndex = i;
        const isClosing = steps[i].type === 'tekiah' && i === steps.length - 1 && steps.length > 1;
        const blast = await runGuidedBlast(steps[i], middleDurationSec, isClosing);
        if (!shouldCommitBlast({ runId, activeRunId: setGeneration, aborted: abortSession })) {
          discarded = true;
          break;
        }
        setBlasts.push(blast);
        middleDurationSec += middleContribution(blast.type, blast.totalDurationSec);
      }

      if (abortSession || !mounted) return;
      if (discarded || runId !== setGeneration) continue;

      const classified = [...setBlasts];
      const scored = scoreRecording(classified, unitSec, set.pattern);
      lastAnalysis = buildGuidedSetAnalysis(classified, scored);

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
      currentTiming = null;
      options.onBusy?.(false);
      phase = 'set_review';
      leavingReview = false;
      render();
      scheduleAutoAdvanceIfNeeded();
      return;
    }
  }

  async function runGuidedBlast(
    step: GuidedBlastStep,
    middleSoFar: number,
    isClosingTekiah: boolean,
  ): Promise<ClassifiedBlast> {
    const runId = setGeneration;
    const empty: ClassifiedBlast = { type: step.type, segments: [], totalDurationSec: 0 };
    running = false;
    currentTiming = null;
    render();

    if (!step.skipVoice) {
      await speakCallout(clipIdForBlast(step.callout));
    } else {
      await delay(350);
    }

    if (
      abortSession ||
      !mounted ||
      !session.isOpen() ||
      !shouldCommitBlast({ runId, activeRunId: setGeneration, aborted: abortSession })
    ) {
      running = false;
      options.onBusy?.(false);
      return empty;
    }

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
        currentTiming = liveTimingState(step.type, tick.soundingSec, timingCtx, tick.phase);
      },
    });
    cancelCurrentBlast = cancel;

    let intervalId: ReturnType<typeof setInterval> | undefined;
    const abortWatcher = new Promise<void>((resolve) => {
      intervalId = setInterval(() => {
        if (
          abortSession ||
          !shouldCommitBlast({ runId, activeRunId: setGeneration, aborted: abortSession })
        ) {
          cancel();
          if (intervalId !== undefined) clearInterval(intervalId);
          intervalId = undefined;
          resolve();
        }
      }, 100);
    });

    let stopResult: AutoStopResult | null = null;
    try {
      const raced = await Promise.race([
        promise.then((r) => ({ kind: 'stop' as const, r })),
        abortWatcher.then(() => ({ kind: 'abort' as const })),
      ]);
      if (raced.kind === 'stop') stopResult = raced.r;
    } finally {
      if (intervalId !== undefined) clearInterval(intervalId);
      if (cancelCurrentBlast === cancel) cancelCurrentBlast = null;
    }

    const recording = session.endCapture();
    const keep = shouldCommitBlast({ runId, activeRunId: setGeneration, aborted: abortSession });
    const soundingSec = !keep || !stopResult ? 0 : stopResult.soundingSec;
    const scoredRecording = { ...recording, durationSec: soundingSec };
    if (keep && isDiagnosticsEnabled() && recording.samples.length > 0) {
      setAudio.push({
        type: step.type,
        samples: recording.samples,
        sampleRate: recording.sampleRate,
      });
    }
    running = false;
    currentTiming = liveTimingState(
      step.type,
      soundingSec,
      timingCtx,
      soundingSec > 0.1 ? 'sounding' : latestTickPhase,
    );
    render();
    if (!shouldCommitBlast({ runId, activeRunId: setGeneration, aborted: abortSession })) {
      return empty;
    }
    await delay(450);

    if (!shouldCommitBlast({ runId, activeRunId: setGeneration, aborted: abortSession })) {
      return empty;
    }
    return analyzeSingleBlast(scoredRecording, unitSec, step.type);
  }

  function autoStopOptionsForType(
    type: BlastType,
    pattern: SetGroup['pattern'],
    middleSoFar: number,
    isClosingTekiah: boolean,
  ) {
    const band = expectedDurationForType(type, unitSec, pattern, middleSoFar, isClosingTekiah);
    return autoStopOptionsForBlast(type, band, SILENCE_MS[type]);
  }

  function middleContribution(type: BlastType, durationSec: number): number {
    if (type === 'shevarim' || type === 'teruah' || type === 'shevarim_teruah') {
      return durationSec;
    }
    return 0;
  }

  async function advanceAfterSet(): Promise<void> {
    if (!beginLeaveReview()) return;
    if (setIndex >= SET_GROUPS.length - 1) {
      phase = 'done';
      leavingReview = false;
      render();
      setCalloutGate({});
      session.close();
      return;
    }
    await startSetAtIndex(setIndex + 1);
  }

  async function goToPreviousSet(): Promise<void> {
    if (!canGoToPreviousSet(setIndex)) return;
    if (!beginLeaveReview()) return;
    await startSetAtIndex(setIndex - 1);
  }

  async function startSetAtIndex(index: number): Promise<void> {
    setIndex = index;
    stepIndex = 0;
    phase = 'set';
    lastAnalysis = null;
    options.onBusy?.(true);
    render();
    const token = ++launchToken;
    await delay(600);
    if (abortSession || !mounted || token !== launchToken) {
      leavingReview = false;
      return;
    }
    await runCurrentSet();
  }

  async function teardownAndBack(): Promise<void> {
    abortSession = true;
    cancelAutoAdvance();
    detachLive();
    setCalloutGate({});
    session.close();
    options.onBusy?.(false);
    options.onBack();
  }

  options.onRefreshRegister?.(render);
  render();

  return () => {
    mounted = false;
    abortSession = true;
    cancelAutoAdvance();
    detachLive();
    setCalloutGate({});
    session.close();
    options.onSessionLock?.(false);
    options.onBusy?.(false);
    container.remove();
  };
}
