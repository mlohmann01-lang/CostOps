# Smoke Test Results Template

## Test Run Metadata

| Field | Value |
|---|---|
| Date | |
| Operator | |
| Tenant ID | |
| Tenant Mode | PILOT_READ_ONLY |
| API Server Version | |
| Live Execution Enabled | false |
| Test User UPN | |
| Test User Object ID | |
| Assigned SKU IDs | |

---

## Step Results

### STEP 1 — Config Validation

| Check | Expected | Observed | Pass/Fail |
|---|---|---|---|
| Typecheck | 0 errors | | |
| `/health/live` | `{"status":"alive"}` | | |
| `/health/ready` | `{"ready":true}` | | |
| `/health/dependencies` | connectors reachable | | |

Notes:

---

### STEP 2 — Sync

| Check | Expected | Observed | Pass/Fail |
|---|---|---|---|
| Sync status | SYNC_COMPLETE | | |
| Users discovered | ≥ 1 | | |
| Disabled licensed users | ≥ 1 (test user present) | | |
| Evidence freshness | FRESH | | |

Sync log excerpt:
```
<paste sync log here>
```

---

### STEP 3 — Recommendation Generation

| Check | Expected | Observed | Pass/Fail |
|---|---|---|---|
| Test user in command center | yes | | |
| projectedMonthlySaving | > 0 | | |
| trustScore | ≥ 0.7 | | |
| connectorReadiness | HEALTHY | | |
| state | APPROVAL_REQUIRED | | |

Recommendation ID captured: `m365-exec-______`

---

### STEP 4 — Simulation

| Check | Expected | Observed | Pass/Fail |
|---|---|---|---|
| currentState.userDisabled | true | | |
| proposedState.licenceRemoved | true | | |
| rollbackAvailable | true | | |
| approvalRequired | true | | |
| blockedReasons | INTENT_BLOCKED_BY_TENANT_MODE | | |

---

### STEP 5 — SIMULATE Intent

| Check | Expected | Observed | Pass/Fail |
|---|---|---|---|
| HTTP status | 200 | | |
| accepted | true | | |
| reason | INTENT_ACCEPTED | | |
| nextState | SIMULATED | | |

---

### STEP 6 — REQUEST_APPROVAL Intent

| Check | Expected | Observed | Pass/Fail |
|---|---|---|---|
| HTTP status | 200 | | |
| nextState | APPROVAL_REQUIRED | | |

---

### STEP 7 — APPROVE Intent

| Check | Expected | Observed | Pass/Fail |
|---|---|---|---|
| HTTP status | 200 | | |
| accepted | true | | |
| nextState | APPROVED | | |
| Actor | Different from requester | | |

---

### STEP 8 — EXECUTE Intent (readiness gate)

| Check | Expected | Observed | Pass/Fail |
|---|---|---|---|
| HTTP status | 200 | | |
| reason | EXECUTION_READY_NOT_LIVE_ENABLED | | |
| Graph mutation occurred | NO | | |
| Outcome ledger falsely verified | NO | | |

---

### STEP 9 — Action History

| Check | Expected | Observed | Pass/Fail |
|---|---|---|---|
| Actions count | ≥ 4 | | |
| SIMULATE in history | yes | | |
| REQUEST_APPROVAL in history | yes | | |
| APPROVE in history | yes | | |
| EXECUTE in history | yes | | |
| History is tenant-scoped | yes | | |

---

### STEP 10 — Timeline

| Check | Expected | Observed | Pass/Fail |
|---|---|---|---|
| Timeline endpoint responds | yes | | |
| currentState populated | yes | | |
| Actions populated | ≥ 4 | | |

---

### STEP 11 — Verification

| Check | Expected | Observed | Pass/Fail |
|---|---|---|---|
| HTTP status | 200 | | |
| verificationStatus | FAILED_VERIFICATION | | |
| verificationReason | NO_LIVE_EXECUTION_EVIDENCE | | |
| False positive VERIFIED | NO | | |

---

### STEP 12 — Drift Scan

| Check | Expected | Observed | Pass/Fail |
|---|---|---|---|
| Drift events | empty (no live execution) | | |
| False drift detected | NO | | |

---

### STEP 13 — Rollback Readiness

| Check | Expected | Observed | Pass/Fail |
|---|---|---|---|
| ready | false | | |
| rollbackReadinessState | ROLLBACK_BLOCKED | | |
| Reason | no live execution | | |

---

### STEP 14 — Proof Graph

| Check | Expected | Observed | Pass/Fail |
|---|---|---|---|
| Proof nodes present | ≥ 3 | | |
| status | PROOF_COMPLETE | | |
| Simulation proof node | yes | | |
| Approval proof node | yes | | |
| Readiness proof node | yes | | |

---

### STEP 15 — RBAC Enforcement

| Check | Expected | Observed | Pass/Fail |
|---|---|---|---|
| VIEWER EXECUTE | HTTP 403 | | |
| error code | PERMISSION_DENIED | | |
| permission | EXECUTION_RUN | | |

---

## Summary

| Category | Result |
|---|---|
| Total checks | 40+ |
| Passed | |
| Failed | |
| Blockers | |

## Blockers / Issues

List any unexpected behavior or failures:

1. 
2. 

## Remediation Items

List any items to fix before advancing to pilot:

1. 
2. 

## Sign-Off

| Role | Name | Date | Signature |
|---|---|---|---|
| Operator | | | |
| Approver | | | |
| Security Review | | | |

## Recommendation

- [ ] Platform safe to advance to `PILOT_READ_ONLY` with real tenant
- [ ] Platform safe to advance to `PRODUCTION_APPROVAL_REQUIRED`  
- [ ] Blockers require resolution before advancing
- [ ] Requires re-test after remediation
