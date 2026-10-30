import { findIssues, replayLatest, triage, whatIfLatest } from '../service';

interface ActionPayload {
  issueKey?: string;
  seed?: number;
  overridesJson?: string;
  addLabels?: string;
  removeLabels?: string;
  forcePriority?: string;
  project?: string;
  text?: string;
  maxResults?: number;
  context?: { jira?: { issueKey?: string; projectKey?: string } };
}

const keyOf = (p: ActionPayload) => p.issueKey ?? p.context?.jira?.issueKey;

async function safe<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export const triageHandler = (p: ActionPayload) =>
  safe(async () => {
    const key = keyOf(p);
    try {
      return await triage(key, p.seed);
    } catch (e) {
      throw new Error(`${(e as Error).message} (issueKeyUsed: ${key ?? 'none'})`);
    }
  });
export const findIssuesHandler = (p: ActionPayload) =>
  safe(() => findIssues({ project: p.project, text: p.text, maxResults: p.maxResults }));
export const replayHandler = (p: ActionPayload) => safe(() => replayLatest(keyOf(p)));
export const whatIfHandler = (p: ActionPayload) => safe(() =>
    whatIfLatest(keyOf(p), {
      addLabels: p.addLabels,
      removeLabels: p.removeLabels,
      forcePriority: p.forcePriority,
      overrides: p.overridesJson,
    }),
  );
