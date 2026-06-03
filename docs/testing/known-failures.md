# Known Test Failures

This quarantine documents the current control-plane failures that pre-date the Sprint 2 UI consolidation. Future UI work should fail the baseline only when the test-baseline report identifies one or more `NEW FAIL` entries.

| Failure ID | File | Test Name | Failure Reason | Owner | Priority | Expected Resolution Sprint | Status |
|---|---|---|---|---|---|---|---|
| KP-001 | `execution-outcome-verification-live.test.tsx` | Outcome reconciliation verifies live outcome totals | Outcome reconciliation mismatch between the live outcome ledger and verification bridge. | Execution Runtime | Medium | Execution Runtime Sprint | Known Existing Failure |
| KP-002 | `execution-outcome-verification-live.test.tsx` | Outcome proof records reconcile after execution | Existing proof-chain fixture does not yet emit the final reconciliation event. | Execution Runtime | Medium | Execution Runtime Sprint | Known Existing Failure |
| KP-003 | `runtime-completion-live.test.tsx` | Completion state emits terminal runtime event | Runtime completion event ordering is unstable in the current live fixture. | Runtime Platform | Medium | Execution Runtime Sprint | Known Existing Failure |
| KP-004 | `live-runtime-events.test.tsx` | Runtime event stream normalises live connector events | Live event payload contains legacy connector event names. | Runtime Platform | Low | Connector Onboarding UX Sprint | Known Existing Failure |
| KP-005 | `live-read-model.test.tsx` | Live read model exposes canonical recommendation fields | Existing read model still returns a legacy recommendation shape for some rows. | Runtime Platform | High | First Live Tenant Workflow Sprint | Known Existing Failure |
| KP-006 | `m365-live-recommendation-flow.test.tsx` | M365 live recommendation creates approval-ready action | M365 fixture lacks one approval-readiness field expected by the newer recommendation contract. | M365 Runtime | High | M365 Live Execution Path Sprint | Known Existing Failure |
| KP-007 | `recommendation-approval-bridge.test.tsx` | Approval bridge returns current approval stage | Approval bridge fixture still uses a legacy approval state enum. | Approval Runtime | Medium | First Live Tenant Workflow Sprint | Known Existing Failure |
| KP-008 | `execution-request-live.test.tsx` | Live execution request includes tenant execution boundary | Existing live execution request fixture omits the tenant boundary metadata. | Execution Runtime | High | M365 Live Execution Path Sprint | Known Existing Failure |
| KP-009 | `execution-request-dry-run-live.test.tsx` | Dry-run request returns estimated impact proof | Dry-run live fixture does not include the latest impact proof envelope. | Execution Runtime | Medium | M365 Live Execution Path Sprint | Known Existing Failure |
| KP-010 | `execution-request-execute-live.test.tsx` | Execute request records governed action state | Execute live fixture still records the pre-authority action state. | Execution Runtime | High | M365 Live Execution Path Sprint | Known Existing Failure |
| KP-011 | `trust-resolution-actions.test.tsx` | Trust task action updates accountability backlog | Trust task fixture does not update the backlog rollup after an action mutation. | Data Trust | Medium | Evidence Pack Generation Sprint | Known Existing Failure |
| KP-012 | `outcome-verification-evidence.test.tsx` | Verification evidence links to outcome proof | Existing evidence fixture uses a proof reference that is not yet lineage-normalised. | Evidence Runtime | Medium | Evidence Pack Generation Sprint | Known Existing Failure |
| KP-013 | `demo-runtime-realism.test.tsx` | no live API calls in demo mode hooks | Demo-mode hook guard test still flags an existing `useOutcomesData` source mismatch. | Demo Runtime | Low | Test Baseline Stabilisation Sprint | Known Existing Failure |
| KP-014 | `data-trust-console.test.tsx` | live mode calls /api/trust/* | Trust endpoint baseline expects four routes while the current hook also includes the M365 connector trust route. | Data Trust | Low | Test Baseline Stabilisation Sprint | Known Existing Failure |

## Baseline Rules

- `PASS`: the selected test file completed successfully.
- `KNOWN FAIL`: the selected test file failed and is listed in this quarantine table.
- `NEW FAIL`: the selected test file failed and is not listed in this quarantine table.

A Sprint 2 UI change should be blocked only when `NEW FAIL > 0`.
