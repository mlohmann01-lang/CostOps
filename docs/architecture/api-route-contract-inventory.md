# API Route Contract Inventory

Date: 2026-05-16

| Route prefix | Backend file | Known endpoints | UI page(s) |
|---|---|---|---|
| `/api/recommendations` | `artifacts/api-server/src/routes/recommendations.ts` | `GET /`, `POST /generate`, `POST /arbitrate`, `GET /prioritized-queue`, `GET /arbitration*` | `pages/recommendations.tsx` |
| `/api/playbooks` | `artifacts/api-server/src/routes/playbooks.ts` | `POST /m365/evaluate`, `GET /recommendations`, `GET /suppressed`, explainability/outcomes endpoints | `pages/recommendations.tsx`, `pages/recommendation-detail.tsx` |
| `/api/approvals` | `artifacts/api-server/src/routes/approvals.ts` | `GET /`, `POST /`, `POST /:id/approve`, `POST /:id/reject`, `GET /recommendation/:recommendationId` | `pages/approvals.tsx`, `pages/recommendations.tsx` |
| `/api/workflow` | `artifacts/api-server/src/routes/workflow.ts` | item lifecycle, assignment, decisions, exceptions | `pages/workflow-center.tsx`, `pages/approvals.tsx` |
| `/api/governance` | `artifacts/api-server/src/routes/governance.ts` | policy and governance APIs | `pages/governance.tsx` |
| `/api/reconciliation` | `artifacts/api-server/src/routes/reconciliation.ts` | reconciliation findings/status endpoints | `pages/reconciliation.tsx` |
| `/api/telemetry` | `artifacts/api-server/src/routes/telemetry.ts` | events/connectors/governance/operators/slas/diagnostics/failures | `pages/runtime-telemetry.tsx`, `pages/platform-events.tsx` |
| `/api/pilot` | `artifacts/api-server/src/routes/pilot.ts` | readiness + support diagnostics | `pages/pilot-readiness.tsx`, `pages/support-diagnostics.tsx` |
| `/api/connectors` | `artifacts/api-server/src/routes/connectors.ts` | connector sync/status operations | `pages/connectors.tsx`, `pages/connectors-m365.tsx` |
