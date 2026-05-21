# First Customer Runbook

## Purpose

Step-by-step guide for onboarding the first real customer tenant onto the
Economic Operations Platform. This runbook covers the full flow from tenant
provisioning through first recommendation review, in `PILOT_READ_ONLY` mode.

No live license mutations are performed in this runbook. The pilot tenant
observes recommendations and simulations only.

---

## Pre-Requisites

Before starting this runbook:

- [ ] All items in `PILOT_READINESS_CHECKLIST.md` are signed off
- [ ] Pilot tenant ID is assigned (e.g., `contoso-pilot`)
- [ ] Operator accounts provisioned for pilot tenant
- [ ] M365 connector configured with read-only scopes
- [ ] `M365_LIVE_LICENSE_MUTATION_ENABLED=false` confirmed

**Pilot Tenant ID:** `___________________________`

**Primary Operator:** `___________________________`

**Pilot Start Date:** `___________________________`

---

## Phase 1: Tenant Provisioning

### Step 1.1 — Register Tenant

```bash
# Insert tenant record with PILOT_READ_ONLY mode
# (exact mechanism depends on deployment — may be DB insert or admin API)

psql $DATABASE_URL <<EOF
INSERT INTO tenants (tenant_id, tenant_mode, created_at)
VALUES ('contoso-pilot', 'PILOT_READ_ONLY', NOW());
EOF
```

Verify:
```bash
psql $DATABASE_URL -c "SELECT tenant_id, tenant_mode FROM tenants WHERE tenant_id='contoso-pilot';"
```

Expected: `tenant_mode = PILOT_READ_ONLY`

### Step 1.2 — Confirm Tenant Isolation

From a different tenant's credentials, attempt to access the pilot tenant's data:

```bash
curl -H "x-tenant-id: other-tenant" \
     -H "x-user-id: other-operator" \
     -H "x-role: OPERATOR" \
     "http://localhost:3000/command-center?tenantId=contoso-pilot"
# Expected: 404 or empty recommendations list
```

### Step 1.3 — Configure M365 Connector

Set connector credentials for pilot tenant:

```bash
# Credentials stored in secrets manager — reference by environment variable
export M365_CLIENT_ID=<app-registration-client-id>
export M365_CLIENT_SECRET=<from-vault>
export M365_TENANT_ID=<azure-ad-tenant-id>
export M365_MODE=LIVE
export M365_LIVE_LICENSE_MUTATION_ENABLED=false
```

Verify connector health:
```bash
curl -H "x-tenant-id: contoso-pilot" \
     -H "x-user-id: admin-1" \
     -H "x-role: TENANT_ADMIN" \
     "http://localhost:3000/command-center?tenantId=contoso-pilot"
# Expected: connectorHealth.m365.status = "READY"
```

---

## Phase 2: First Data Sync

### Step 2.1 — Trigger Manual Sync

If the scheduler is running, a full sync will be queued automatically.
For an immediate on-demand sync:

```bash
# Enqueue a full sync job for the pilot tenant
# (exact API depends on deployment — may be admin endpoint or direct job enqueue)

curl -X POST \
     -H "x-tenant-id: contoso-pilot" \
     -H "x-user-id: admin-1" \
     -H "x-role: TENANT_ADMIN" \
     -H "Content-Type: application/json" \
     -d '{"jobType":"FULL_SYNC","tenantId":"contoso-pilot"}' \
     "http://localhost:3000/jobs"
```

### Step 2.2 — Monitor Sync Progress

```bash
# Check sync job status
curl -H "x-tenant-id: contoso-pilot" \
     -H "x-user-id: admin-1" \
     -H "x-role: TENANT_ADMIN" \
     "http://localhost:3000/jobs?tenantId=contoso-pilot"
# Expected: job with status=COMPLETED or status=RUNNING
```

