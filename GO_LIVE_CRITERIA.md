# Go-Live Criteria

## Purpose

This document defines the criteria that must be met before the Economic Operations
Platform is permitted to execute live license mutations on a real tenant.

"Go-live" means advancing a tenant from `PILOT_READ_ONLY` to
`PRODUCTION_GOVERNED_EXECUTION` with `M365_LIVE_LICENSE_MUTATION_ENABLED=true`.

**This document must be signed by named individuals before any live mutation is enabled.**

---

## Stage 1: Pilot Completion

Must be complete before Stage 2 begins.

| Criterion | Verified By | Date | Status |
|---|---|---|---|
| Pilot runbook completed in full (`FIRST_CUSTOMER_RUNBOOK.md`) | | | ☐ |
| At least 5 business days of pilot operation with no critical issues | | | ☐ |
| All pilot sign-offs captured | | | ☐ |
| No open severity-1 issues from pilot | | | ☐ |

---

## Stage 2: Infrastructure & Security

### 2.1 Production Config

| Criterion | Verified By | Date | Status |
|---|---|---|---|
| `NODE_ENV=production` confirmed | | | ☐ |
| Production config validator passes at startup (no violations in logs) | | | ☐ |
| `TENANT_ISOLATION_ENABLED=true` | | | ☐ |
| `DEFAULT_TENANT_FALLBACK=false` | | | ☐ |
| `AUTH_REQUIRED=true` | | | ☐ |
| `ALLOWED_ORIGINS` restricted to production frontend domain | | | ☐ |
| `JWT_SECRET` ≥ 32 characters, stored in secrets manager | | | ☐ |

### 2.2 Secrets & Credentials

| Criterion | Verified By | Date | Status |
|---|---|---|---|
| M365 credentials in secrets manager (not in env file) | | | ☐ |
| ServiceNow credentials in secrets manager | | | ☐ |
| Secret rotation procedure confirmed executable | | | ☐ |
| Secret masking verified in structured logs | | | ☐ |
| No credentials visible in any log output | | | ☐ |

### 2.3 Tenant Isolation

| Criterion | Verified By | Date | Status |
|---|---|---|---|
| Cross-tenant isolation tests passing | | | ☐ |
| Tenant isolation audit complete (`TENANT_ISOLATION_AUDIT.md`) | | | ☐ |
| EXECUTE intent from wrong tenant returns INTENT_REJECTED | | | ☐ |
| Cross-tenant state query returns 404 | | | ☐ |

---

## Stage 3: Connector Readiness

### 3.1 M365 / Microsoft Graph

| Criterion | Verified By | Date | Status |
|---|---|---|---|
| App registration has write scope: `LicenseAssignment.ReadWrite.All` | | | ☐ |
| Write scope consent completed by customer Azure AD admin | | | ☐ |
| Connector health check returns `READY` (not DEGRADED or AUTH_FAILED) | | | ☐ |
| Token refresh lifecycle verified (credential does not expire mid-operation) | | | ☐ |
| License assignment write tested in **sandbox tenant** (not production) | | | ☐ |
| Graph API rate limit behavior understood and backoff implemented | | | ☐ |

### 3.2 ServiceNow

| Criterion | Verified By | Date | Status |
|---|---|---|---|
| ServiceNow integration tested with real sandbox CHG lifecycle | | | ☐ |
| CHG reaches IMPLEMENT state before EXECUTE proceeds | | | ☐ |
| Evidence attachment confirmed working | | | ☐ |
| Emergency rollback CHG flow tested | | | ☐ |
| `SERVICENOW_MODE=LIVE` confirmed (not MOCK_CONNECTOR in production) | | | ☐ |

### 3.3 Flexera (if applicable)

| Criterion | Verified By | Date | Status |
|---|---|---|---|
| Flexera integration configured for go-live tenant | | | ☐ |
| Entitlement data fresh (within 24 hours) | | | ☐ |
| Reconciliation tested against real tenant data | | | ☐ |
| HIGH-severity mismatch handling tested (blocks recommendation confidence) | | | ☐ |

---

## Stage 4: RBAC & Access Control

| Criterion | Verified By | Date | Status |
|---|---|---|---|
| At least two distinct operator accounts (OPERATOR + APPROVER) for go-live tenant | | | ☐ |
| Separation of duties verified: operator ≠ approver for all go-live operators | | | ☐ |
| VIEWER role verified read-only (cannot submit any intent) | | | ☐ |
| AUDITOR role verified: can read audit trail, cannot mutate | | | ☐ |
| RBAC denial logging confirmed in `getDeniedAuditEntries()` | | | ☐ |
| Self-approval blocked for non-OWNER/ADMIN roles | | | ☐ |

---

## Stage 5: Execution Readiness Gate (Critical)

