# Sprint A1 Opportunity Factory Gap Report

## 1. Existing opportunity sources found

| Source | Pre-A1 behavior | A1 canonical path |
| --- | --- | --- |
| Trust | Static `TRUST` rows were seeded directly into `OpportunityRepository`; trust findings/tasks lived separately. | `TrustProvider` registers with the Opportunity Factory and emits canonical trust opportunities into `OpportunityRepository`. |
| Vendor Change | `POST /vendor-changes/:id/generate-opportunities` generated inline opportunities and changed vendor status. | `VendorProvider` generates vendor opportunities through the factory; vendor opportunity generation route now returns factory-backed canonical opportunities for the change without changing approval/execution state. |
| Renewal | Renewal readiness generated inline renewal opportunities. | `RenewalProvider` generates renewal opportunities through the factory; renewal readiness reads canonical renewal opportunities from the store. |
| Benchmark | Benchmark routes generated inline benchmark opportunities. | `BenchmarkProvider` generates benchmark opportunities through the factory; benchmark opportunity reads use the canonical store. |
| Contract | Contract routes generated inline contract opportunities. | `ContractProvider` generates contract opportunities through the factory; contract opportunity reads use the canonical store. |
| Utilization | Utilization routes generated inline utilization opportunities. | `UtilizationProvider` generates utilization opportunities through the factory; utilization opportunity reads use the canonical store. |
| Drift | Static `DRIFT` rows were seeded directly into `OpportunityRepository`; drift events lived separately. | `DriftProvider` registers with the Opportunity Factory and emits canonical drift opportunities into `OpportunityRepository`. |

## 2. Sources migrated

- Migrated all requested providers into `lib/opportunity-factory/opportunity-source-registry.ts`:
  - `TrustProvider`
  - `VendorProvider`
  - `RenewalProvider`
  - `BenchmarkProvider`
  - `ContractProvider`
  - `UtilizationProvider`
  - `DriftProvider`
- Persisted factory output through `OpportunityRepository` only.
- Updated executive prioritization to continue consuming only `OpportunityRepository`, with no direct source reads.

## 3. Sources not migrated

No requested Sprint A1 source remains outside the Opportunity Factory provider registry.

## 4. Remaining bypasses

- Source intelligence pages still expose source records, summaries, and diagnostics because they are not opportunity authorities.
- Some source summary values still calculate recoverable value from source intelligence for context; canonical opportunity lists are read from the Opportunity Store.
- Existing recommendation-generation systems remain separate from the Opportunity model and should be reviewed in a future recommendation/opportunity boundary sprint.

## 5. Remaining duplicate authorities

- The durable database does not yet contain a first-class `opportunities` table in this implementation; `OpportunityRepository` remains the canonical in-process authority for the current codebase.
- Unified governance events use the existing in-memory evidence timeline for `OPPORTUNITY_*` events. Durable platform events exist separately, but the unified evidence timeline itself is not durable yet.

## 6. Impact on prioritization

- `/api/priorities` reads only the canonical `OpportunityRepository` via `ExecutivePriorityRepository`.
- Priority rankings now reflect factory-persisted opportunities after `POST /api/opportunity-factory/run`.
- Source-generated inline opportunities no longer need to be read by prioritization.

## 7. Impact on approvals

- The Opportunity Factory does not submit approvals and does not create approval workflows.
- Factory-created opportunities remain in discovery/prioritization/readiness states and are safe for a future Approval Authority consolidation sprint.

## 8. Impact on outcomes

- The Opportunity Factory does not execute actions and does not verify outcomes.
- Drift opportunities can be discovered canonically, but proof/outcome linkage remains a separate authority boundary for A3 Outcome Proof Authority.
