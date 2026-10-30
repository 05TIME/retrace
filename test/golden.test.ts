import { describe, expect, it } from 'vitest';
import { runTriage, replay, ENGINE_VERSION } from '../src/core';

// Root hashes computed with the 2.6.0 code (main @ 7aa52bf). Within an engine version,
// normal triage must hash byte-identically or stored traces stop verifying. Never "update" these;
// bump ENGINE_VERSION instead.
const c = [{ accountId: 'a1', displayName: 'Ada', skills: ['security'], openIssues: 2 }, { accountId: 'b2', displayName: 'Bo', skills: ['crash'], openIssues: 1 }];
const i = (key: string, summary: string, issueType: string, labels: string[] = []) => ({ key, summary, description: '', labels, components: [], issueType });
const GOLDEN: [string, any, string][] = [
  ['task, no users', { issue: i('KAN-1', 'Add export to CSV', 'Task'), candidates: [] }, '588e22d4dc5c166f2e7fe960a6f4f5bb5ddd7e2d3040c071d4b54f913278f444'],
  ['crash bug, no users', { issue: i('MOBL-57', 'App crashes when opening settings', 'Bug'), candidates: [] }, 'e6565b5bba7ac45215aee5e12724ccd0f0d17ee9631850661176ff33493b1455'],
  ['security, with users', { issue: i('KAN-2', 'Login down, password reset leaks tokens', 'Bug', ['security']), candidates: c }, 'eecb6064852641309b2919d57f3b0257e65823ad80662c954212d036e2890ac9'],
  ['seeded tie-break', { issue: i('KAN-3', 'Search is slow', 'Task'), candidates: c, seed: 42 }, 'a2b4bef6be4b45f2dc1095a5ec0f77027bd5dc7f5f783a2ce978359351ee6730'],
];

describe('golden hashes (retrace-core/2, from 2.6.0)', () => {
  it('engine version unchanged', () => expect(ENGINE_VERSION).toBe('retrace-core/2'));
  for (const [name, input, root] of GOLDEN) {
    it(name, () => {
      const t = runTriage(input);
      expect(t.rootHash).toBe(root);
      expect(replay(t, input).ok).toBe(true);
    });
  }
});
