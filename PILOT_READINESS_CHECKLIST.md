# Pilot Readiness Checklist

## Purpose

This checklist must be completed before onboarding the first real tenant onto the
Economic Operations Platform. All items must be verified by a named person with a
timestamp before the pilot begins.

**Pilot posture: `PILOT_READ_ONLY` (default)**

The initial tenant flow defaults to read-only mode. No live license mutations are
executed until the tenant explicitly advances to `PRODUCTION_APPROVAL_REQUIRED`.
Only after confidence is established should `PRODUCTION_GOVERNED_EXECUTION` be enabled.

---

## Section 1: Infrastructure

### Database

- [ ] PostgreSQL instance provisioned in production region
- [ ] Connection string stored in secrets manager (not in env file or code)
- [ ] DB migration applied (`drizzle-kit push` or migration files executed)
- [ ] All 14 expected tables confirmed present:
  - [ ] `recommendations`
  - [ ] `outcome_ledger`
  - [ ] `economic_operations_action_history`
  - [ ] `economic_operations_execution_state`
  - [ ] `economic_operations_idempotency`
  - [ ] `economic_operations_verification_events`
  - [ ] `economic_operations_drift_events`
  - [ ] `economic_operations_rollback_events`
  - [ ] `economic_operations_jobs`
  - [ ] `distributed_locks`
  - [ ] `sync_checkpoints`
  - [ ] `operator_alerts`
  - [ ] `econ_ops_events`
  - [ ] `connector_health_model`
- [ ] DB user has only required permissions (no superuser in production)
- [ ] Connection pool configured (max 20 connections recommended)
- [ ] Backup policy confirmed (daily snapshot minimum)

### API Server

- [ ] API server deployed and responding to `GET /health`
- [ ] TLS termination confirmed (HTTPS only in production)
- [ ] `ALLOWED_ORIGINS` set to specific frontend domain (not `*`)
- [ ] `JWT_SECRET` set to ≥32-character random value
- [ ] `AUTH_REQUIRED=true` confirmed in environment
- [ ] `TENANT_ISOLATION_ENABLED=true` confirmed
- [ ] `DEFAULT_TENANT_FALLBACK=false` confirmed
- [ ] `NODE_ENV=production` confirmed
- [ ] Production config validator confirmed to run at startup (check logs)

### Job Scheduler / Worker

- [ ] Job scheduler process running (separate from API server)
- [ ] Worker process running (separate from API server)
- [ ] Dead letter queue or retry policy configured for failed jobs
- [ ] Worker has access to DB (same secrets as API server)
- [ ] Scheduler emitting heartbeat logs

---

## Section 2: Connector Configuration

### M365 / Microsoft Graph

- [ ] Azure AD app registration created for this environment
- [ ] Required read scopes granted and consented:
  - [ ] `User.Read.All`
  - [ ] `Directory.Read.All`
  - [ ] `Organization.Read.All`
  - [ ] `AuditLog.Read.All`
- [ ] `M365_CLIENT_ID`, `M365_CLIENT_SECRET`, `M365_TENANT_ID` stored in secrets manager
- [ ] Connector health check passing: `GET /command-center?tenantId=<pilot-tenant>` shows connector `READY`
- [ ] Read-only smoke test confirmed: list users returns expected data
- [ ] **`M365_LIVE_LICENSE_MUTATION_ENABLED=false`** — confirmed DISABLED for pilot start

### ServiceNow (if used in pilot)

- [ ] ServiceNow sandbox/dev instance URL configured
- [ ] ServiceNow credentials stored in secrets manager
- [ ] Change request creation test: `SERVICENOW_MODE=LIVE` with sandbox
- [ ] CHG state transitions verified through to IMPLEMENT
- [ ] If not used: `SERVICENOW_MODE=MOCK_CONNECTOR` set (dry run)

### Flexera (if used in pilot)

- [ ] Flexera API key configured for pilot tenant
- [ ] Entitlement data present for pilot tenant users
- [ ] Reconciliation test run: `/flexera/entitlements?tenantId=<pilot-tenant>`
- [ ] If not used: `FLEXERA_MODE=MOCK_CONNECTOR` set

---

## Section 3: Tenant Setup

### Tenant Record

- [ ] Pilot tenant ID established and documented
- [ ] `tenantMode` set to `PILOT_READ_ONLY` (default — no mutations)
- [ ] Tenant record created in system
- [ ] Pilot tenant isolated from any existing production tenants

### Operator Accounts

