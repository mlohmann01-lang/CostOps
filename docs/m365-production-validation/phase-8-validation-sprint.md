# Phase 8 — M365 Production Validation Sprint

Phase 8 validates the complete Certen runtime against a real Microsoft 365 tenant using one safe production wedge: **Inactive User License Reclaim**. The validation path is intentionally narrow: no autonomous execution, no rightsizing, no Copilot reclaim, no bulk changes, no scheduler, and exactly one operator-triggered `REMOVE_LICENSE` action for one approved recommendation.

## Controlled Runtime Path

```text
Connect Tenant
  ↓
Discover Users
  ↓
Discover Licenses
  ↓
Generate Recommendations
  ↓
Approve Recommendation
  ↓
Generate Dry Run
  ↓
Execute License Removal
  ↓
Verify Outcome
  ↓
Record Verified Savings
  ↓
Register Drift Monitoring
```

## Tenant Validation Checklist

| Phase | Validation | PASS criteria | FAIL behavior |
| --- | --- | --- | --- |
| A | Tenant Onboarding | Tenant reachable, token acquired, Graph reachable, all required scopes present, connector healthy. | Block onboarding and list missing permissions; never silently degrade. |
| B | Discovery Validation | Users, assigned licenses, groups, sign-in activity, departments, and cost centres are read and summarized. | Mark discovery failed/degraded with Graph evidence; do not generate recommendations from incomplete required evidence. |
| C | Recommendation Validation | Only `M365_INACTIVE_USER_LICENSE_RECLAIM` recommendations are generated; projected savings and exclusions are reported. | Do not emit executable recommendations for admins, service accounts, VIPs, excluded users, or unlicensed users. |
| D | Approval Validation | Approval request stores recommendation, evidence, reason, approver, and timestamp. | Keep recommendation pending; no dry-run execution path is unlocked. |
| E | Dry Run Validation | Dry run shows current state, future state, rollback plan, projected savings, and low risk. | Block execution if rollback is unavailable or current license state is not assigned. |
| F | Single Execution Validation | Operator-triggered Graph `assignLicense` removal runs for exactly one approved recommendation. | Record failed execution evidence; do not retry another user, SKU, campaign, or bulk action. |
| G | Outcome Validation | Graph readback proves the license was present before and absent after execution; outcome is `VERIFIED`. | Create failed verification evidence; savings remain projected-only. |
| H | Ledger Validation | Projected savings, verified savings, and variance are recorded from the verified outcome. | Ledger entry is not marked verified. |
| I | Drift Validation | Drift monitor is registered and detects the removed SKU if it is reassigned. | Raise operator-visible evidence; no autonomous remediation. |

## Required Graph Scopes

The production wedge requires every one of these application permissions before the connector is considered healthy:

- `User.Read.All`
- `Directory.Read.All`
- `Organization.Read.All`
- `AuditLog.Read.All`
- `Reports.Read.All`

Any missing scope is a hard readiness failure for Phase 8. Partial discovery must not be treated as successful validation.

## Runtime Trace Evidence for One User

The Phase 8 runtime trace must capture one user through all layers:

1. **Discovery** — user id, UPN, display name, account status, assigned SKU, last sign-in, department, cost centre, sync timestamp.
2. **Recommendation** — governed recommendation id, playbook id, action type `REMOVE_LICENSE`, projected monthly/annual savings, exclusion checks, evidence pointers.
3. **Approval** — approval request id, approver, reason, timestamp, recommendation evidence snapshot.
4. **Dry Run** — current license assigned, future license absent, rollback plan to reassign SKU, risk, savings.
5. **Execution** — Graph request id, before state, action payload, after state, rollback reference, operator id, timestamp.
6. **Verification** — Graph readback evidence proving the SKU is absent after execution and outcome `VERIFIED`.
7. **Ledger** — projected savings, verified savings, variance, saving confidence, evidence link to the verified outcome.
8. **Drift** — drift monitor registration, evidence timeline, and detected drift after the removed SKU is manually reassigned for the test.

## Failure Matrix

| Failure | Phase | Certen behavior |
| --- | --- | --- |
| Missing Scope | A | Block onboarding, list missing scopes, and do not proceed with discovery or recommendations. |
| Graph Timeout | B | Mark connector unhealthy for the run, retain prior evidence, and require operator retry. |
| Permission Failure | B | Fail the current phase with Graph status/request evidence; no silent degradation. |
| License Removal Failure | F | Record failed execution evidence and rollback reference; do not attempt another user or SKU. |
| Verification Failure | G | Create `FAILED_VERIFICATION`; verified savings remain zero/projected-only. |
| Rollback Failure | I | Raise an operator alert with rollback attempt evidence; do not perform alternate remediation automatically. |

## End-State Proof Point

A successful Phase 8 run supports this statement:

> Certen successfully identified an inactive licensed user, generated a governed recommendation, obtained approval, executed the license removal in Microsoft 365, verified the outcome, recorded verified savings, and detected future drift.
