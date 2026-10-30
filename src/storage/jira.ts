import api, { route } from '@forge/api';
import { buildFindJql, mergeCandidates, clampMax, mapSearchResult, type Candidate, type FindIssuesParams, type FoundIssue, type IssueInput } from '../core';

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
  if (!res.ok) {
    const hint = res.status === 404
      ? 'issue does not exist or the app cannot see it; use find-issues to get a real key'
      : res.status === 401 || res.status === 403 ? 'app lacks permission (read:jira-work / project browse)' : 'request failed';
    console.warn(`retrace fetchIssue ${issueKey}: ${res.status}`);
    throw new Error(`Jira returned ${res.status} for ${issueKey}: ${hint}`);
  }
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

/**
 * Candidate assignees. Root cause of the "no assignable users" bug: /user/assignable/search needs the
 * read:jira-user scope (classic) which this app does not request, so asApp got a 401/403 and we silently
 * returned []. We keep trying it (works if the scope is ever added) but fall back to data readable with
 * read:jira-work alone: the issue's current assignee plus recent assignees in the same project.
 */
export async function fetchCandidates(issueKey: string): Promise<Candidate[]> {
  const lists: any[][] = [];
  try {
    const res = await api.asApp().requestJira(
      route`/rest/api/3/user/assignable/search?issueKey=${issueKey}&maxResults=50`,
    );
    if (res.ok) {
      const body: any = await res.json();
      if (Array.isArray(body)) lists.push(body);
    } else {
      console.warn(`retrace assignable/search ${issueKey}: ${res.status}; falling back to assignee history`);
    }
  } catch (e) {
    console.warn(`retrace assignable/search ${issueKey} failed: ${(e as Error).message}`);
  }
  try {
    const res = await api.asApp().requestJira(route`/rest/api/3/issue/${issueKey}?fields=assignee,project`);
    if (res.ok) {
      const f = ((await res.json()) as any).fields ?? {};
      if (f.assignee) lists.push([f.assignee]);
      const project = f.project?.key;
      if (project) {
        const sr = await api.asApp().requestJira(route`/rest/api/3/search/jql`, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jql: `project = "${project}" AND assignee IS NOT EMPTY ORDER BY updated DESC`,
            maxResults: 50,
            fields: ['assignee'],
          }),
        });
        if (sr.ok) lists.push((((await sr.json()) as any).issues ?? []).map((i: any) => i.fields?.assignee));
        else console.warn(`retrace recent assignees ${project}: ${sr.status}`);
      }
    }
  } catch (e) {
    console.warn(`retrace assignee fallback ${issueKey} failed: ${(e as Error).message}`);
  }
  return mergeCandidates(...lists);
}

/** JQL search via the enhanced search endpoint (read:jira-work). Always bounded; newest first. */
export async function searchIssues(p: FindIssuesParams): Promise<{ jql: string; issues: FoundIssue[] }> {
  const jql = buildFindJql(p);
  const res = await api.asApp().requestJira(route`/rest/api/3/search/jql`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ jql, maxResults: clampMax(p.maxResults), fields: ['summary', 'status', 'created', 'project'] }),
  });
  if (!res.ok) throw new Error(`Jira search returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return { jql, issues: mapSearchResult(await res.json()) };
}
