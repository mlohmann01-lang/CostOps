# Demo Seed Data (Deterministic)

Tenant: `Contoso Retail Group` (`tenant-contoso-retail-group`), AU/NZ retail org (~4,200 employees; ~5,800 M365 licenses).

## Seed Commands
- `pnpm seed:golden-demo`
- `pnpm reset:golden-demo`

## Seeded Scenarios
- **A Healthy Recommendation**: inactive user reclaim, high trust, orchestration-ready, realized.
- **B Trust Review Required**: rightsize candidate, low trust, unresolved warning.
- **C Quarantined**: suppressed recommendation due to critical reconciliation blocker.
- **D Drifted Outcome**: realized then drifted (license re-assigned).
- **E Reversed Outcome**: realized then reversed via business exception.

## Explainability Artifacts
Every recommendation receives deterministic:
- rationale snapshot
- decision traces
- evidence lineage
- trust reasoning
- governance reasoning
- savings confidence

## Outcome Proof
Append-only history is persisted in `resolution_evidence` and `outcome_ledger_references` to preserve replay-safe proof timelines.
