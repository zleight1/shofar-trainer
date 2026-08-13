import { describe, expect, it } from 'vitest';
import { CALIBRATION_SET, guidedStepsForSet } from './guided-steps';
import { SET_GROUPS } from './seder';

describe('guidedStepsForSet', () => {
  it('uses one shevarim-teruah take with no breath for sitting tashrat', () => {
    const sitting = SET_GROUPS.find((s) => s.id === 'sit-1-tst')!;
    const steps = guidedStepsForSet(sitting);
    expect(steps.map((s) => s.type)).toEqual(['tekiah', 'shevarim_teruah', 'tekiah']);
    expect(steps[1].callout).toBe('shevarim_teruah');
    expect(steps[1].breath).toBe('none');
    expect(steps[1].skipVoice).toBe(false);
  });

  it('keeps one shevarim-teruah callout and two takes when breathing', () => {
    const musaf = SET_GROUPS.find((s) => s.id === 'malchuyot-tst')!;
    const steps = guidedStepsForSet(musaf);
    expect(steps.map((s) => s.type)).toEqual(['tekiah', 'shevarim', 'teruah', 'tekiah']);
    expect(steps[1].callout).toBe('shevarim_teruah');
    expect(steps[2].callout).toBe('shevarim_teruah');
    expect(steps[1].breath).toBe('between');
    expect(steps[2].skipVoice).toBe(true);
  });

  it('calibrates with sitting one-breath tashrat', () => {
    expect(CALIBRATION_SET.section).toBe('calibration');
    expect(CALIBRATION_SET.stBreath).toBe('none');
    expect(guidedStepsForSet(CALIBRATION_SET).map((s) => s.type)).toEqual([
      'tekiah',
      'shevarim_teruah',
      'tekiah',
    ]);
  });
});
