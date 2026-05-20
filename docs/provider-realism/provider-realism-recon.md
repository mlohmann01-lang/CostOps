# Provider Realism Recon

## Provider realism standards
- Deterministic provider semantic profiles must encode propagation, dependency, rollback, verification, and governance nuances per action.
- Provider risks must be explicit and testable (no placeholder-only behavior).

## Provider propagation semantics
- Provider-side propagation delays and nested assignment chains influence execution readiness and verification timing.

## Provider latency / eventual consistency semantics
- Sync and reconciliation lag are modeled as verification-delay risks and can block or downgrade confidence.

## Provider rollback realism
- Rollback timing and feasibility vary by provider identity/data/control plane propagation.

## Provider verification failure modes
- Provider-specific failure classes escalate governance severity and manual review tiers.

## Provider dependency semantics
- Upstream and downstream dependencies (identity, CMDB, IAM, dashboards, jobs, catalogs) drive blast-radius elevation.

## Provider entitlement semantics
- Entitlement ambiguity/incompleteness prevents aggressive execution eligibility.

## Provider runtime economics semantics
- Cost/runtime impacts (DBU, fail-safe retention, cold-start/warm-up, queueing) must be reflected in risk and approval profiles.

## Provider approval/governance nuances
- CAB, security, legal/procurement, and protected shared-service controls are explicit manual/escalation gates.

## Explicitly rejected
- provider-specific orchestration runtimes
- uncontrolled provider mutation
- hidden execution paths
- provider logic bypassing canonical runtime
- abstraction explosion
