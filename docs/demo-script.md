# Retrace: 3-minute demo script

Target length 2:45–3:00. Record at 1080p, browser zoom 110%. Use the Rovo demo site for the Rovo shots and any issue with a clear bug summary for the panel shots.

| Time | Shot | Say |
| --- | --- | --- |
| 0:00–0:20 | Title card, then a busy Jira backlog | "AI agents can triage Jira for you, but can you prove why they decided something, or that they'd decide the same tomorrow? Retrace makes every triage decision auditable." |
| 0:20–0:55 | Rovo chat → pick **Retrace Triage** → starter "Triage the newest issue" | "I ask Rovo to triage the newest issue. It looks up a real issue key, calls Retrace, and returns a priority, labels, an assignee, the reasons, and a trace hash." Zoom in on the hash. |
| 0:55–1:30 | Open that issue → sidebar **Retrace trace** → decision summary and trace steps | "The same decision is right on the issue. Priority badge, labels, assignee, and why in plain words. Below it are the four hash-chained steps: detect labels, score priority, pick assignee, decision." |
| 1:30–1:50 | Click **Triage + record** again → blue "Unchanged: same inputs → same hash" | "If I triage again with nothing changed, I get exactly the same hash. Clocks and randomness can't sneak in, because the seed is fixed and time is never hashed." |
| 1:50–2:10 | Click **Replay** → green **Verified** badge | "Replay re-executes the stored trace from its inputs and checks every step hash. Verified. If anyone tampered with the stored trace, this badge would say Mismatch and point to the step." |
| 2:10–2:40 | What-if: tick **security**, choose **Force Highest** → **Run what-if** → before/after lozenges | "What if this were a security issue? Tick a box and run. Retrace reruns with the same seed and shows exactly what changes: labels and priority, before and after. Nothing is saved." Optionally show the same in Rovo with the starter "What if this issue were labelled security?". |
| 2:40–3:00 | Architecture diagram from the README, then the repo | "Built on Forge with a Rovo agent, four actions, a UI Kit panel and Forge storage. The deterministic core is plain TypeScript with full tests. Retrace: AI triage you can replay." |

Checklist before recording: fresh triage on the demo issues (no legacy notice), browser notifications off, the issue chosen has at least two labels detected.
