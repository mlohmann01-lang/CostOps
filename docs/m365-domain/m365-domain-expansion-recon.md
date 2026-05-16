# M365 Domain Expansion Recon

## Existing M365 connector services
- `artifacts/api-server/src/tests/m365-readonly-connector.test.ts` indicates read-only connector behavior and no direct mutation authority.
- `artifacts/api-server/src/tests/m365-evidence-normalization.test.ts` validates normalization path currently used by M365 inputs.

## Existing M365 playbooks
- `m365-inactive-user-reclaim.ts` plus multi-playbooks in `m365-multi-playbooks.ts` provide initial reclaim/rightsize/add-on/copilot/shared-mailbox/overlap coverage.
- `registry.ts` is canonical registration point for playbooks.

## Existing evidence schema
- Current candidate shape includes identity, SKU, activity, mailbox, and overlap primitives in `m365-multi-playbooks.ts`.
- Existing fields are incomplete vs target pack and need normalized-field extension.

## Existing trust/reconciliation rules
- Current playbooks return `trustRequirements` and `requiredSignals` metadata but do not yet map each M365-specific reconciliation finding.

## Existing pricing/savings model
- Existing playbooks use SKU cost delta or full monthly cost in `estimatedMonthlySaving`.

## Existing recommendation flow
- Existing flow is via canonical playbook registry and playbook recommendation service.

## Existing outcome-proof flow
- Existing playbooks include `verificationMethod` and rollback considerations as proof hints.

## Use cases to add/expand
- Disabled licensed reclaim
- Inactive reclaim
- Rightsizing (E5→E3, E3→E1/F3, web-only/frontline fit)
- Copilot under-utilization/reallocation
- Add-on reclamation
- License overlap elimination
- Shared mailbox and service-account hygiene
- Storage exposure review
- Renewal readiness aggregate pack

## Files expected to change
- `artifacts/api-server/src/lib/playbooks/base-playbook.ts`
- `artifacts/api-server/src/lib/playbooks/m365-multi-playbooks.ts`
- `artifacts/api-server/src/lib/playbooks/registry.ts`
- `artifacts/api-server/src/tests/*m365*`
- `docs/m365-domain/*`
- architecture docs listed in request

## Authority boundaries to preserve
- Keep recommendation/simulation only, no execution expansion.
- Preserve tenant-context requirements.
- Continue to use canonical registry/recommendation/trust/governance/telemetry authorities.
