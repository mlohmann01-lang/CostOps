# Smoke Test Runbook — M365 Disabled Licensed User Reclaim

## Overview

This runbook walks through one complete M365 operational lifecycle against a controlled
tenant, using the disabled-licensed-user-reclaim playbook as the first real-world
validation wedge. All steps start in `PILOT_READ_ONLY` mode, which means no Graph
mutation occurs regardless of flags.

## Prerequisites

```bash
# Required env vars for smoke test (no live execution)
DATABASE_URL=postgres://...
AZURE_TENANT_ID=<your-tenant-id>
AZURE_CLIENT_ID=<app-registration-client-id>
AZURE_CLIENT_SECRET=<client-secret>       # from vault, not shell history
M365_GRAPH_GRANTED_PERMISSIONS="User.Read.All Directory.Read.All Organization.Read.All"
ECON_OPS_TENANT_MODE=PILOT_READ_ONLY
M365_LIVE_LICENSE_MUTATION_ENABLED=false  # MUST be false for initial smoke test
M365_LIVE_LICENSE_ROLLBACK_ENABLED=false
NODE_ENV=development
LOG_LEVEL=debug
```

## Test User Criteria

Select a user meeting ALL of these criteria:

- Account is **disabled** (`accountEnabled: false` in Entra ID)
- Has at least one paid license assigned (M365 Business Premium, E3, or similar)
- No active mailbox or service dependencies
- Account was disabled at least 30+ days ago (confirms inactive status)
- Recovery risk: LOW (no shared mailbox, no delegate access needed)
- SKU IDs are known and documented before the test begins

Document the test user before starting:
```
UPN: disabled-test-user@yourorg.onmicrosoft.com
userId: <object-id>
assignedSkuIds: <sku-ids-comma-separated>
disabledSince: <date>
```

## Step-by-Step Smoke Test Flow

### STEP 1 — Config Validation

Verify the platform starts in a safe state:

```bash
cd /workspace/CostOps
COREPACK_ENABLE_PROJECT_SPEC=0 pnpm --filter @workspace/api-server typecheck
```

Start the API server:
```bash
ECON_OPS_TENANT_MODE=PILOT_READ_ONLY \
M365_LIVE_LICENSE_MUTATION_ENABLED=false \
node artifacts/api-server/dist/index.js
```

Verify health:
```bash
curl http://localhost:3000/health/live
# Expected: {"status":"alive"}

curl http://localhost:3000/health/ready
# Expected: {"ready":true,...}

curl http://localhost:3000/health/dependencies
# Expected: postgres, m365_graph status
```

### STEP 2 — Sync (Discover Users and Licenses)

Trigger M365 sync to discover disabled licensed users:

```bash
# Using the sync endpoint (requires TENANT_ADMIN or OWNER role header)
curl -X POST http://localhost:3000/api/m365/sync \
  -H "x-tenant-id: TENANT-SMOKE" \
  -H "x-role: TENANT_ADMIN" \
  -H "x-user-id: smoke-test-operator" \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"TENANT-SMOKE","playbookId":"m365-disabled-licensed-user-reclaim"}'
```

**Expected output:**
- `status: SYNC_INITIATED` or `SYNC_COMPLETE`
- `usersDiscovered: N` (at least 1)
- `licensesDiscovered: N`
- `evidenceFreshness: FRESH`

Capture:
- Number of users discovered
- Number of disabled licensed users
- SKU IDs found

### STEP 3 — Recommendation Generation

Fetch generated recommendations:

```bash
curl "http://localhost:3000/api/economic-operations/command-center?tenantId=TENANT-SMOKE" \
  -H "x-role: TENANT_ADMIN" \
  -H "x-user-id: smoke-test-operator"
```

**Expected output:**
- At least one recommendation card for the test user
- `projectedMonthlySaving > 0`
- `trustScore >= 0.7`
- `connectorReadiness: HEALTHY`
- `approvalRequirement: APPROVAL_REQUIRED`
- `state: APPROVAL_REQUIRED`

Capture the `recommendationId` for the next steps.

### STEP 4 — Simulation

Run simulation for the recommendation:

```bash
EXEC_ID="m365-exec-<recommendationId>"

curl "http://localhost:3000/api/economic-operations/simulation/${EXEC_ID}" \
  -H "x-tenant-id: TENANT-SMOKE" \
  -H "x-role: TENANT_ADMIN"
```

**Expected output:**
- `simulationStatus: READY` or `BLOCKED` (blocked is expected for PILOT_READ_ONLY)
- `currentState.userDisabled: true`
- `proposedState.licenceRemoved: true`
- `rollbackAvailable: true`
- `approvalRequired: true`
- `blockedReasons: ["INTENT_BLOCKED_BY_TENANT_MODE"]` (for PILOT_READ_ONLY)

