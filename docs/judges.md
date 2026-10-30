# For Codegeist judges

Retrace is a Forge app for Jira Cloud. It needs no configuration, API keys or external services.

## Install Retrace
1. Open the **[Retrace install link](https://developer.atlassian.com/console/install/2b9b66b6-b31e-4dcd-810f-9b73f6cf9015?signature=AYABeJPb8rNvI0JRhkbPWPL6fcIAAAADAAdhd3Mta21zAEthcm46YXdzOmttczp1cy13ZXN0LTI6NzA5NTg3ODM1MjQzOmtleS83MDVlZDY3MC1mNTdjLTQxYjUtOWY5Yi1lM2YyZGNjMTQ2ZTcAuAECAQB4CxqLTo9l4lqXuFjNim1xJM%2Bp%2F3TVP9xHS2BrU5DRRucB3XXQNZsR5754IU%2BGMj7HUAAAAH4wfAYJKoZIhvcNAQcGoG8wbQIBADBoBgkqhkiG9w0BBwEwHgYJYIZIAWUDBAEuMBEEDOWE4hdSLjHnL9OMdgIBEIA79Vg%2BcPAKMA3CVkbRTYiVWHykEdm%2BUFMEl9UwRjn3fZO%2FXZLewTwpXb5NiQSEf6QJ1V0amZpaED360RkAB2F3cy1rbXMAS2Fybjphd3M6a21zOmV1LXdlc3QtMTo3MDk1ODc4MzUyNDM6a2V5LzQ2MzBjZTZiLTAwYzMtNGRlMi04NzdiLTYyN2UyMDYwZTVjYwC4AQICAHi9bVMAkme4qVQX1fQHo6ePw3H40A7cGfz7yrmSfBWMXgElEBlFlAcBEXe1uje7%2FMMkAAAAfjB8BgkqhkiG9w0BBwagbzBtAgEAMGgGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMhiDuGf88YsuYXcwmAgEQgDucoI29afF72AhJEhlNVFSCN4BmQAxFWaVzZWx5jsMZdkwRy7sWubY05OnXnZ0kD6Wi0AhmHd%2FoQyVlsgAHYXdzLWttcwBLYXJuOmF3czprbXM6dXMtZWFzdC0xOjcwOTU4NzgzNTI0MzprZXkvNmMxMjBiYTAtNGNkNS00OTg1LWI4MmUtNDBhMDQ5NTJjYzU3ALgBAgIAeDYASx0XCjkny4iLV6vz%2BKtEGSGT6kdt0QRpkn6D%2FlVEAWYO%2F0TtZ4JN6Sj4N6u3bkwAAAB%2BMHwGCSqGSIb3DQEHBqBvMG0CAQAwaAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAwTIxOV3iMFBRifFqECARCAO8pjvTcn5e4KfW0GV8CD5MT4rs%2FsbNI2i6p4WYEMAsVXnaK8KxU8lie2wuppUk3ODllswk6Cer621pcKAgAAAAAMAAAQAAAAAAAAAAAAAAAAAF5bsMyVmuTJSsg0gjZTW83%2F%2F%2F%2F%2FAAAAAQAAAAAAAAAAAAAAAQAAADKfWFD%2BTdlm7yZflZj%2FIcYEt7aPjEPbStzjTi0EWqJtJ9SSJD3aI1A1q1x%2B9vL0lrpPEyBy1Nt4Q9m3QE7eMM2UqRg%3D&product=jira)**.
2. You must be a **site admin**. Pick your Jira Cloud site, select **Jira**, review the permissions (`read:jira-work`, `read:jira-user` to read Jira user info and suggest an assignee, `storage:app`; no external egress) and choose **Install**.
3. Open any Jira issue. The **Retrace** sidebar section (issue context, "Retrace trace") appears on the right; click it to expand.
4. Rovo agent and Rovo Studio: the site must have Rovo enabled. Open Rovo chat → agents → **Retrace Triage**.
5. MCP clients (optional): an admin enables external MCP for Retrace under admin.atlassian.com → Apps → Sites → *site* → Connected apps → Retrace (see "Try the MCP surface" below).

> **Note:** the installer must be a site admin. The Rovo agent, Rovo Studio and MCP features need a site with Rovo; the issue panel works on any Jira Cloud site.

If you need a fresh site, a free Jira Cloud developer site works for the panel. Rovo needs a Rovo-enabled site.

**What Retrace stores:** one trace per triaged issue in Forge storage (KVS, hosted by Atlassian). A trace contains the issue key, summary, description, labels, components and type, plus the assignable users' Atlassian account IDs and display names used for the assignee suggestion. Nothing leaves Atlassian, and Retrace never edits issues. Uninstalling removes the stored data.

## Try it in 2 minutes
1. Open any Jira issue and click **Retrace trace** in the sidebar.
2. Click **Triage + record** and read the decision and reasons.
3. Click **Triage + record** again. It should say "Unchanged: same inputs → same hash".
4. Click **Replay**. It should show **Verified**.
5. Under What-if, tick **security**, then click **Run what-if** to see the before → after diff.
6. In Rovo chat, pick **Retrace Triage** and try "Triage the newest issue", then "Replay the trace for this issue and verify it".

## Links
- Demo video: **TBD**
- Repository: https://github.com/05TIME/retrace


## Try the MCP surface (Best app with Atlassian MCP)

Retrace declares a `rovo:mcp` module exposing `find-issues`, `triage-issue`, `replay-trace` and `what-if-trace`, plus a `rovo:skill` with an open-source [SKILL.md](../skills/retrace-triage/SKILL.md).

1. Install Retrace on your Jira site with the install link.
2. In admin.atlassian.com → Apps → Sites → *your site* → Connected apps → Retrace, turn on the tools for external MCP (off by default).
3. In an MCP client, add the remote server `https://mcp.atlassian.com/forge/2b9b66b6-b31e-4dcd-810f-9b73f6cf9015`, complete OAuth and choose your site.
4. Ask: "Use find-issues, then triage the newest issue." Then: "Replay it" (expect verified, same root hash as the panel) and "What if it had the security label?".
5. In Rovo Studio you can also build a custom agent and add the Retrace MCP tools.

The same trace is visible in the issue's Retrace sidebar, which shows that all three surfaces share one deterministic engine.
