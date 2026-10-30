import api, { route } from '@forge/api';
import type { Candidate, IssueInput } from '../core';

function adfToText(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.type === 'text') return node.text ?? '';
  return (node.content ?? []).map(adfToText).join(' ');
}

export async function fetchIssue(issueKey: string): Promise<IssueInput> {
  const res = await api.asApp().requestJira(
    route`/rest/api/3/issue/${issueKey}?fields=summary,description,labels,components,issuetype,project`,
  );
  if (!res.ok) throw new Error(`Jira returned ${res.status} for ${issueKey}`);
  const data: any = await res.json();
  const f = data.fields ?? {};
  return {
    key: data.key,
    summary: f.summary ?? '',
    description: adfToText(f.description),
    labels: [...(f.labels ?? [])].sort(),
    components: (f.components ?? []).map((c: any) => c.name).sort(),
    issueType: f.issuetype?.name ?? 'Task',
  };
}

/** Assignable users for the issue's project. Skills are derived from component leads later; empty for now. */
export async function fetchCandidates(issueKey: string): Promise<Candidate[]> {
  const res = await api.asApp().requestJira(
    route`/rest/api/3/user/assignable/search?issueKey=${issueKey}&maxResults=20`,
  );
  if (!res.ok) return [];
  const users: any[] = await res.json();
  return users
    .filter((u) => u.accountType === 'atlassian')
    .map((u) => ({ accountId: u.accountId, displayName: u.displayName, skills: [], openIssues: 0 }));
}