### STEP 5 — Intent: SIMULATE

Submit the SIMULATE intent:

```bash
curl -X POST http://localhost:3000/api/economic-operations/intent \
  -H "x-tenant-id: TENANT-SMOKE" \
  -H "x-role: TENANT_ADMIN" \
  -H "x-user-id: smoke-operator-1" \
  -H "Content-Type: application/json" \
  -d "{
    \"tenantId\": \"TENANT-SMOKE\",
    \"executionId\": \"${EXEC_ID}\",
    \"actorId\": \"smoke-operator-1\",
    \"actorRole\": \"ECONOMIC_OPERATOR\",
    \"intentType\": \"SIMULATE\",
    \"sourceSurface\": \"API\",
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"reason\": \"Smoke test simulation\",
    \"requiredProofIds\": [],
    \"expectedStateTransition\": {\"from\": \"PROPOSED\", \"to\": \"SIMULATED\"},
    \"idempotencyKey\": \"smoke-test-simulate-$(date +%s)\"
  }"
```

**Expected:** `accepted: true`, `reason: INTENT_ACCEPTED`

### STEP 6 — Intent: REQUEST_APPROVAL

```bash
curl -X POST http://localhost:3000/api/economic-operations/intent \
  -H "x-tenant-id: TENANT-SMOKE" \
  -H "x-role: TENANT_ADMIN" \
  -H "x-user-id: smoke-operator-1" \
  -H "Content-Type: application/json" \
  -d "{
    \"tenantId\": \"TENANT-SMOKE\",
    \"executionId\": \"${EXEC_ID}\",
    \"actorId\": \"smoke-operator-1\",
    \"actorRole\": \"ECONOMIC_OPERATOR\",
    \"intentType\": \"REQUEST_APPROVAL\",
    \"sourceSurface\": \"API\",
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"reason\": \"Smoke test approval request\",
    \"requiredProofIds\": [],
    \"expectedStateTransition\": {\"from\": \"SIMULATED\", \"to\": \"APPROVAL_REQUIRED\"},
    \"idempotencyKey\": \"smoke-test-approve-req-$(date +%s)\"
  }"
```

**Expected:** `nextState: APPROVAL_REQUIRED`

### STEP 7 — Intent: APPROVE (different actor)

```bash
curl -X POST http://localhost:3000/api/economic-operations/intent \
  -H "x-tenant-id: TENANT-SMOKE" \
  -H "x-role: APPROVER" \
  -H "x-user-id: smoke-approver-1" \
  -H "Content-Type: application/json" \
  -d "{
    \"tenantId\": \"TENANT-SMOKE\",
    \"executionId\": \"${EXEC_ID}\",
    \"actorId\": \"smoke-approver-1\",
    \"actorRole\": \"APPROVER\",
    \"intentType\": \"APPROVE\",
    \"sourceSurface\": \"API\",
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"reason\": \"Smoke test approval granted\",
    \"requiredProofIds\": [],
    \"expectedStateTransition\": {\"from\": \"APPROVAL_REQUIRED\", \"to\": \"APPROVED\"},
    \"idempotencyKey\": \"smoke-test-approve-$(date +%s)\"
  }"
```

**Expected:** `nextState: APPROVED`, `accepted: true`

### STEP 8 — Intent: EXECUTE (blocked by live flag)

```bash
curl -X POST http://localhost:3000/api/economic-operations/intent \
  -H "x-tenant-id: TENANT-SMOKE" \
  -H "x-role: PLATFORM_ADMIN" \
  -H "x-user-id: smoke-operator-1" \
  -H "Content-Type: application/json" \
  -d "{
    \"tenantId\": \"TENANT-SMOKE\",
    \"executionId\": \"${EXEC_ID}\",
    \"actorId\": \"smoke-operator-1\",
    \"actorRole\": \"ECONOMIC_OPERATOR\",
    \"intentType\": \"EXECUTE\",
    \"sourceSurface\": \"API\",
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"reason\": \"Smoke test execute (expects gate block)\",
    \"requiredProofIds\": [],
    \"expectedStateTransition\": {\"from\": \"APPROVED\", \"to\": \"EXECUTED\"},
    \"idempotencyKey\": \"smoke-test-execute-$(date +%s)\"
  }"
```

**Expected:** `reason: EXECUTION_READY_NOT_LIVE_ENABLED` (NOT `INTENT_REJECTED`)
This confirms the readiness gate works and no Graph mutation occurred.

