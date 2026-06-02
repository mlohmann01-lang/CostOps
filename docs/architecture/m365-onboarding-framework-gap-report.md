# M365 Onboarding Framework Gap Report

Date: 2026-06-02

## 1. Existing surfaces reused

The onboarding framework reuses the existing tenant/workspace context, connector registry, M365 readiness service, M365 discovery service, M365 trust service, M365 playbook runtime, Opportunity Factory, Runtime Health, Connector Hub, Settings, and Platform Event Authority. It does not introduce a new M365 connector, tenant model, playbook system, execution authority, or approval authority.

## 2. Onboarding lifecycle built

The lifecycle now covers workspace setup, M365 connection, readiness, discovery, trust assessment, opportunity assessment, pilot mode selection, and go-live checklist generation. State is tenant scoped and idempotent for one active `M365` onboarding record per tenant/provider.

## 3. Readiness coverage

Readiness uses the existing M365 readiness checks. Read readiness gates discovery and dry-run preparation. Write readiness is recorded as a warning for read-only and dry-run pilots and is required only for controlled execution readiness.

## 4. Discovery coverage

Discovery uses the existing M365 discovery service and snapshot repository path. Completed discovery passes, partial discovery warns, and failed discovery blocks onboarding.

## 5. Trust coverage

Trust assessment uses the existing M365 trust service. Identity, license, usage, and activity trust must be `HIGH` or `TRUSTED` for a clean pass. `INVESTIGATE` is allowed only as a warning; `LOW_CONFIDENCE` and `BLOCKED` block critical trust dimensions.

## 6. Opportunity coverage

Opportunity assessment uses the existing M365 playbook runtime through Opportunity Factory. It records playbooks run, candidates found, opportunities generated, production readiness counts, projected savings, and economic-assessment presence.

## 7. Pilot mode coverage

`READ_ONLY` is allowed after discovery. `DRY_RUN` is allowed after trust assessment warning/pass. `CONTROLLED_EXECUTION` is selectable only when write readiness and execution-safety trust support it; selecting it does not create approvals, execution requests, or mutations.

## 8. Security posture

The onboarding framework is non-destructive: no Graph mutation, no `assignLicense`, no execution request, no approval creation, no auto-run, and no demo fallback in live mode. Events are emitted through PlatformEventService.

## 9. Remaining gaps before first tenant

- Validate real Entra app consent and customer admin-consent UX outside demo mode.
- Add persistent onboarding storage migration if the existing tenant onboarding table is insufficient for long-lived checklist evidence.
- Confirm exact customer tenant naming and workspace provisioning workflow.
- Confirm production observability dashboards for first-tenant onboarding SLAs.

## 10. Recommended first tenant runbook

1. Create/select workspace and confirm tenant context.
2. Configure M365 connector credentials or managed identity.
3. Run readiness check and resolve missing read scopes.
4. Run discovery and confirm latest snapshot.
5. Run trust assessment and resolve blocked trust dimensions.
6. Run opportunity assessment through Opportunity Factory.
7. Select `READ_ONLY` or `DRY_RUN` pilot mode.
8. Review go-live checklist and unresolved warnings.
9. Do not enable controlled execution until Sprint 3 validation gates, write readiness, approval governance, verification, rollback readiness, and drift registration have all passed for the tenant.
