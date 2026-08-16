export function shouldCommitBlast(args: {
  runId: number;
  activeRunId: number;
  aborted: boolean;
}): boolean {
  return !args.aborted && args.runId === args.activeRunId;
}
