# Operations TODO

This board keeps coordination work visible while preserving Markdown for agents.

## Inbox

### TODO-010 - Triage Facilities Requests

- Status: Inbox
- Priority: Medium
- Owner: Casey
- Conflict risk: Low
- Last updated: 2026-04-29

Summary:
- Sort new facilities requests by urgency, owner, and approval needs.

Scope:
- Vendor calls, work orders, and safety escalations.

Acceptance criteria:
- Each request has an owner, priority, and next action.

Verification:
- Review exported Markdown.

## Ready

## In Progress

### TODO-012 - Draft Runner Isolation Notes

- Status: In Progress
- Priority: High
- Owner: Riley
- Conflict risk: High
- Last updated: 2026-04-29

Summary:
- Document low-privilege runner host expectations.

Scope:
- Docker, WSL2, path mounts, and Codex CLI availability.

Acceptance criteria:
- A self-host operator can see exactly where Codex executes.

Verification:
- Read through deployment smoke test.

### TODO-011 - Add Approval Routing Module

- Status: In Progress
- Priority: High
- Owner: Morgan
- Conflict risk: Medium
- Last updated: 2026-04-29

Summary:
- Add a reusable module for approval requests and decision records.

Scope:
- UI defaults, exported request packet text, and tests.

Acceptance criteria:
- Money, access, legal, and policy exceptions require human approval.

Verification:
- npm run validate

## Blocked

### TODO-013 - Confirm Proxy Standard

- Status: Blocked
- Priority: Medium
- Owner: Unassigned
- Conflict risk: Medium
- Last updated: 2026-04-29

Summary:
- Pick the first documented reverse proxy example.

Scope:
- Caddy, Nginx, or Traefik guidance.

Acceptance criteria:
- One concrete TLS path exists without implying it is the only supported proxy.

Verification:
- Manual docs review.

## Done

### TODO-009 - Add Queue Request Script

- Status: Done
- Priority: High
- Owner: Sam
- Conflict risk: Low
- Last updated: 2026-04-28

Summary:
- Add deterministic local queue write behavior.

Scope:
- scripts/queue-request.mjs

Acceptance criteria:
- Invalid packets fail before queue write.

Verification:
- npm run validate
