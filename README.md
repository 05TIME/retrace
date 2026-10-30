# Retrace

**Auditable Rovo triage for Jira.** AI agents are great at triage, but nobody can check *why* they decided something, or whether they'd decide the same thing tomorrow. Retrace is a Forge app (Codegeist 2026) where every triage decision (priority, labels, assignee) is recorded as a deterministic, sha256 hash-chained trace, with the reasons written out in plain words. From Rovo chat or the Jira issue view you can:

- **Triage + record**: get a suggested priority, labels and assignee, with reasons and a root hash.
- **Replay**: rerun the stored trace and get a **Verified** or **Mismatch** badge for every step hash.
- **What-if**: pretend the issue had other labels or a forced priority, and see a before → after diff without changing anything.

Same inputs → same hash, every time.

## Architecture

```mermaid
flowchart LR
  U[User in Jira] -->|chat| R[Rovo: Retrace Triage agent]
  U -->|issue view| P[UI Kit panel: issueContext + issuePanel]
  R -->|actions| A[find-issues / triage-issue / replay-trace / what-if-trace]
  P -->|invoke| S[Resolver]
  A --> SV[service.ts]
  S --> SV
  SV -->|read:jira-work| J[(Jira REST API)]
  SV --> C[Deterministic core: canonical JSON, seeded RNG, rule scorer, hash chain]
  SV -->|storage:app| K[(Forge KVS: trace + inputs per issue)]
```

The core (`src/core`) is pure TypeScript with no Forge imports, so it is fully unit-tested.

## Modules
| Module | Key | Purpose |
| --- | --- | --- |
| `rovo:agent` | `retrace-agent` | "Retrace Triage" agent with conversation starters for triage, replay and what-if |
| `action` | `find-issues`, `triage-issue`, `replay-trace`, `what-if-trace` | Tools the agent calls |
| `jira:issueContext` | `retrace-context` | "Retrace trace" section in the issue sidebar |
| `jira:issuePanel` | `retrace-panel` | Same UI as an issue panel |

## How the scorer works
Rules are keyword and label based and written into the trace, so every point is explained:

| Label | Example words | Points |
| --- | --- | --- |
| security | security, vulnerability, auth, token, leak, password | +5 |
| outage | outage, down, unavailable, 500/502/503 | +5 |
| data-loss | data loss, corrupt, deleted, lost | +4 |
| crash | crash, freeze, hang | +4 |
| performance | slow, latency, timeout, memory | +3 |
| bug | bug, error, broken, fails, regression (or issue type Bug) | +2 |
| ux | button, layout, css, typo, display | +1 |
| docs | docs, documentation, readme | −1 |

The issue type sets the starting score (Incident 3, Bug 2, other types 1). Urgency words (urgent, blocker, production, all users) add +2. Existing Jira labels with these names count too. Final score: **≥9 Highest, 6–8 High, 3–5 Medium, 1–2 Low, ≤0 Lowest**. The assignee is the best skill match with the fewest open issues, and ties are broken by the seeded RNG.

## How determinism works
- Every step's input and output is serialized as canonical JSON (sorted keys, no whitespace, order-insensitive lists sorted).
- A seeded PRNG (mulberry32, seed derived from the issue key) breaks ties, so "random" is reproducible.
- Each step hash = `sha256(prevHash | canonical(step))`, chained from a zero genesis hash; the last one is the root hash.
- The clock is injected and never hashed, so re-triaging an unchanged issue gives the same root hash.
- Replay re-executes from the stored inputs and compares every step hash. What-if reruns with the same seed, so only your changes can move the outcome.
- Traces carry an engine version. Traces from older versions are shown as "legacy, re-triage" instead of an error.

## Develop
Requires Node 22.23+ (Forge CLI requirement).
```sh
npm install
npm test           # vitest, pure core
npm run typecheck  # tsc --noEmit
npm run lint       # forge lint
```

## Deploy and install
```sh
npm install -g @forge/cli
forge login        # email + API token from id.atlassian.com
forge register     # only for your own copy: replaces app.id in manifest.yml
forge deploy
forge install      # pick your Jira Cloud site (Rovo needs a site with Rovo enabled)
```

Then open any Jira issue, find **Retrace trace** in the sidebar, and click **Triage + record**. In Rovo chat, pick the **Retrace Triage** agent.

See [docs/demo-script.md](docs/demo-script.md) and [docs/judges.md](docs/judges.md).

License: MIT

## What-if: removing labels

Removing a label in a what-if (panel checkbox or Rovo `removeLabels`) also stops the scorer from re-detecting it in the issue text. The suppressed labels are recorded in the `detect-labels` step input, so what-if hashes stay deterministic; normal traces (no removals) hash exactly as before.