- [ ] At least one `TENANT_ADMIN` account provisioned for pilot tenant
- [ ] At least one `OPERATOR` account provisioned
- [ ] At least one `APPROVER` account provisioned (separate from OPERATOR)
- [ ] At least one `VIEWER` account provisioned (for read-only access verification)
- [ ] RBAC roles verified: each account can only perform permitted actions

### Pilot Tenant RBAC Acceptance

- [ ] VIEWER cannot submit intents (verified: returns 403)
- [ ] OPERATOR cannot approve own simulation (verified: returns 403)
- [ ] APPROVER can grant approval on OPERATOR-submitted request (verified)
- [ ] TENANT_ADMIN can configure tenant settings (verified)

---

## Section 4: Observability

### Logging

- [ ] Structured JSON logs being emitted
- [ ] Logs forwarded to central log aggregation (CloudWatch / Datadog / etc.)
- [ ] Secret masking confirmed: no `clientSecret`, `token`, `DATABASE_URL` in logs
- [ ] `tenantId` present on all operational log lines
- [ ] `correlationId` present on execution-related log lines

### Metrics

- [ ] Health endpoint responding: `GET /health` returns 200
- [ ] Job queue depth monitored
- [ ] Error rate monitoring active
- [ ] Response time baseline established

### Alerts

- [ ] Alert routing configured: `CONNECTOR_DEGRADED` → on-call channel
- [ ] Alert routing configured: `AUTH_FAILED` → security channel
- [ ] Alert routing configured: `FLEXERA_NOT_IN_M365` → tenant admin notification
- [ ] Alert deduplication confirmed (no alert storm on repeated errors)

---

## Section 5: Security

### Access Control

- [ ] API endpoints not publicly accessible without auth headers
- [ ] `x-tenant-id` required on all requests (returns 400 if missing)
- [ ] RBAC middleware active on mutation routes
- [ ] CORS restricted to known frontend origin

### Secrets

- [ ] No secrets in source code or version control
- [ ] No secrets in environment files committed to repo
- [ ] Secret rotation procedure documented
- [ ] Vault/secrets manager access restricted to deployment pipeline

### Tenant Isolation

- [ ] Cross-tenant isolation tests passed (see `TENANT_ISOLATION_AUDIT.md`)
- [ ] Pilot tenant confirmed unable to access data from any other tenant

---

## Section 6: Operational Readiness

### Runbook

- [ ] `FIRST_CUSTOMER_RUNBOOK.md` reviewed by operator responsible for pilot
- [ ] Smoke test procedure (`SMOKE_TEST_RUNBOOK.md`) reviewed
- [ ] Rollback procedure understood (even if `ROLLBACK_ENABLED=false` initially)
- [ ] Escalation path documented: who to contact if pilot fails

### Support Readiness

- [ ] On-call rotation established for pilot period
- [ ] Incident response plan for pilot tenant issues documented
- [ ] Communication plan with pilot customer established
- [ ] Feedback channel with pilot customer open

### Data

- [ ] Pilot tenant M365 data confirmed synced (at least 1 sync checkpoint)
- [ ] At least one recommendation generated for a real disabled user
- [ ] Proof graph visible in investigation UX for that recommendation
- [ ] No MOCK_CONNECTOR data visible in pilot tenant's production view

---

## Section 7: Go / No-Go Sign-Off

All sections above must be ✅ before this is signed.

| Area | Verified By | Date | Status |
|---|---|---|---|
| Infrastructure | | | ☐ |
| Connector Configuration | | | ☐ |
| Tenant Setup | | | ☐ |
| Observability | | | ☐ |
| Security | | | ☐ |
| Operational Readiness | | | ☐ |

**Pilot Go/No-Go Decision:**

- [ ] ALL sections signed off
- [ ] No open P1/P2 issues
- [ ] Pilot tenant `tenantMode = PILOT_READ_ONLY` confirmed
- [ ] `M365_LIVE_LICENSE_MUTATION_ENABLED=false` confirmed for pilot start

**Decision:** ☐ GO  ☐ NO-GO

**Authorized by:** _______________________ **Date:** _______________________

---

## Tenant Mode Progression

After the pilot period, mode advancement requires a separate sign-off:

| Mode | Enables | Requires |
|---|---|---|
| `PILOT_READ_ONLY` | Sync, recommendations, simulations | Default pilot posture |
| `PRODUCTION_APPROVAL_REQUIRED` | All of above + approval workflow, ServiceNow CHG creation | Explicit sign-off after PILOT_READ_ONLY confidence established |
| `PRODUCTION_GOVERNED_EXECUTION` | All of above + live license mutation | `M365_LIVE_LICENSE_MUTATION_ENABLED=true` + additional sign-off |

No mode is advanced automatically. Each advancement requires explicit operator action
and a documented sign-off.
