# Checkpoints 33–35: Enterprise Hardening + Pilot Readiness (Consolidated)

This consolidated checkpoint record restores the 33–35 planning and execution narrative and should remain the top-level index for this hardening phase.

## Scope by Checkpoint

- **Checkpoint 33 — Security Hardening**: tenant isolation, capability guards, route security boundaries, auditability requirements, and no-secret diagnostic standards.
- **Checkpoint 34 — Workflow + Approval Operations**: operator workflows, approval state transitions, policy exception lifecycle, SLA-aware queue operations, and governance-safe execution gating.
- **Checkpoint 35 — Enterprise Packaging + Pilot Readiness**: tenant provisioning, pilot profile baseline, support diagnostics, M365 onboarding checklist, pilot readiness API/UI, and demo/pilot separation protections.

## Canonical Detailed Specs

- `docs/checkpoints/checkpoint-33-security-hardening.md`
- `docs/checkpoints/checkpoint-34-workflow-approval-ops.md`
- `docs/checkpoints/checkpoint-35-pilot-readiness.md`

## Cross-Checkpoint Constraints (33–35)

1. Tenant isolation is mandatory across all APIs, scripts, and data operations.
2. Capability-based authorization is mandatory for operational routes.
3. Auditability is mandatory for operator-impacting actions.
4. Diagnostics and support surfaces must never return secrets/tokens/raw credentials.
5. Demo and pilot/prod tenants must be explicitly separated with reset protections.
6. No autonomous execution expansion in this phase.

## Delivered Operational Foundation

- Security and route-guard boundary enforcement from Checkpoint 33.
- Workflow and policy exception operational controls from Checkpoint 34.
- Pilot-readiness and supportability surfaces from Checkpoint 35.

## Phase Exit Criteria

The 33–35 phase exits when:

- security boundaries are enforced and test-covered,
- workflow and governance operations are test-covered,
- pilot readiness and support diagnostics are available and tenant-scoped,
- demo/pilot separation protections are in place,
- and this consolidated checkpoint index plus authority registry are maintained.

## Next Phase Rule

After Checkpoint 35.1, platform motion is **review + stabilization** (design-partner pilot feedback loop), not subsystem expansion.