### STEP 9 — Verify Action History

```bash
curl "http://localhost:3000/api/economic-operations/actions/${EXEC_ID}?tenantId=TENANT-SMOKE" \
  -H "x-role: TENANT_ADMIN"
```

**Expected:** Actions array showing SIMULATE → REQUEST_APPROVAL → APPROVE → EXECUTE sequence

### STEP 10 — Timeline

```bash
curl "http://localhost:3000/api/economic-operations/executions/${EXEC_ID}/timeline?tenantId=TENANT-SMOKE" \
  -H "x-role: TENANT_ADMIN"
```

**Expected:** Full timeline with actions, state history

### STEP 11 — Verification (expect FAILED or PENDING)

```bash
curl -X POST "http://localhost:3000/api/economic-operations/verify/${EXEC_ID}" \
  -H "x-tenant-id: TENANT-SMOKE" \
  -H "x-role: TENANT_ADMIN" \
  -H "x-user-id: smoke-operator-1" \
  -H "Content-Type: application/json" \
  -d "{}"
```

**Expected:** `verificationStatus: FAILED_VERIFICATION` reason `NO_LIVE_EXECUTION_EVIDENCE`
This confirms verification does NOT falsely succeed when execution hasn't happened.

### STEP 12 — Drift Scan

```bash
curl "http://localhost:3000/api/economic-operations/drift/${EXEC_ID}?tenantId=TENANT-SMOKE" \
  -H "x-role: TENANT_ADMIN"
```

**Expected:** No drift events (empty array) since no live execution occurred.

### STEP 13 — Rollback Readiness

```bash
curl "http://localhost:3000/api/economic-operations/rollback/${EXEC_ID}/readiness?tenantId=TENANT-SMOKE" \
  -H "x-role: TENANT_ADMIN"
```

**Expected:** `ready: false`, `rollbackReadinessState: ROLLBACK_BLOCKED` (no live execution to roll back)

### STEP 14 — Proof Graph

```bash
curl "http://localhost:3000/api/economic-operations/proof/${EXEC_ID}?tenantId=TENANT-SMOKE" \
  -H "x-role: TENANT_ADMIN"
```

**Expected:** Proof nodes for simulation, approval, execution readiness. `status: PROOF_COMPLETE`.

### STEP 15 — RBAC Enforcement Check

Confirm a VIEWER cannot submit execution intent:

```bash
curl -X POST http://localhost:3000/api/economic-operations/intent \
  -H "x-tenant-id: TENANT-SMOKE" \
  -H "x-role: VIEWER" \
  -H "x-user-id: unauthorized-viewer" \
  -H "Content-Type: application/json" \
  -d "{
    \"tenantId\": \"TENANT-SMOKE\",
    \"executionId\": \"${EXEC_ID}\",
    \"actorId\": \"unauthorized-viewer\",
    \"actorRole\": \"VIEWER\",
    \"intentType\": \"EXECUTE\",
    \"sourceSurface\": \"API\",
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"reason\": \"RBAC test\",
    \"requiredProofIds\": [],
    \"expectedStateTransition\": {\"from\": \"APPROVED\", \"to\": \"EXECUTED\"},
    \"idempotencyKey\": \"smoke-rbac-test\"
  }"
```

**Expected:** HTTP 403, `error: PERMISSION_DENIED`

## Test Completion Criteria

All of the following must be true to consider the smoke test complete:

- [ ] API server started and passed health checks
- [ ] Sync produced at least one recommendation for the test user
- [ ] Simulation blocked correctly in PILOT_READ_ONLY mode
- [ ] SIMULATE intent accepted
- [ ] REQUEST_APPROVAL intent accepted
- [ ] APPROVE intent accepted (different actor from requester)
- [ ] EXECUTE intent returned `EXECUTION_READY_NOT_LIVE_ENABLED` (NOT a hard rejection)
- [ ] Action history shows full intent sequence
- [ ] Verification returned FAILED (not false-positive VERIFIED)
- [ ] Drift scan shows no drift (expected for non-executed path)
- [ ] Rollback readiness shows BLOCKED (no execution to roll back)
- [ ] Proof graph shows complete proof chain
- [ ] VIEWER was denied EXECUTE with HTTP 403

## Advancing to PRODUCTION_APPROVAL_REQUIRED

Once all above criteria pass, you may optionally repeat with:

```bash
ECON_OPS_TENANT_MODE=PRODUCTION_APPROVAL_REQUIRED
```

Keep `M365_LIVE_LICENSE_MUTATION_ENABLED=false` unless intentionally enabling live execution.
