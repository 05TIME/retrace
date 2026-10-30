import type { Rng } from './rng';

export interface IssueInput {
  key: string;
  summary: string;
  description: string;
  labels: string[];
  components: string[];
  issueType: string;
}

export interface Candidate {
  accountId: string;
  displayName: string;
  skills: string[];
  openIssues: number;
}

export type Priority = 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';

export const RULES: ReadonlyArray<{ label: string; words: string[]; weight: number }> = [
  { label: 'security', words: ['security', 'vulnerability', 'xss', 'injection', 'leak', 'auth'], weight: 5 },
  { label: 'outage', words: ['outage', 'down', 'crash', '500', 'unavailable'], weight: 5 },
  { label: 'data-loss', words: ['data loss', 'corrupt', 'deleted', 'lost'], weight: 4 },
  { label: 'performance', words: ['slow', 'latency', 'timeout', 'memory', 'cpu'], weight: 3 },
  { label: 'ui', words: ['button', 'layout', 'css', 'typo', 'display'], weight: 1 },
  { label: 'docs', words: ['docs', 'documentation', 'readme'], weight: 0 },
];

export function normalizeText(issue: IssueInput): string {
  return `${issue.summary}\n${issue.description}`.toLowerCase();
}

export function detectLabels(issue: IssueInput): { labels: string[]; score: number; matched: Record<string, string[]> } {
  const text = normalizeText(issue);
  const existing = new Set(issue.labels.map((l) => l.toLowerCase()));
  const matched: Record<string, string[]> = {};
  let score = issue.issueType.toLowerCase() === 'bug' ? 1 : 0;
  for (const rule of RULES) {
    const hits = rule.words.filter((w) => text.includes(w));
    if (hits.length > 0 || existing.has(rule.label)) {
      matched[rule.label] = hits;
      score += rule.weight;
    }
  }
  return { labels: Object.keys(matched).sort(), score, matched };
}

export function priorityFor(score: number): Priority {
  if (score >= 8) return 'Highest';
  if (score >= 5) return 'High';
  if (score >= 2) return 'Medium';
  if (score >= 1) return 'Low';
  return 'Lowest';
}

/** Pick assignee by skill overlap, then lowest load; remaining ties broken by the seeded RNG. */
export function pickAssignee(labels: string[], issue: IssueInput, candidates: Candidate[], rng: Rng) {
  if (candidates.length === 0) return { accountId: null as string | null, reason: 'no candidates', tied: 0 };
  const tags = new Set([...labels, ...issue.components.map((c) => c.toLowerCase())]);
  const scored = [...candidates]
    .sort((a, b) => a.accountId.localeCompare(b.accountId))
    .map((c) => ({ c, fit: c.skills.filter((s) => tags.has(s.toLowerCase())).length * 10 - c.openIssues }));
  const best = Math.max(...scored.map((s) => s.fit));
  const tied = scored.filter((s) => s.fit === best);
  const chosen = tied.length === 1 ? tied[0] : tied[rng.int(tied.length)];
  return {
    accountId: chosen.c.accountId as string | null,
    reason: `fit=${best}${tied.length > 1 ? `, seeded tie-break among ${tied.length}` : ''}`,
    tied: tied.length,
  };
}
