/** Dependency-free (browser-safe) runtime guard for traces coming back over the bridge. */
export interface TraceLike {
  rootHash: string;
  seed: number;
  steps: { index: number; name: string; hash: string }[];
  decision: { priority: string; labels: string[]; assignee: string | null };
}

export function isTrace(v: unknown): v is TraceLike {
  const t = v as TraceLike;
  return !!t && typeof t === 'object' && typeof t.rootHash === 'string' && Array.isArray(t.steps)
    && !!t.decision && typeof t.decision.priority === 'string' && Array.isArray(t.decision.labels);
}
