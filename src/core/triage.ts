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

export const PRIORITIES = ['Highest', 'High', 'Medium', 'Low', 'Lowest'] as const;
export type Priority = (typeof PRIORITIES)[number];

export interface Rule {
  label: string;
  words: string[];
  weight: number;
  why: string;
}

/** Keyword rules. Whole-word match; a trailing * allows suffixes ("auth*" matches "authentication"). */
export const RULES: ReadonlyArray<Rule> = [
  { label: 'security', words: ['security', 'vulnerab*', 'xss', 'csrf', 'injection', 'leak*', 'exploit*', 'cve', 'auth*', 'token*', 'password*', 'permission*'], weight: 5, why: 'mentions a security risk' },
  { label: 'outage', words: ['outage', 'down', 'unavailable', '500', '502', '503', 'offline', 'cannot log in', "can't log in"], weight: 5, why: 'looks like a service outage' },
  { label: 'data-loss', words: ['data loss', 'corrupt*', 'deleted', 'lost', 'wiped'], weight: 4, why: 'risks losing user data' },
  { label: 'crash', words: ['crash*', 'freez*', 'hang', 'hangs', 'hanging', 'segfault', 'force close', 'panic'], weight: 4, why: 'the app crashes or freezes' },
  { label: 'performance', words: ['slow*', 'latency', 'timeout*', 'timed out', 'lag', 'memory', 'cpu', 'performance'], weight: 3, why: 'is a performance problem' },
  { label: 'bug', words: ['bug', 'error*', 'broken', 'fail*', 'exception*', 'regression*', 'not working', "doesn't work", 'incorrect', 'wrong'], weight: 2, why: 'describes broken behaviour' },
  { label: 'ux', words: ['button*', 'layout', 'css', 'typo', 'display', 'ui', 'ux', 'confusing', 'alignment', 'color', 'colour', 'dark mode', 'mobile view'], weight: 1, why: 'affects the user interface' },
  { label: 'docs', words: ['docs', 'documentation', 'readme', 'guide', 'tutorial', 'help text'], weight: -1, why: 'is about documentation' },
];

/** Words that raise urgency without adding a label. */
export const URGENCY = { words: ['urgent', 'asap', 'blocker', 'blocking', 'critical', 'production', 'all users', 'customers'], weight: 2 };

/** Base score from the Jira issue type, so ordinary work items start at Low rather than Lowest. */
export const TYPE_BASE: Readonly<Record<string, number>> = { incident: 3, bug: 2, story: 1, task: 1, 'sub-task': 1, subtask: 1, epic: 1 };

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Word match; a trailing * makes it a prefix match ("crash*" matches "crashes"). */
const hit = (text: string, word: string) =>
  word.endsWith('*')
    ? new RegExp(`(^|[^a-z0-9])${esc(word.slice(0, -1))}`).test(text)
    : new RegExp(`(^|[^a-z0-9])${esc(word)}($|[^a-z0-9])`).test(text);
const bare = (w: string) => w.replace(/\*$/, '');

export function normalizeText(issue: IssueInput): string {
  return `${issue.summary}\n${issue.description}`.toLowerCase();
}

export interface Detection {
  labels: string[];
  score: number;
  matched: Record<string, string[]>;
  reasons: string[];
}

/**
 * `suppress` (what-if only) drops rules entirely, so a removed label stays removed even when
 * the scorer would otherwise find it in the text. Order-insensitive and lowercased for determinism.
 */
export function detectLabels(issue: IssueInput, suppress: readonly string[] = []): Detection {
  const off = new Set(suppress.map((l) => l.toLowerCase()));
  const text = normalizeText(issue);
  const existing = new Set(issue.labels.map((l) => l.toLowerCase()));
  const type = issue.issueType.toLowerCase();
  const matched: Record<string, string[]> = {};
  const reasons: string[] = [];
  let score = TYPE_BASE[type] ?? 1;
  reasons.push(`Issue type "${issue.issueType}" starts at ${score}.`);
  for (const rule of RULES) {
    if (off.has(rule.label)) {
      reasons.push(`${rule.label}: removed in what-if, not scored.`);
      continue;
    }
    const hits = rule.words.filter((w) => hit(text, w)).map(bare);
    const tagged = existing.has(rule.label);
    const typeBug = rule.label === 'bug' && type === 'bug';
    if (hits.length === 0 && !tagged && !typeBug) continue;
    matched[rule.label] = hits;
    // A Bug issue type already scored its base; don't count bug keywords twice.
    const w = typeBug ? 0 : rule.weight;
    score += w;
    const source = hits.length ? `words: ${hits.map((h) => `"${bare(h)}"`).join(', ')}` : tagged ? 'existing label' : 'issue type';
    reasons.push(`${rule.label}: ${rule.why} (${source}) ${w >= 0 ? '+' : ''}${w}.`);
  }
  const urgent = URGENCY.words.filter((w) => hit(text, w)).map(bare);
  if (urgent.length) {
    score += URGENCY.weight;
    reasons.push(`Urgency words ${urgent.map((u) => `"${u}"`).join(', ')} +${URGENCY.weight}.`);
  }
  return { labels: Object.keys(matched).sort(), score, matched, reasons };
}

/** Score scale: >=9 Highest, 6-8 High, 3-5 Medium, 1-2 Low, <=0 Lowest. */
export function priorityFor(score: number): Priority {
  if (score >= 9) return 'Highest';
  if (score >= 6) return 'High';
  if (score >= 3) return 'Medium';
  if (score >= 1) return 'Low';
  return 'Lowest';
}

export function isPriority(v: unknown): v is Priority {
  return typeof v === 'string' && (PRIORITIES as readonly string[]).includes(v);
}

/** Pick assignee by skill overlap, then lowest load; remaining ties broken by the seeded RNG. */
export function pickAssignee(labels: string[], issue: IssueInput, candidates: Candidate[], rng: Rng) {
  if (candidates.length === 0) {
    return { accountId: null as string | null, displayName: null as string | null, reason: 'no assignable users found', tied: 0 };
  }
  const tags = new Set([...labels, ...issue.components.map((c) => c.toLowerCase())]);
  const scored = [...candidates]
    .sort((a, b) => a.accountId.localeCompare(b.accountId))
    .map((c) => ({ c, fit: c.skills.filter((s) => tags.has(s.toLowerCase())).length * 10 - c.openIssues }));
  const best = Math.max(...scored.map((s) => s.fit));
  const tied = scored.filter((s) => s.fit === best);
  const chosen = tied.length === 1 ? tied[0] : tied[rng.int(tied.length)];
  return {
    accountId: chosen.c.accountId as string | null,
    displayName: chosen.c.displayName as string | null,
    reason: tied.length > 1
      ? `best fit score ${best}; seeded tie-break among ${tied.length} equally good people`
      : `best fit score ${best} (skills matched minus open issues)`,
    tied: tied.length,
  };
}