Check sync checkpoint:
```bash
psql $DATABASE_URL -c "
  SELECT last_synced_at, user_count, status
  FROM sync_checkpoints
  WHERE tenant_id = 'contoso-pilot'
  ORDER BY last_synced_at DESC
  LIMIT 1;
"
```

### Step 2.3 — Verify User Data

```bash
# Check that users were synced
psql $DATABASE_URL -c "
  SELECT COUNT(*) as user_count,
         SUM(CASE WHEN account_enabled = false THEN 1 ELSE 0 END) as disabled_count
  FROM m365_users
  WHERE tenant_id = 'contoso-pilot';
"
```

Expected: at least some users synced; disabled users will become recommendation candidates.

---

## Phase 3: First Recommendation

### Step 3.1 — Review Command Center

```bash
curl -H "x-tenant-id: contoso-pilot" \
     -H "x-user-id: operator-1" \
     -H "x-role: OPERATOR" \
     "http://localhost:3000/command-center?tenantId=contoso-pilot"
```

Expected response structure:
```json
{
  "recommendations": [
    {
      "id": "rec-...",
      "userId": "disabled.user@contoso.com",
      "assignedSkus": ["Microsoft_365_E3"],
      "projectedMonthlySaving": 22.00,
      "trustScore": 0.85,
      "status": "PENDING_REVIEW"
    }
  ],
  "connectorHealth": {
    "m365": { "status": "READY" }
  }
}
```

### Step 3.2 — Inspect Recommendation Proof

For the first recommendation returned:

```bash
REC_ID="rec-from-above"
EXEC_ID="exec-id-from-above"

curl -H "x-tenant-id: contoso-pilot" \
     -H "x-user-id: operator-1" \
     -H "x-role: OPERATOR" \
     "http://localhost:3000/proof/$EXEC_ID?tenantId=contoso-pilot"
```

Verify:
- Proof graph contains at least one node
- Node sources include `m365` or `flexera`
- `environment` = `PRODUCTION` (not `DEMO`)
- `confidence` score is meaningful (0.7+)

### Step 3.3 — Run Simulation

```bash
curl -X POST \
     -H "x-tenant-id: contoso-pilot" \
     -H "x-user-id: operator-1" \
     -H "x-role: OPERATOR" \
     -H "Content-Type: application/json" \
     -d '{
       "intentType": "SIMULATE",
       "tenantId": "contoso-pilot",
       "executionId": "'$EXEC_ID'",
       "actorId": "operator-1"
     }' \
     "http://localhost:3000/intent"
```

Expected: `{ "accepted": true, "state": "SIMULATION_COMPLETE" }`

The simulation runs without mutating any M365 data. It confirms:
- What would be reclaimed
- Projected saving
- Rollback plan
- No live changes made

### Step 3.4 — Review Simulation Output

```bash
curl -H "x-tenant-id: contoso-pilot" \
     -H "x-user-id: operator-1" \
     -H "x-role: OPERATOR" \
     "http://localhost:3000/executions/$EXEC_ID/state?tenantId=contoso-pilot"
```

Review:
- `simulationOutput` contains what would be removed
- `projectedSaving` matches recommendation
- `rollbackPlan` captures original SKU assignments
- No `executedAt` field (not yet executed)

---

## Phase 4: Approval Workflow (Read-Only Confirmation)

In `PILOT_READ_ONLY` mode, approvals can be submitted as a dry run to validate the
workflow. No live execution will proceed.

### Step 4.1 — Request Approval

```bash
curl -X POST \
     -H "x-tenant-id: contoso-pilot" \
     -H "x-user-id: operator-1" \
     -H "x-role: OPERATOR" \
     -H "Content-Type: application/json" \
     -d '{
       "intentType": "REQUEST_APPROVAL",
       "tenantId": "contoso-pilot",
       "executionId": "'$EXEC_ID'",
       "actorId": "operator-1"
     }' \
     "http://localhost:3000/intent"
```