These criteria guard the live mutation path specifically.

| Criterion | Verified By | Date | Status |
|---|---|---|---|
| `M365_LIVE_LICENSE_MUTATION_ENABLED` is explicitly set to `true` | | | ☐ |
| `M365_LIVE_LICENSE_ROLLBACK_ENABLED` is explicitly set to `true` | | | ☐ |
| Rollback plan captured before each EXECUTE intent | | | ☐ |
| Full approval chain tested end-to-end: REQUEST_APPROVAL → APPROVE → EXECUTE | | | ☐ |
| Verification job confirmed to run 30 minutes after execution | | | ☐ |
| Drift detection scan confirmed to run every 6 hours | | | ☐ |
| ROLLBACK intent tested successfully in sandbox (with ROLLBACK_ENABLED=true) | | | ☐ |
| Concurrent execution guard tested: second EXECUTE on same user blocked | | | ☐ |
| Idempotency tested: duplicate EXECUTE returns ALREADY_EXECUTED (not 500) | | | ☐ |

### Execution Scope Limits at Go-Live

Before full go-live, the first live execution should be bounded:

| Constraint | Value | Who Sets |
|---|---|---|
| Maximum users in first batch | 1 (single user) | Operator |
| User selection criteria | Low-risk (no active login in 90+ days) | Operator |
| Monitoring period before second execution | 48 hours | Agreed with customer |
| Customer approval required per execution | Yes (until confidence established) | Customer |

---

## Stage 6: Observability & Incident Response

| Criterion | Verified By | Date | Status |
|---|---|---|---|
| Structured logs emitting with `tenantId` and `correlationId` | | | ☐ |
| Log aggregation confirmed (logs visible in central platform) | | | ☐ |
| Metrics dashboard live (error rate, job queue depth, response times) | | | ☐ |
| Alerting configured: `CONNECTOR_DEGRADED`, `AUTH_FAILED`, `FLEXERA_NOT_IN_M365` | | | ☐ |
| On-call rotation active for go-live window | | | ☐ |
| Incident response plan documented and reviewed by on-call | | | ☐ |
| Rollback runbook verified: team can execute rollback within 30 minutes | | | ☐ |

---

## Stage 7: Customer Sign-Off

The following must be agreed with the customer before live mutation is enabled.

| Criterion | Customer Name | Date | Status |
|---|---|---|---|
| Customer has reviewed recommendation proof graph and confirmed accuracy | | | ☐ |
| Customer has authorized specific users for first execution batch | | | ☐ |
| Customer understands rollback procedure and has confirmed acceptance | | | ☐ |
| Customer has nominated internal approver who will review each CHG | | | ☐ |
| Customer has confirmed go-live date and monitoring window | | | ☐ |

---

## Final Go / No-Go Gate

**All stages 1–7 must be ✅ before enabling live mutation.**

| Stage | Lead | Date | Decision |
|---|---|---|---|
| Stage 1: Pilot Completion | | | ☐ Go / ☐ No-Go |
| Stage 2: Infrastructure & Security | | | ☐ Go / ☐ No-Go |
| Stage 3: Connector Readiness | | | ☐ Go / ☐ No-Go |
| Stage 4: RBAC & Access Control | | | ☐ Go / ☐ No-Go |
| Stage 5: Execution Readiness Gate | | | ☐ Go / ☐ No-Go |
| Stage 6: Observability | | | ☐ Go / ☐ No-Go |
| Stage 7: Customer Sign-Off | | | ☐ Go / ☐ No-Go |

**Final Decision:** ☐ GO  ☐ NO-GO

**Approved by (Platform Lead):** _______________________ **Date:** _______________________

**Approved by (Security):** _______________________ **Date:** _______________________

**Approved by (Customer):** _______________________ **Date:** _______________________

---

## Post-Go-Live Criteria for Full Production Rollout

After the first successful tenant goes live and has operated for ≥30 days without
incident, the platform may be considered for full production rollout. Criteria:

- Zero execution incidents (incorrect reclaims, un-rolled-back errors)
- Verification completion rate ≥ 99%
- Drift detection catching all post-execution state changes
- Audit trail complete: every execution traceable to approver + CHG + proof
- Customer satisfaction confirmed (positive outcome)

Full production rollout requires a separate review process, not covered by this document.

---

## What This Document Does NOT Authorize

- Bulk execution of many users in one operation
- Bypassing ServiceNow change management
- Disabling rollback capability after go-live
- Changing `tenantMode` from `PRODUCTION_GOVERNED_EXECUTION` without sign-off
- Adding additional tenants without repeating Stages 2–7 for each new tenant

Any deviation from governed execution semantics requires re-running the
relevant stages and obtaining new sign-offs.
