import { replayLatest, triage, whatIfLatest } from '../service';

interface ActionPayload {
  issueKey?: string;
  seed?: number;
  overridesJson?: string;
  context?: { jira?: { issueKey?: string } };
}

const keyOf = (p: ActionPayload) => p.issueKey ?? p.context?.jira?.issueKey;

async function safe<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export const triageHandler = (p: ActionPayload) => safe(() => triage(keyOf(p), p.seed));
export const replayHandler = (p: ActionPayload) => safe(() => replayLatest(keyOf(p)));
export const whatIfHandler = (p: ActionPayload) => safe(() => whatIfLatest(keyOf(p), p.overridesJson ?? '{}'));
