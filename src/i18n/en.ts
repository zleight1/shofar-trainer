export const en = {
  appTitle: 'Shofar Trainer',
  tagline: 'Makrei-style guided practice with live timing feedback',
  lastUnit: (p: { ms: number }) => `Last unit: ${p.ms} ms`,
  navPractice: 'Practice (guided)',
  navCalibrate: 'Calibrate manually',
  navHistory: 'History',
  navSources: 'Sources',
  diagnosticsToggle: 'Diagnostics',
  diagnosticsHint:
    'After each set, show echo compensation and download a WAV of the blasts. Compensation still runs when this is off.',
  diagnosticsTitle: 'Diagnostics',
  diagnosticsRoomEcho: (p: { ms: number; dropped: number }) =>
    `Room echo: ${p.ms} ms tap — dropped ${p.dropped} reflected onset(s)`,
  diagnosticsRoomSaved: (p: { ms: number }) => `Saved room tap: ${p.ms} ms`,
  diagnosticsNoEcho: 'No consistent echo tap in this set.',
  diagnosticsPeaks: (p: { label: string; raw: number; kept: number }) =>
    `${p.label}: ${p.raw} raw onsets → ${p.kept} scored`,
  diagnosticsOnsets: (p: { times: string }) => `Onsets: ${p.times}s`,
  diagnosticsDownload: (p: { label: string }) => `Download ${p.label} WAV`,
  diagnosticsClearRoom: 'Clear saved room profile',
  disclaimer:
    'This is a training aid, not a ruling. A rav must still give pesak.',
  localeEn: 'EN',
  localeHe: 'עברית',
  back: 'Back',
  exit: 'Exit',
  finish: 'Finish',
  nextSet: 'Next set',
  stopSession: 'Stop session',
  startGuided: 'Start guided session',
  practiceTitle: 'Guided Practice',
  practiceIntro:
    'Makrei-style practice: the app calls each blast, records automatically, and gives live length feedback. Starts with a calibration tashrat.',
  calibrationIntro:
    'First, blow one sitting tashrat (Tekiah · Shevarim-Teruah in one breath · Tekiah). The app learns your timing from this.',
  calibrationSubtitle: 'Calibration — tashrat',
  setReviewSubtitle: (p: { n: number; total: number }) =>
    `Set ${p.n} of ${p.total} — review`,
  setProgressSubtitle: (p: { n: number; total: number; blast: number; blasts: number }) =>
    `Set ${p.n} of ${p.total} · blast ${p.blast} of ${p.blasts}`,
  blow: (p: { callout: string }) => `Blow: ${p.callout}`,
  listen: 'Listen…',
  setComplete: 'Set complete',
  teruahUnit: (p: { ms: number }) => `Teruah unit: ${p.ms} ms`,
  sessionComplete: 'Session complete. Well done.',
  backHome: 'Back to home',
  calibrateCompleteSpeech: 'Calibration complete. Starting practice sets.',
  calibrateTitle: 'Calibrate',
  calibrateIntro:
    'Blow one short teruah-style blast (or a few quick staccato notes). The app learns the length of one teruah unit for all timing checks.',
  liveHint: 'Watch the live waveform as you blow',
  recordingNow: '● Recording — blow now',
  calloutReady: 'Callout… get ready to blow',
  currentUnit: (p: { ms: number }) => `Current unit: ${p.ms} ms`,
  starting: 'Starting…',
  stop: 'Stop',
  recordTeruah: 'Record teruah',
  saveContinue: 'Save & continue',
  skipForNow: 'Skip for now',
  historyTitle: 'Session History',
  historyEmpty: 'No sessions yet. Complete a practice set to see results here.',
  historyStats: (p: { passed: number; total: number }) =>
    `${p.passed}/${p.total} sets passed overall`,
  clearHistory: 'Clear history',
  confirmClear: 'Clear all session history?',
  confirmYes: 'Clear',
  confirmNo: 'Cancel',
  pass: 'PASS',
  fail: 'FAIL',
  passed: 'Passed',
  needsWork: 'Needs work',
  previousScoring:
    'Scored under previous average-ratio checks — not proof of the current per-tekiah rules.',
  tekiahMiddleRatio: (p: { pct: number }) =>
    `Tekiah / middle ratio: ${p.pct}% (display only)`,
  notesDetected: (p: { count: number; detail: string }) =>
    `Detected ${p.count} note(s): ${p.detail}`,
  blastLine: (p: { label: string; notes: number; sec: string }) =>
    `${p.label}: ${p.notes} note(s), ${p.sec}s total`,
  blastDuration: (p: { label: string; sec: string }) => `${p.label}: ${p.sec}s`,
  setTimelineTitle: 'The set you just blew',
  timelineDuration: (p: { sec: string }) => `${p.sec}s`,
  timelineMin: (p: { sec: string }) => `min ${p.sec}s`,
  timelineNotes: (p: { count: number; expected: number }) => `${p.count} of ${p.expected}`,
  speechHeMissing:
    'Spoken Hebrew needs a Hebrew system voice. On-screen callouts stay Hebrew.',
  sourcesTitle: 'Sources',
  sourcesIntro:
    'Texts the trainer follows, plus study-only citations. This is not pesak.',
  encodedLabel: 'Encoded in scoring',
  studyOnlyLabel: 'Study only — not encoded',
  minhagNote:
    'First 30 (sitting): shevarim-teruah in one breath. Later tashrat: breathe between (Rema). One callout either way.',
  openLink: 'Open source',
  setTst: (p: { n: number }) => `Sitting tashrat ${p.n} — no breath`,
  setTstStand: (p: { n: number }) => `Standing tashrat ${p.n} — breathe`,
  setTsh: (p: { n: number }) => `Tekiah–Shevarim–Tekiah ${p.n}`,
  setTt: (p: { n: number }) => `Tekiah–Teruah–Tekiah ${p.n}`,
  setGedolah: 'Tekiah Gedolah',
  setCalibration: 'Calibration — sitting tashrat (one breath)',
  calloutTekiah: 'Tekiah',
  calloutShevarim: 'Shevarim',
  calloutTeruah: 'Teruah',
  calloutShevarimTeruah: 'Shevarim-Teruah',
  calloutGedolah: 'Tekiah Gedolah',
  breathNone: 'Do not breathe between shevarim and teruah',
  breathBetween: 'Breathe between shevarim and teruah',
  blastTekiah: 'Tekiah',
  blastShevarim: 'Shevarim',
  blastTeruah: 'Teruah',
  blastGedolah: 'Tekiah Gedolah',
  liveWaiting: 'Waiting for sound…',
  liveBuilding: (p: { min: string }) => `Keep going — minimum ${p.min}s`,
  liveTooShort: (p: { elapsed: string; min: string }) =>
    `Almost — a bit longer (${p.elapsed}s / min ${p.min}s)`,
  liveGood: (p: { elapsed: string }) => `Good length (${p.elapsed}s)`,
  liveTooLongShevarim: (p: { elapsed: string }) =>
    `Shevarim may be too long — finish (${p.elapsed}s)`,
  issues: {
    opening_tekiah_too_short: (p: { duration: string; min: string }) =>
      `Opening tekiah is too short (${p.duration}s; minimum ${p.min}s)`,
    closing_tekiah_too_short: (p: { duration: string; min: string }) =>
      `Closing tekiah is too short (${p.duration}s; minimum ${p.min}s)`,
    tekiah_min_length: (p: { duration: string; min: string }) =>
      `Tekiah is below the unit floor (${p.duration}s; minimum ${p.min}s)`,
    shever_too_long: (p: { duration: string; cap: string }) =>
      `A shever is as long as a tekiah (${p.duration}s ≥ ${p.cap}s)`,
    shevarim_count: (p: { expected: number; detected: number }) =>
      `Expected ${p.expected} shevarim notes, detected ${p.detected}`,
    shevarim_count_ok_length: (p: { expected: number; detected: number; sec: string }) =>
      `Could not detect ${p.expected} separate notes (${p.detected} detected) — total length ${p.sec}s looks OK`,
    shevarim_extra: (p: { detected: number }) =>
      `${p.detected} shevarim notes detected — prefer three`,
    shevarim_note_short: (p: { n: number; sec: string }) =>
      `Shevarim note ${p.n} may be too short (${p.sec}s)`,
    teruah_count: (p: { expected: number; detected: number }) =>
      `Expected at least ${p.expected} teruah blasts, detected ${p.detected}`,
  },
};

export type MessageCatalog = {
  [K in keyof typeof en]: (typeof en)[K] extends string ? string : (typeof en)[K];
};
