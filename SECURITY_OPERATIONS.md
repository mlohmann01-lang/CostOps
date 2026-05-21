# Security Operations

## Authentication & Authorization

### Authentication Flow
1. All API requests require JWT token (except `/health/*` endpoints)
2. JWT is verified against `JWT_SECRET` on every request
3. Token claims must include: `tenantId`, `actorId`, `role`
4. Tenant context is extracted from token — never from query param in production

### RBAC Model

| Role | Can Execute | Can Approve | Can Configure | Can Audit |
|------|------------|-------------|---------------|-----------|
| OWNER | YES | YES | YES | YES |
| ADMIN | YES | YES | YES | YES |
| ECONOMIC_OPERATOR | Request only | NO | NO | NO |
| APPROVER | NO | YES | NO | NO |
| AUDITOR | NO | NO | NO | YES |
| VIEWER | NO | NO | NO | NO |
| CONNECTOR_ADMIN | NO | NO | YES | NO |

### Permission Enforcement Points
- Every `POST /economic-operations/intent` checks `EXECUTION_REQUEST` permission
- Every `EXECUTE` intent checks `EXECUTION_RUN` permission (not just REQUEST)
- Every `APPROVE` intent checks `APPROVAL_GRANT` permission
- Every `ROLLBACK` intent checks `ROLLBACK_REQUEST` permission
- Connector configuration requires `CONNECTOR_CONFIGURE` permission
- All denied actions are persisted to RBAC audit log

### Self-Approval Policy
- `ECONOMIC_OPERATOR` cannot approve their own high-risk executions
- `APPROVER` can approve own low-risk executions
- `OWNER` and `ADMIN` can approve their own executions regardless of risk

## Tenant Isolation

### Isolation Guarantees
1. Every database query MUST include `tenant_id` filter
2. Job queue entries are tenant-scoped
3. Distributed locks are keyed with `tenantId:resourceType:resourceId`
4. Events and alerts are tenant-scoped and non-crossing
5. Proof graphs are tenant-scoped
6. ServiceNow and Flexera responses include tenant context
7. Demo tenant cannot access production data (enforced by tenant mode)

### Production Guardrails (Fail-Closed)
- `DEFAULT_TENANT_FALLBACK=true` → startup fails
- `TENANT_ISOLATION_ENABLED=false` → startup fails
- Missing tenant context on mutation → request rejected with 403
- Cross-tenant query patterns → blocked at service layer

### Isolation Test Coverage
- `economic-operations-tenant-isolation.test.ts` — 10 isolation tests
- Tests cover: recommendations, action history, jobs, locks, events, alerts, proof graph, flexera, servicenow, demo mode

## Connector Credential Security

### M365 Graph
- Client secret stored in secrets manager, not env vars
- Least-privilege: read-only by default
- Write scopes only granted when `M365_LIVE_LICENSE_MUTATION_ENABLED=true`
- Token is never logged or stored — only used in-memory during request
- Auth failures immediately halt execution (NON_RETRYABLE_AUTH)

### ServiceNow
- OAuth credentials in secrets manager
- Scoped to ITSM/Change management only
- Dry-run mode by default unless `SERVICENOW_MODE=LIVE`

### Flexera
- API key in secrets manager
- Read-only: entitlements, license position, purchases only
- No write operations to Flexera

## Audit Trail

### What is Logged
- Every intent submission (accepted and rejected)
- Every RBAC check (allowed and denied)
- Every execution state transition
- Every verification event
- Every drift event
- Every rollback event
- Every job completion (with result and duration)
- Every connector health state change

### Audit Log Retention
- Action history: retained indefinitely (append-only table)
- RBAC audit: retained per compliance policy (default 90 days)
- Operational events: retained 30 days minimum
- Operator alerts: retained with acknowledgement history

### Non-Repudiation
- All intents include `actorId`, `actorRole`, `sourceSurface`
- Idempotency keys prevent replay attacks
- Evidence hashes link proof to ledger entries

## Incident Escalation

### Level 1: Operator Alert (Auto-detected)
- Connector health degradation
- Sync failures
- Verification failures
- Drift detected

### Level 2: Security Investigation
- RBAC denied actions exceeding threshold
- Cross-tenant access attempts
- Auth failures on live connectors
- Unexpected production tenant mode changes

### Level 3: Critical (Immediate Response)
- Live mutation executed without approval in policy-required mode
- Database schema modification not from migration pipeline
- Connector secret exposure in logs
- Tenant isolation violation detected

## Safe Defaults

The platform is safe by default:
- Live mutation is OFF unless explicitly enabled
- All mutations require approval unless policy explicitly permits
- Connectors start in MOCK_CONNECTOR mode
- Tenant mode starts as PILOT_READ_ONLY
- RBAC defaults to minimum permission (VIEWER)
- Retry does not retry auth/scope/policy failures (no brute force)
- Dead-letter queue captures unprocessable jobs without losing them
