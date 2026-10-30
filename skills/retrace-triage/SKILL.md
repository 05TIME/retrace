---
name: retrace-triage
description: Triage Jira issues with Retrace and prove every decision. Use when a user wants a suggested priority, labels or assignee for a Jira issue, wants to verify (replay) a past triage decision, or asks "what if" an issue had different labels or priority.
compatibility: Requires the Retrace Forge app installed on a Jira Cloud site. Works in Rovo and in any MCP client connected to https://mcp.atlassian.com/forge/2b9b66b6-b31e-4dcd-810f-9b73f6cf9015
license: MIT
allowed-tools: find-issues triage-issue replay-trace what-if-trace
---

# Retrace triage

Retrace suggests a priority, labels and assignee for a Jira issue using a deterministic scorer, and stores each decision as a hash-chained trace that can be replayed and verified. Suggestions are advisory: Retrace never edits the issue.

## Tools

| Tool | Use it to | Key inputs |
| --- | --- | --- |
| `find-issues` | Get real issue keys, newest first | `project` (optional key), `text` (optional words), `maxResults` (1-20) |
| `triage-issue` | Triage an issue and record a trace | `issueKey` (required), `seed` (optional integer) |
| `replay-trace` | Re-run the stored trace and verify every step hash | `issueKey` |
| `what-if-trace` | Re-run with changed inputs, same seed; nothing is stored | `issueKey`, `addLabels`, `removeLabels`, `forcePriority`, `overridesJson` |

## Workflow

1. **Never guess an issue key.** If the user did not give an exact key (or says "newest", "latest" or describes an issue), call `find-issues` first and use a key it returns. "Newest" is the first result.
2. **Triage:** call `triage-issue`. Report `issueKeyUsed`, `decision.priority`, `decision.labels`, the assignee (if `decision.assignee` is null, say "Unassigned: no assignable users on this project"), the `decision.reasons`, and the first 12 characters of `rootHash`.
   - `unchanged: true` means the issue had not changed: the same inputs produced the same hash. Say so; that is determinism.
   - `previousRootHash` set and `unchanged: false` means the issue changed since the last trace.
3. **Verify:** call `replay-trace`. If `ok` is true report "✅ Verified" with `rootHash`; otherwise "❌ Mismatch" with `divergedAt` and `reason`. If `found` is false, relay `note` and offer to triage first.
4. **What-if:** call `what-if-trace` with the simplest inputs that express the question:
   - `addLabels` / `removeLabels`: comma-separated, e.g. `security`. Removed labels are also not re-detected from the issue text.
   - `forcePriority`: one of Highest, High, Medium, Low, Lowest.
   - `overridesJson`: only for summary, description, issueType or components, e.g. `{"summary":"Checkout is down"}`.
   Present only the fields in `diff` as before → after, plus `rootHash` → `altRootHash`. If `diff` is empty, say nothing would change and list `appliedSummary` (the overrides matched the current decision).

## Errors

- Every tool returns `{ "error": "..." }` on failure instead of throwing. Show the message and the key used.
- "A valid Jira issue key is required": the key was missing or malformed; call `find-issues`.
- A 404 or permission error: the key does not exist or the user cannot see it; call `find-issues` and offer real keys. Do not retry guesses.
- `legacy: true`: the stored trace came from an older engine; triage again to create a fresh one.

## Rules

- Only report what the tools return. Never invent decisions or hashes.
- Always cite the 12-character trace hash so users can refer to it.
- Do not claim the issue was changed.
