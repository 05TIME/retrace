# Retrace

**Auditable Rovo triage for Jira.** Retrace is a Forge app (Codegeist 2026) where a Rovo agent's triage suggestions (priority, labels, assignee) are recorded as deterministic, sha256 hash-chained traces. Any trace can be **replayed** to prove it reproduces byte-for-byte, or rerun **what-if** with changed inputs to see exactly which decisions would change, all from a Jira issue panel.

## Modules
| Module | Key | Purpose |
| --- | --- | --- |
| `rovo:agent` | `retrace-agent` | "Retrace Triage" agent |
| `rovo:action` | `triage-issue`, `replay-trace`, `what-if-trace` | Reusable tools for any agent |
| `jira:issuePanel` | `retrace-panel` | UI Kit panel: trace, replay, what-if diff |

## How determinism works
- Canonical JSON (sorted keys, no whitespace) for every step's input/output
- Seeded PRNG (default seed derived from the issue key) for tie-breaks
- Each step hash = `sha256(prevHash | canonical(step))`, starting at a zero genesis hash
- The clock is injected and never hashed

## Develop
Requires Node 22.23+ or 24.22+ (Forge CLI 15 requirement).
```sh
npm install
npm test          # vitest, pure core
npm run typecheck
```

## Deploy (needs an Atlassian account)
```sh
npm install -g @forge/cli
forge login        # email + API token from id.atlassian.com
forge register     # replaces app.id in manifest.yml
forge deploy
forge install      # pick your Jira Cloud developer site
```

License: MIT
