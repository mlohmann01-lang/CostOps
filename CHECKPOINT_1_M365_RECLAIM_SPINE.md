# Checkpoint 1 — M365 Reclaim Spine

## What exists

- **Connector readiness**
  - M365 readiness endpoint and permission readiness model (`READY`, `DEGRADED`, `BLOCKED`).
- **Smoke test**
  - LIVE_GRAPH smoke test route with read-only validation path and masked sample output.
- **Full sync**
  - Explicit M365 full sync route that runs ingestion and persists sync metadata.
- **Canonical M365 users**
  - `m365_users` canonical table with tenant, user identity, normalized state, and sync provenance/freshness columns.
- **Playbook evaluation events**
  - Evaluation events are persisted for each candidate/playbook evaluation run.
- **Recommendations from canonical state**
  - Recommendation generation reads latest sync metadata + canonical users and no longer imports ingestion.
- **Trust V2**
  - Trust scoring and gate assignment integrated into recommendation creation.
- **Action risk**
  - Action risk profile lookup and risk class usage in execution gating.
- **Authorization**
  - Execution/approval authorization checks by actor and role.
- **Idempotency**
  - Idempotency key generation and duplicate execution guard path.
- **Execution**
  - Execution engine gate + authorization + dry-run/execute decision flow.
- **Ledger**
  - Outcome ledger entry creation with trust snapshot and execution evidence.
- **Drift**
  - Drift checks for post-execution reclaim outcomes.
- **Architecture boundary guards**
  - Static boundary tests to prevent forbidden cross-layer imports.

## What is still simulated

- **Real licence removal execution**
  - Execution path remains simulated; no production Graph write operation for license removal.
- **Production RBAC/user auth**
  - Actor model is registry-based MVP logic, not enterprise auth/identity integration.
- **Full Graph activity fidelity**
  - Activity signal fidelity is partial/degraded tolerant and not yet production-complete.
- **Pricing/contract-grade savings verification**
  - Savings estimates are not yet contract/SKU catalogue verified in production terms.

## Next build options

1. **Real Graph execution dry-run + write path**
   - Add production-grade Graph execution surface with reversible dry-run and audited write path.
2. **Production RBAC/auth**
   - Integrate enterprise identity, tenant-aware policy controls, and approver workflows.
3. **M365 price/SKU cost model**
   - Add SKU-aware pricing and contract-based savings verification.
4. **Second playbook: E5 rightsizing**
   - Add second canonical playbook to validate multi-playbook governance and execution controls.
