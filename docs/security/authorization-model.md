# Authorization Model (Checkpoint 33)

## Roles
- TENANT_ADMIN
- GOVERNANCE_ADMIN
- APPROVER
- OPERATOR
- AUDITOR
- READ_ONLY
- SYSTEM_ADMIN

## Capability Checks
Deterministic checks are implemented by `AuthorizationService` with `hasCapability` and `requireCapability`.

## Guarding Strategy
Sensitive route groups apply:
- `requireTenantContext()`
- `requireCapability(capability)`
- optional `requireTenantResourceAccess(...)`
