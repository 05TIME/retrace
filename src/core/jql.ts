/** Pure helpers for the find-issues action. Jira Cloud rejects unbounded JQL, so we always add a restriction. */
export interface FindIssuesParams {
  project?: string;
  text?: string;
  maxResults?: number;
}

const PROJECT_KEY = /^[A-Z][A-Z0-9_]{0,49}$/;
export const DEFAULT_WINDOW = 'created >= -3650d';

export function escapeJqlString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n\t]+/g, ' ').trim();
}

export function clampMax(n: unknown, dflt = 10): number {
  const v = typeof n === 'string' ? Number(n) : n;
  if (typeof v !== 'number' || !Number.isFinite(v)) return dflt;
  return Math.min(20, Math.max(1, Math.floor(v)));
}

export function buildFindJql(p: FindIssuesParams = {}): string {
  const clauses: string[] = [];
  const project = p.project?.trim().toUpperCase();
  if (project) {
    if (!PROJECT_KEY.test(project)) throw new Error(`Invalid project key: ${p.project}`);
    clauses.push(`project = ${project}`);
  }
  const text = p.text ? escapeJqlString(p.text).slice(0, 200) : '';
  if (text) clauses.push(`text ~ "${text}"`);
  if (clauses.length === 0) clauses.push(DEFAULT_WINDOW);
  return `${clauses.join(' AND ')} ORDER BY created DESC`;
}

export interface FoundIssue {
  key: string;
  summary: string;
  status: string | null;
  created: string | null;
  project: string | null;
}

export function mapSearchResult(data: any): FoundIssue[] {
  return (data?.issues ?? []).map((i: any) => ({
    key: String(i.key),
    summary: i.fields?.summary ?? '',
    status: i.fields?.status?.name ?? null,
    created: i.fields?.created ?? null,
    project: i.fields?.project?.key ?? null,
  }));
}
