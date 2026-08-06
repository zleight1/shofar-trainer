export type BlastType = 'tekiah' | 'shevarim' | 'teruah' | 'shevarim_teruah' | 'tekiah_gedolah';

export interface BlastSegment {
  startSample: number;
  endSample: number;
  durationSec: number;
}

export interface ClassifiedBlast {
  type: BlastType;
  segments: BlastSegment[];
  totalDurationSec: number;
}

export interface HalachaConfig {
  /** Ratio tolerance for tekiah vs middle (0.15 = ±15%) */
  ratioTolerance: number;
  /** Minimum teruah blast count */
  minTeruahBlasts: number;
  /** Expected shevarim note count */
  shevarimNoteCount: number;
  /** Minimum duration per shevarim note in teruah units */
  minShevarimNoteUnits: number;
  /** Minimum tekiah duration in teruah units (standalone guidance) */
  minTekiahUnits: number;
}

export interface ScoreIssue {
  severity: 'error' | 'warn';
  code: string;
  message: string;
}

export interface AnalysisResult {
  classified: ClassifiedBlast[];
  issues: ScoreIssue[];
  passed: boolean;
  tekiahRatio: number | null;
}

export interface SederStep {
  id: string;
  label: string;
  expectedTypes: readonly BlastType[];
  groupLabel: string;
}

export interface PracticeSession {
  id: string;
  timestamp: string;
  stepId: string;
  passed: boolean;
  tekiahRatio: number | null;
  issues: ScoreIssue[];
  unitDurationSec: number;
}

export const DEFAULT_HALACHA_CONFIG: HalachaConfig = {
  ratioTolerance: 0.15,
  minTeruahBlasts: 9,
  shevarimNoteCount: 3,
  minShevarimNoteUnits: 2.5,
  minTekiahUnits: 9,
};

export const CALIBRATION_STORAGE_KEY = 'shofar-trainer-unit-sec';
export const SESSIONS_STORAGE_KEY = 'shofar-trainer-sessions';
