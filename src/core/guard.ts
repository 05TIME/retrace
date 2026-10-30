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

export const CURRENT_ENGINE = 'retrace-core/2';

/** A stored trace is "legacy" if it is malformed or was recorded by an older engine version. */
export function traceStatus(v: unknown): 'none' | 'current' | 'legacy' {
  if (v === null || v === undefined) return 'none';
  if (!isTrace(v)) return 'legacy';
  return (v as { version?: unknown }).version === CURRENT_ENGINE ? 'current' : 'legacy';
}
