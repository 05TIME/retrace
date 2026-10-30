# Retrace: demo script (voiceover ≈ 1:25, ≈ 1:38 with title cards)

**Setup:** Chrome at 1920×1200 (or 1280×800), zoom 110%, notifications off, one tab per site, signed in.
- **Demo site** `one-atlas-qiot.atlassian.net`, issue **MOBL-57**. Re-triage it once before recording so there's no legacy notice. Use the Rovo Studio draft agent "Retrace MCP test" (has the Retrace MCP tools).
- **Dev site** `timeoe-retrace.atlassian.net`, issue **KAN-1** (panel shots, backup).

| # | Time | On screen (exact actions) | Voiceover |
| --- | --- | --- | --- |
| 1 | 0:00–0:15 | Title card "Retrace: AI triage you can replay", then the MOBL board. | "AI can triage Jira for you. But can you prove *why* it decided, or that it would decide the same tomorrow? Retrace makes every triage decision provable." |
| 2 | 0:15–0:45 | Rovo chat → agent **Retrace Triage** → click starter **"Triage the newest issue and record a trace"**. Hover the issue key, then the hash. | "I ask Rovo to triage the newest issue. It looks up a real key, calls Retrace, and returns a priority, labels, an assignee, the reasons, and a trace hash." |
| 3 | 0:45–1:10 | Open **MOBL-57** → sidebar **Retrace trace**. Scroll past the priority badge and labels, the "Why" list, and the 4 trace steps with their hashes. | "The same decision is on the issue: priority, labels, assignee, and the reasons in plain words. Underneath are four hash-chained steps, each sealing the one before." |
| 4 | 1:10–1:25 | Click **Triage + record** → blue "Unchanged: same inputs → same hash". | "Triage again with nothing changed, and you get exactly the same hash. The seed is fixed and the clock is never hashed." |
| 5 | 1:25–1:40 | Click **Replay** → green **Verified**. | "Replay re-runs the stored trace and checks every step. Verified. Tamper with it and you'd see Mismatch, with the step that broke." |
| 6 | 1:40–2:05 | What-if: tick **security**, Priority stays "Keep scored" → **Run what-if** → Applied line, priority Low → High, labels gain security. Click **Reset**. | "What if this were a security issue? Same seed, one change, and Retrace shows exactly what moves: before and after. Nothing is saved." |
| 7 | 2:05–2:20 | Rovo Studio → draft agent **Retrace MCP test** → type "Replay the trace for MOBL-57 and give the root hash" → Verified with the same root hash as the panel. | "The same tools are also an MCP server. Here a Rovo Studio agent calls Retrace over MCP and gets the identical hash, so any MCP client can triage, and you can verify it in Jira." |
| 8 | 2:35–2:50 | Architecture diagram (docs/architecture.png), then the repo with SKILL.md. | "Built on Forge: a Rovo agent, a skill, an MCP server, a UI Kit panel and Forge storage, all on one deterministic, fully tested core. Read-only, no egress. Retrace: AI triage you can replay." |

**Backup:** if MOBL-57 misbehaves, record shots 3–6 on KAN-1 (it triages High with an outage label; its "No change" what-if also shows the Applied line).

Voiceover is computer-generated (edge-tts, en-US-AndrewNeural). The pipeline lives outside the repo, in /workspace/codegeist/video (shots.md, assemble.sh).
