import { describe, expect, it } from 'vitest';
import { shouldCommitBlast } from './practice-run';

describe('shouldCommitBlast', () => {
  it('keeps a blast when the run is still active', () => {
    expect(shouldCommitBlast({ runId: 3, activeRunId: 3, aborted: false })).toBe(true);
  });

  it('drops a blast when the session was aborted', () => {
    expect(shouldCommitBlast({ runId: 3, activeRunId: 3, aborted: true })).toBe(false);
  });

  it('drops a blast when redo started a new run', () => {
    expect(shouldCommitBlast({ runId: 3, activeRunId: 4, aborted: false })).toBe(false);
  });
});
