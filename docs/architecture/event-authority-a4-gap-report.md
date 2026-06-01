# A4 Unified Event Authority Gap Report

## Event sources found

| Source | Current event examples | Previous storage / owner | A4 authority decision |
| --- | --- | --- | --- |
| Recommendation governance | recommendation readiness/governance events | Recommendation governance event repository plus timeline normalization | Normalized into Platform Event Authority as `PRIORITY` events. |
| Approval workflows / approval authority | `APPROVAL_SUBMITTED`, `APPROVAL_GRANTED`, `APPROVAL_REJECTED` | Workflow audit events plus unified evidence timeline | Canonicalized to `APPROVAL_*` platform events. |
| Opportunity Factory | `OPPORTUNITY_DISCOVERED`, `OPPORTUNITY_UPDATED`, `OPPORTUNITY_DEDUPLICATED` | Unified evidence timeline | Emitted through Platform Event Authority as `OPPORTUNITY` events. |
| Execution runtime and execution requests | `EXECUTION_REQUEST_CREATED`, `EXECUTION_STARTED`, `EXECUTION_COMPLETED`, `EXECUTION_FAILED` | Unified evidence timeline | Read through Platform Event Authority compatibility normalization; direct emitters remain as adapters. |
| Outcome Proof Authority | `OUTCOME_PROOF_*` | Unified evidence timeline | Emitted through Platform Event Authority as `OUTCOME` events. |
| Drift monitor | `DRIFT_DETECTED`, resolved/no-drift checks | Drift monitor state plus unified evidence timeline | Emitted through Platform Event Authority as `DRIFT` events. |
| Trust resolution tasks | task created/assigned/escalated/resolved | Trust task service state, previously no consistent event path | Task mutations now emit `TRUST_*` platform events. |
| Runtime health | runtime/component health status | Runtime health response only | Runtime health records `RUNTIME_DEGRADED`/`RUNTIME_RECOVERED` and reports Platform Event Authority health. |

## Sources migrated

- Approval Authority now writes approval transitions through `PlatformEventService`.
- Opportunity Factory writes opportunity lifecycle events through `PlatformEventService`.
- Outcome Proof Authority writes proof lifecycle events through `PlatformEventService`.
- Drift evaluation writes drift detected/resolved events through `PlatformEventService`.
- Trust task routes write task-created/task-started/task-resolved events through `PlatformEventService`.
- Runtime Health reads platform event volume and reports the `Platform Event Authority` component.
- `/api/events` and `/api/platform-events` now read via Platform Event Authority.

## Remaining direct emitters

Some execution and dry-run services still call the legacy `appendUnifiedEvent` compatibility adapter. These are not competing read authorities because `PlatformEventRepository` normalizes the existing unified evidence timeline into canonical Platform Events. They should be migrated incrementally to direct `PlatformEventService.recordExecutionEvent()` calls.

## Remaining duplicated timelines

- Recommendation governance repository still stores recommendation-specific events for existing recommendation timelines.
- Approval workflow audit events remain embedded in workflow records for workflow details.
- UI demo activity remains a demo-only source and is normalized to runtime events only in demo mode.

## Durability gaps

A4 intentionally does not introduce another event store. The Platform Event Authority uses the existing unified evidence timeline backing path and normalizes legacy unified events at read time. The underlying unified event timeline remains memory-backed in this environment; production should bind the same repository contract to the existing durable `platform_events` infrastructure or a durable unified event log without creating a second authority.

## Production risks

- Direct `appendUnifiedEvent` callers remain and should be migrated to service helpers over time.
- Existing event IDs from legacy sources may collide if callers reuse IDs; the repository rejects duplicates to preserve immutability.
- Some legacy categories (`RECOMMENDATION`, `DISCOVERY`, `POLICY`, `CAMPAIGN`) are mapped to canonical categories (`PRIORITY` or `SYSTEM`) for reads, which may require downstream consumer education.
- Historical events are normalized at read time, so historical metadata completeness depends on the original event payload.

Risk level after A4: **Medium-Low**. Read ownership and primary A1/A2/A3 emitters are consolidated, while legacy direct emitters remain compatibility producers rather than separate event authorities.