### Step 4.2 — Approve (as Approver)

```bash
curl -X POST \
     -H "x-tenant-id: contoso-pilot" \
     -H "x-user-id: approver-1" \
     -H "x-role: APPROVER" \
     -H "Content-Type: application/json" \
     -d '{
       "intentType": "APPROVE",
       "tenantId": "contoso-pilot",
       "executionId": "'$EXEC_ID'",
       "actorId": "approver-1"
     }' \
     "http://localhost:3000/intent"
```

Expected: `{ "accepted": true, "state": "APPROVED" }`

### Step 4.3 — Confirm Execution is Blocked

With `M365_LIVE_LICENSE_MUTATION_ENABLED=false`, an EXECUTE intent must be rejected:

```bash
curl -X POST \
     -H "x-tenant-id: contoso-pilot" \
     -H "x-user-id: operator-1" \
     -H "x-role: OPERATOR" \
     -H "Content-Type: application/json" \
     -d '{
       "intentType": "EXECUTE",
       "tenantId": "contoso-pilot",
       "executionId": "'$EXEC_ID'",
       "actorId": "operator-1"
     }' \
     "http://localhost:3000/intent"
```

**Expected: `{ "accepted": false, "reason": "INTENT_BLOCKED_BY_POLICY" }`**

This confirms the fail-closed gate is working. Live execution is gated and cannot
proceed in `PILOT_READ_ONLY` mode or without the mutation flag.

---

## Phase 5: Operator Alert Review

```bash
curl -H "x-tenant-id: contoso-pilot" \
     -H "x-user-id: operator-1" \
     -H "x-role: OPERATOR" \
     "http://localhost:3000/alerts?tenantId=contoso-pilot"
```

Review any active alerts:
- `CONNECTOR_DEGRADED` — investigate connector configuration
- `FLEXERA_DATA_STALE` — Flexera sync may not have run
- `FLEXERA_NOT_IN_M365` — review reconciliation discrepancy

If no alerts: expected for a clean pilot start.

---

## Phase 6: Pilot Completion Sign-Off

### Checklist

- [ ] At least one full sync completed successfully
- [ ] At least one recommendation generated from real M365 data
- [ ] Proof graph visible and meaningful for that recommendation
- [ ] Simulation ran without error
- [ ] Approval workflow exercised (request → approve)
- [ ] EXECUTE intent confirmed blocked (fail-closed gate working)
- [ ] No cross-tenant data leakage observed
- [ ] Operator alerts reviewed and no critical issues found
- [ ] Logs contain `tenantId` on all operational entries
- [ ] No secrets visible in logs

### Pilot Outcome

| Step | Result | Notes |
|---|---|---|
| Tenant provisioning | ☐ Pass / ☐ Fail | |
| M365 connector health | ☐ Pass / ☐ Fail | |
| First sync | ☐ Pass / ☐ Fail | |
| First recommendation | ☐ Pass / ☐ Fail | |
| Simulation | ☐ Pass / ☐ Fail | |
| Approval workflow | ☐ Pass / ☐ Fail | |
| Execute blocked | ☐ Pass / ☐ Fail | |
| Alert review | ☐ Pass / ☐ Fail | |

**Pilot Operator Sign-Off:** _______________________ **Date:** _______________________

---

## Next Step After Successful Pilot

If pilot is successful, proceed to `GO_LIVE_CRITERIA.md` to determine whether
the tenant is ready to advance from `PILOT_READ_ONLY` to `PRODUCTION_APPROVAL_REQUIRED`.

Live execution advancement requires:
1. Separate sign-off in `GO_LIVE_CRITERIA.md`
2. `M365_LIVE_LICENSE_MUTATION_ENABLED=true` set explicitly
3. ServiceNow integration verified (real CHG lifecycle)
4. RBAC verified with real operator accounts

**Do not enable live mutation based on pilot alone. Pilot is read-only validation.**
