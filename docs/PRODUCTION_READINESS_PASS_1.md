# Production Readiness Pass 1

## Auth model
Header-derived auth context with session/user tables (`auth_users`, `auth_sessions`) and middleware wrapping sensitive routes.

## RBAC model
Roles: PLATFORM_ADMIN, TENANT_ADMIN, APPROVER, OPERATOR, VIEWER.

## Tenant isolation
Tenant-boundary assertions + query validation + response sanitization helpers enforce scoped reads.

## Onboarding flow
UI wizard + onboarding state table and `/api/onboarding/status`, `/api/onboarding/step` routes orchestrate existing platform actions.

## Feature flags
LIVE_EXECUTION_ENABLED, LIVE_CONNECTORS_ENABLED, ALLOW_PLATFORM_ADMIN_OVERRIDE, ENABLE_JOB_SCHEDULER and job-specific flags.

## Observability
Platform events table + correlation + emitter API for cross-cutting event ingestion.

## Security controls
Rate limiting, approval tamper hashing, session-expiry validation, sensitive evidence redaction.

## Deployment readiness
`/health`, `/readiness`, startup diagnostics and env validation foundation.

## Pass 2 continuity
- Pass 2 expands provider auth, tenant-context, deployment/runtime, observability metrics, partner surfaces, and knowledge base continuity.
