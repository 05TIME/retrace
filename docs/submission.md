# Codegeist 2026 submission: Retrace

Ready-to-paste text for each Devpost field. Items marked ✋ are for Randy.

## Project name
Retrace

## Tagline (short)
AI triage for Jira you can replay: every decision is hash-chained, explained and verifiable.

## Category
Apps for Software Teams

## Bonus prizes
- Best Agents (Rovo/Assignable agents)
- Best app with Atlassian MCP

## Links
- **Install link (judges):** [Retrace install link](https://developer.atlassian.com/console/install/2b9b66b6-b31e-4dcd-810f-9b73f6cf9015?signature=AYABeJPb8rNvI0JRhkbPWPL6fcIAAAADAAdhd3Mta21zAEthcm46YXdzOmttczp1cy13ZXN0LTI6NzA5NTg3ODM1MjQzOmtleS83MDVlZDY3MC1mNTdjLTQxYjUtOWY5Yi1lM2YyZGNjMTQ2ZTcAuAECAQB4CxqLTo9l4lqXuFjNim1xJM%2Bp%2F3TVP9xHS2BrU5DRRucB3XXQNZsR5754IU%2BGMj7HUAAAAH4wfAYJKoZIhvcNAQcGoG8wbQIBADBoBgkqhkiG9w0BBwEwHgYJYIZIAWUDBAEuMBEEDOWE4hdSLjHnL9OMdgIBEIA79Vg%2BcPAKMA3CVkbRTYiVWHykEdm%2BUFMEl9UwRjn3fZO%2FXZLewTwpXb5NiQSEf6QJ1V0amZpaED360RkAB2F3cy1rbXMAS2Fybjphd3M6a21zOmV1LXdlc3QtMTo3MDk1ODc4MzUyNDM6a2V5LzQ2MzBjZTZiLTAwYzMtNGRlMi04NzdiLTYyN2UyMDYwZTVjYwC4AQICAHi9bVMAkme4qVQX1fQHo6ePw3H40A7cGfz7yrmSfBWMXgElEBlFlAcBEXe1uje7%2FMMkAAAAfjB8BgkqhkiG9w0BBwagbzBtAgEAMGgGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMhiDuGf88YsuYXcwmAgEQgDucoI29afF72AhJEhlNVFSCN4BmQAxFWaVzZWx5jsMZdkwRy7sWubY05OnXnZ0kD6Wi0AhmHd%2FoQyVlsgAHYXdzLWttcwBLYXJuOmF3czprbXM6dXMtZWFzdC0xOjcwOTU4NzgzNTI0MzprZXkvNmMxMjBiYTAtNGNkNS00OTg1LWI4MmUtNDBhMDQ5NTJjYzU3ALgBAgIAeDYASx0XCjkny4iLV6vz%2BKtEGSGT6kdt0QRpkn6D%2FlVEAWYO%2F0TtZ4JN6Sj4N6u3bkwAAAB%2BMHwGCSqGSIb3DQEHBqBvMG0CAQAwaAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAwTIxOV3iMFBRifFqECARCAO8pjvTcn5e4KfW0GV8CD5MT4rs%2FsbNI2i6p4WYEMAsVXnaK8KxU8lie2wuppUk3ODllswk6Cer621pcKAgAAAAAMAAAQAAAAAAAAAAAAAAAAAF5bsMyVmuTJSsg0gjZTW83%2F%2F%2F%2F%2FAAAAAQAAAAAAAAAAAAAAAQAAADKfWFD%2BTdlm7yZflZj%2FIcYEt7aPjEPbStzjTi0EWqJtJ9SSJD3aI1A1q1x%2B9vL0lrpPEyBy1Nt4Q9m3QE7eMM2UqRg%3D&product=jira)
- **Repository (public, MIT):** https://github.com/05TIME/retrace
- **Testing instructions:** https://github.com/05TIME/retrace/blob/main/docs/judges.md
- **Agent skill (open source):** https://github.com/05TIME/retrace/blob/main/skills/retrace-triage/SKILL.md
- **Video (YouTube, public, under 5 min):** https://youtu.be/bnv9z-HhGXI
- **Devpost submission:** https://devpost.com/software/retrace-6i7jep (submitted 2026-10-30; editable until Dec 22)

## Built with
forge, atlassian-forge, jira, rovo, rovo-agents, rovo-mcp, mcp, ui-kit, forge-storage, typescript, react, node.js, vitest

---

## Inspiration
AI agents are getting good at triaging Jira issues, but teams can't check *why* an agent chose a priority or an assignee, or whether it would choose the same thing tomorrow. For software teams, that makes AI triage hard to trust and impossible to audit. We wanted triage that you can replay like a test: same inputs, same decision, same hash, with the reasons written out.

## What it does
Retrace suggests a priority, labels and an assignee for a Jira issue, and records every step of that decision as a deterministic, sha256 hash-chained trace.

- **Triage + record:** a priority badge, labels and an assignee, with plain-language reasons ("crash: the app crashes or freezes (+4)") and a root hash.
- **Determinism:** triage an unchanged issue again and you get the *same* hash. Retrace says "Unchanged" instead of saving a new trace.
- **Replay:** re-execute the stored trace from its recorded inputs and check every step hash. The result is **Verified**, or **Mismatch** naming the step that diverged.
- **What-if:** pretend the issue had other labels, had labels removed, or had a forced priority. Retrace reruns with the same seed and shows a before → after diff. Nothing is saved.
- **Three surfaces, one engine:** a Jira issue sidebar panel, a Rovo agent (Retrace Triage), and an MCP server that Rovo Studio agents and outside MCP clients can use, plus an open-source SKILL.md.

Retrace is read-only and advisory. It never edits issues.

## How we built it
- **Forge** app on Jira Cloud. The UI Kit issue panel is in the issue sidebar (`jira:issueContext`), and Forge storage (KVS) holds traces. Jira REST is called through `asApp`. Scopes are just `read:jira-work` and `storage:app`, with no egress.
- **Rovo:** a `rovo:agent` with four `action` modules: find-issues (JQL search, so the agent never guesses keys), triage-issue, replay-trace and what-if-trace. A `rovo:skill` packages SKILL.md instructions.
- **MCP:** a `rovo:mcp` module exposes the same four actions as tools, at `https://mcp.atlassian.com/forge/2b9b66b6-b31e-4dcd-810f-9b73f6cf9015`.
- **Deterministic core** in plain TypeScript: canonical JSON, a seeded RNG for tie-breaks, a sha256 step chain, replay, and a what-if diff. Time is never hashed, and order-insensitive inputs are sorted.
- **Tests:** 57 vitest tests, including golden root-hash fixtures that pin the engine's output and an end-to-end run through the MCP tool handlers.

## Challenges we ran into
- **Keeping determinism honest.** During development, rewording a single reason string changed every step hash, and old traces stopped verifying. We kept the hashed text fixed and moved friendlier wording into the display layer. Golden-hash tests now fail if hashed output drifts within an engine version.
- **Agents guessing issue keys.** Early on, Rovo invented keys and got 404s. We added a find-issues action and prompt rules so the agent only uses real keys.
- **Making the panel visible and robust.** We moved to the issue sidebar section, and added loading states, an error boundary, and handling for traces stored in an older format.
- **Making what-if mean what it says.** Removing a label now also stops the scorer from re-detecting it in the text, and the result is still reproducible.

## Accomplishments that we're proud of
- A Rovo answer, the issue panel and an MCP client all produce the *same* trace hash for the same issue.
- Replay gives a clear Verified or Mismatch result that anyone can check.
- An explainable scorer whose reasons read like a colleague's notes.
- A small, read-only permission footprint with no external egress.

## What we learned
- Building Rovo agents, actions, skills and MCP tools on Forge, and how one action can serve all three.
- Determinism is a product feature: it has to be designed in (fixed seeds, canonical data, no clocks) and then protected with tests.
- Agents behave far better when their tools return clear errors and their instructions say exactly what to do when something fails.

## What's next for Retrace
- Learning assignee skills from components and history, still deterministically.
- Optionally applying the suggestion to the issue, with the trace hash attached as evidence.
- Confluence audit reports of trace history.
- A Marketplace listing.

---

## Bonus write-up: Best Agents (Rovo)
Retrace ships a `rovo:agent` ("Retrace Triage") backed by four reusable `action` modules: find-issues, triage-issue, replay-trace and what-if-trace. It also has a `rovo:skill` (`skills/retrace-triage/SKILL.md`) that other agents can use. The agent's prompt and the skill tell it to look up real issue keys instead of guessing them, cite the 12-character trace hash, report replay as ✅ Verified or ❌ Mismatch, and summarise what-if results as before → after. Every agent answer can be checked, because it comes from a stored trace that anyone can replay from the issue panel.

## Bonus write-up: Best app with Atlassian MCP
Retrace declares a `rovo:mcp` module ("Retrace MCP") that exposes the same four actions as MCP tools. They appear in Rovo Studio, and once a site admin enables external MCP, they work in any MCP client (Claude, Cursor, VS Code…) at `https://mcp.atlassian.com/forge/2b9b66b6-b31e-4dcd-810f-9b73f6cf9015`. An open-source, MIT-licensed SKILL.md explains to third-party agents when and how to call each tool and how to handle errors. MCP calls use the same deterministic engine as the panel and Rovo, so an outside agent can triage an issue and you can verify the result in Jira, hash for hash.

---

## Testing instructions (paste into the Devpost testing field)
1. Open the install link above as a **site admin**, choose your Jira Cloud site and **Jira**, approve `read:jira-work` and `storage:app`, and install.
2. Open any issue → right sidebar → **Retrace trace** → **Triage + record**. You'll see a priority, labels, an assignee, the reasons and a root hash.
3. Click **Triage + record** again. Expect "Unchanged" with the same hash. Then click **Replay** and expect **Verified**.
4. What-if: tick **security** (or remove a detected label) and/or choose **Force Highest**, then **Run what-if**. You'll see the before → after diff. Nothing is saved.
5. Rovo (needs a Rovo-enabled site): open Rovo chat → **Retrace Triage** → "Triage the newest issue and record a trace", then "Replay the trace for this issue and verify it".
6. MCP (optional): in admin.atlassian.com → Apps → Sites → *your site* → Connected apps → Retrace, enable the tools. Then add `https://mcp.atlassian.com/forge/2b9b66b6-b31e-4dcd-810f-9b73f6cf9015` to an MCP client and call `find-issues`, then `triage-issue` and `replay-trace`.

No configuration, API keys or external services are needed. Full guide: docs/judges.md.
