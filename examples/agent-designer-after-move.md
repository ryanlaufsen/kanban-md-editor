# TODO

Last updated: 2026-04-29

## Inbox

- None.

## Ready

### TODO-001 - Expand Archetypes And Custom Agent Capability

- Status: Ready
- Priority: High
- Owner: Unassigned
- Conflict risk: Medium
- Last updated: 2026-04-29

Summary:
- Expand Agent Designer beyond the first three archetypes while building the foundation for capable custom agents.

Scope:
- Add role-specific defaults, approval gates, n8n workflow expectations, and evaluation scenarios.

Acceptance criteria:
- At least three new archetypes are implemented from the priority list.
- Custom-role flow can create a valid request without pretending a preset exists.

Verification:
- npm run validate

## In Progress

### TODO-002 - Harden And Operationalize Self-Host n8n Control Plane

- Status: In Progress
- Priority: High
- Owner: Unassigned
- Conflict risk: Medium
- Last updated: 2026-04-29

Summary:
- Implement a production-grade self-host n8n control-plane path for webhook intake, queueing, approval, and Codex execution.

Scope:
- Update docs, n8n templates, validation, and runner scripts.

Acceptance criteria:
- Docs identify intake queue and approval execution templates as the production path.
- npm run validate passes.

Verification:
- npm run validate

## Blocked

- None.

## Done

- None.
