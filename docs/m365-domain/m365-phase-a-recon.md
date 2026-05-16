# M365 Phase A Recon (Evidence + Trust)

## Existing M365 evidence shape
Current normalized evidence in `M365EvidenceNormalizationService` returns limited shape (`userId`, display/department/costCentre, assignedLicences, cost, sign-in/activity, mailbox/account status, basic usage/admin/service flags, completeness/freshness numeric score, sourceSystem).

## Missing normalized fields
Missing fields include: tenant/user identity metadata, expanded role/context flags, assigned SKU/service plan naming, workload usage coverage (desktop/web/mobile + Outlook/Teams/OneDrive/SharePoint/Exchange + add-ons), storage fields, legal/retention/compliance indicators, connector health, and confidence dimensions.

## Existing trust flow
`ConnectorTrustService.evaluateM365EvidenceTrust` computes aggregate scores from freshness/completeness/consistency/identity/source-reliability and derives trust band.

## Existing reconciliation findings
`EvidenceReconciliationService` currently emits generic findings (`MISSING_REQUIRED_FIELD`, `UNKNOWN_COST_CENTRE`, `SKU_COST_MISSING`, `STALE_EVIDENCE`, `MAILBOX_TYPE_CONFLICT`).

## Current suppression rules
`PlaybookRecommendationService` suppresses for missing required signals, exclusions, unmatched trigger, quarantined connector trust, and findings block.

## Current recommendation gating
Gating currently maps to suppression rows or recommendations with `READY_FOR_ORCHESTRATION` / `NEEDS_TRUST_REVIEW` only.

## Files expected to change
- `artifacts/api-server/src/lib/connectors/m365/m365-evidence-normalization-service.ts`
- `artifacts/api-server/src/lib/connectors/m365/connector-trust-service.ts`
- `artifacts/api-server/src/lib/connectors/m365/evidence-reconciliation-service.ts`
- `artifacts/api-server/src/lib/connectors/m365/m365-read-only-sync-service.ts`
- `artifacts/api-server/src/lib/playbooks/playbook-recommendation-service.ts`
- `artifacts/api-server/src/tests/m365-*.test.ts`
- docs listed in phase instructions

## Authority boundaries that must remain intact
- Extend existing authorities only (normalization, trust, reconciliation, recommendation service).
- Keep READ_ONLY / RECOMMEND_ONLY behavior (no Graph mutations/execution additions).
- No new API surfaces per use case; reuse existing routes/services.
