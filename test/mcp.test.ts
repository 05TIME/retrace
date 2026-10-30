import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const store = new Map<string, unknown>();
const issues: Record<string, any> = {
  'MOBL-57': { key: 'MOBL-57', summary: 'App crashes when opening settings', description: '', labels: [], components: [], issueType: 'Bug' },
};
vi.mock('../src/storage/traces', () => ({
  saveTrace: async (r: any) => { store.set(r.trace.issueKey, structuredClone(r)); },
  loadTrace: async (k: string) => structuredClone(store.get(k)),
}));
vi.mock('../src/storage/jira', () => ({
  fetchIssue: async (k: string) => { if (!issues[k]) throw new Error(`Jira returned 404 for ${k}`); return structuredClone(issues[k]); },
  fetchCandidates: async () => [],
  searchIssues: async () => ({ jql: 'created >= -3650d ORDER BY created DESC', issues: [{ key: 'MOBL-57', summary: issues['MOBL-57'].summary }] }),
}));

const h = await import('../src/actions');
// 2.6.0 golden root for this fixture (see golden.test.ts).
const GOLDEN = 'e6565b5bba7ac45215aee5e12724ccd0f0d17ee9631850661176ff33493b1455';

describe('MCP tool surface (rovo:mcp → action handlers)', () => {
  beforeEach(() => store.clear());

  it('manifest exposes all four actions as MCP tools and the skill depends on them', () => {
    const m = readFileSync('manifest.yml', 'utf8');
    const mcp = m.split('rovo:mcp:')[1].split('rovo:skill:')[0];
    for (const t of ['find-issues', 'triage-issue', 'replay-trace', 'what-if-trace']) expect(mcp).toContain(`- ${t}`);
    const skill = readFileSync('skills/retrace-triage/SKILL.md', 'utf8');
    expect(skill).toMatch(/^---\nname: retrace-triage\n/);
    expect(skill).toContain('allowed-tools: find-issues triage-issue replay-trace what-if-trace');
  });

  it('end to end: find → triage → triage again → replay → what-if', async () => {
    const found: any = await h.findIssuesHandler({});
    expect(found.issues[0].key).toBe('MOBL-57');
    const key = found.issues[0].key;

    const t1: any = await h.triageHandler({ issueKey: key });
    expect(t1.issueKeyUsed).toBe('MOBL-57');
    expect(t1.rootHash).toBe(GOLDEN);
    expect(t1.decision).toMatchObject({ priority: 'High', labels: ['bug', 'crash'], assignee: null });

    const t2: any = await h.triageHandler({ issueKey: key });
    expect(t2).toMatchObject({ unchanged: true, previousRootHash: GOLDEN, rootHash: GOLDEN });

    expect(await h.replayHandler({ issueKey: key })).toMatchObject({ found: true, ok: true, rootHash: GOLDEN });

    const w: any = await h.whatIfHandler({ issueKey: key, removeLabels: 'crash' });
    expect(w.alternative.priority).toBe('Low');
    expect(w.appliedSummary).toEqual(['removed labels: crash']);
    // What-if never stores: replay still verifies the original.
    expect(await h.replayHandler({ issueKey: key })).toMatchObject({ ok: true, rootHash: GOLDEN });
  });

  it('no-change what-if lists what was tried', async () => {
    await h.triageHandler({ issueKey: 'MOBL-57' });
    const w: any = await h.whatIfHandler({ issueKey: 'MOBL-57', forcePriority: 'High' });
    expect(w).toMatchObject({ unchanged: true, diff: [], appliedSummary: ['forced priority: High'] });
  });

  it('returns errors as data, never throws (MCP clients get a readable result)', async () => {
    expect(await h.triageHandler({})).toEqual({ error: expect.stringMatching(/valid Jira issue key.*issueKeyUsed: none/) });
    expect(await h.triageHandler({ issueKey: 'NOPE-1' })).toEqual({ error: expect.stringMatching(/404.*NOPE-1/) });
    expect(await h.replayHandler({ issueKey: 'MOBL-57' })).toMatchObject({ found: false });
    expect(await h.whatIfHandler({ issueKey: 'MOBL-57', forcePriority: 'Urgent' })).toMatchObject({ found: false });
  });

  it('bad what-if input on an existing trace is a clear error', async () => {
    await h.triageHandler({ issueKey: 'MOBL-57' });
    expect(await h.whatIfHandler({ issueKey: 'MOBL-57', forcePriority: 'Urgent' })).toEqual({ error: expect.stringMatching(/forcePriority/) });
  });
});
