# A3 Outcome Proof Authority Gap Report

## 1. Outcome models found

| Model / table | Current role | Consolidation decision |
| --- | --- | --- |
| `outcome_ledger` | Legacy ledger of projected/executed savings and evidence JSON. | Retained as a compatibility projection; `/api/outcomes/ledger*` now reads the Outcome Proof Authority projection. |
| `outcome_verifications` | Persisted verification results for ledger rows. | Retained as source input/evidence reference; not an independent proof authority. |
| `execution_outcomes` | Execution-result verification output with ledger upsert side effect. | Retained as source input/evidence reference; verification flow projects into Outcome Proof Authority. |
| `execution_results` | Raw execution completion and evidence records. | Retained as execution evidence source; execution flow projects EXECUTED proof state. |
| `recommendation_outcomes` / projection service | Command metrics projection. | Retained for compatibility metrics only; proof summary is canonical for proof lifecycle values. |

## 2. Canonical proof authority chosen

The canonical authority is **Outcome Proof Authority**, implemented as `OutcomeProofService` over canonical `OutcomeProof` records. It extends the existing ledger/proof layer by treating ledger, verification, execution outcome, and drift records as inputs/projections rather than competing sources of truth.

The current implementation is in-process and projects from existing persisted tables when available. This avoids adding a third/fourth competing durable store during A3 while still centralizing proof reads and lifecycle transitions.

## 3. Tables/routes migrated

- Added canonical proof endpoints:
  - `GET /api/outcomes/proof`
  - `GET /api/outcomes/proof/summary`
  - `GET /api/outcomes/proof/:outcomeId`
- Migrated legacy ledger routes to compatibility projections:
  - `GET /api/outcomes/ledger`
  - `GET /api/outcomes/ledger/summary`
  - `GET /api/outcomes/ledger/by-playbook`
  - `GET /api/outcomes/ledger/by-state`
  - `GET /api/outcomes/ledger/proof-console`
- Updated proof console, Command, and Runtime Health read paths to prefer proof summary/proof endpoints.

## 4. Compatibility paths retained

- `outcome_ledger` rows remain readable through ledger routes for existing consumers.
- `outcome_verifications` remain readable and continue to support reverify/evidence routes.
- `execution_outcomes` remain readable for execution-result outcome APIs.
- Legacy UI hook name `useOutcomesData` remains as a shim over `useOutcomeProofData`.

## 5. Remaining outcome duplication

- Physical database tables still exist because A3 is a consolidation sprint, not a destructive migration.
- `execution_outcomes` still upserts a legacy ledger row for compatibility, but proof reads are canonicalized through `OutcomeProofService`.
- Some older pages outside the Command/Outcome Proof Console surface still display execution-orchestration savings proof summaries; they are intentionally not migrated in A3 to avoid dashboard/feature expansion.

## 6. Proof lifecycle coverage

| Stage | Coverage |
| --- | --- |
| PROJECTED | Recommendation/opportunity projection creates projection evidence. |
| APPROVED | Approval projection records approval evidence and approved savings. |
| EXECUTED | Execution result projection records execution evidence and executed savings. |
| VERIFIED | Verification projection records verification evidence, verified savings, variance, and confidence. |
| RETAINED | Type and summary fields are supported; retained value remains zero unless existing data supplies retention evidence. |
| PROTECTED | Drift projection records protected value and drift/protection evidence. |
| DRIFTED | Drift projection can move proof to DRIFTED. |
| FAILED | Failed verification moves proof to FAILED. |
| CLOSED | Type supported; no new closure workflow added in A3. |

## 7. Event coverage

Canonical events emitted through the existing unified timeline:

- `OUTCOME_PROOF_PROJECTED`
- `OUTCOME_PROOF_APPROVED`
- `OUTCOME_PROOF_EXECUTED`
- `OUTCOME_PROOF_VERIFIED`
- `OUTCOME_PROOF_RETAINED`
- `OUTCOME_PROOF_PROTECTED`
- `OUTCOME_PROOF_DRIFTED`
- `OUTCOME_PROOF_FAILED`
- `OUTCOME_PROOF_UPDATED`

## 8. Remaining durability gaps

Unified governance events are still backed by the existing in-memory event timeline in this environment. A3 emits through that path and does not introduce another event store. The proof authority itself projects from durable legacy/source tables where available and uses in-memory upserts for newly projected proof state in test/development modes.

## 9. Remaining production risks

- A future migration should add a durable `outcome_proofs` table or extend `outcome_ledger` with all canonical proof fields once migrations are scheduled.
- Retention evidence is not invented; retained savings remain zero until a retention check or drift source supplies it.
- Older compatibility routes remain available; code comments mark ledger paths as projections, but consumer migration should continue.
- Projection failures are intentionally non-blocking for verification/execution flows; failed projections emit a unified outcome event for follow-up.

Risk level after A3: **Medium**. The primary authority path is consolidated, but durability and full historical migration remain follow-up production hardening work.
