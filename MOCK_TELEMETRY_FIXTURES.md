# Mock Telemetry Fixtures

## Purpose

The mock telemetry fixture module provides a deterministic synthetic dataset covering all 8 AI governance pack scenarios. It is the canonical test input for unit tests, integration tests, and development environments. No live provider API calls are needed to exercise the full governance pack lifecycle.

All values in the fixtures are computed from fixed formulas. There is no `Math.random()` anywhere in the module. Given the same `tenantId` and `scenario`, the output is identical across every run and every environment.

---

## Reference Date

All mock timestamps are anchored to:

```
2026-05-21T00:00:00Z
```

This constant is exported as `MOCK_REFERENCE_DATE`. Historical offsets are computed by subtracting hours or days from this anchor. For example, an event "2 hours ago" has `normalizedAt: 2026-05-20T22:00:00.000Z`. An event "7 days ago" has `normalizedAt: 2026-05-14T00:00:00.000Z`.

---

## Seed Mechanism

A deterministic integer seed is derived from the `tenantId` string:

```typescript
seed = tenantId.charCodeAt(0) % 100
```

The seed is used as an additive offset in loops (e.g. user IDs, token counts, cost values) so that different tenant IDs produce different but fully reproducible data. The first character of the string is used because it is stable and simple to reason about. No character beyond index 0 influences the seed.

---

## The 8 Scenarios

### TOKEN_GOVERNANCE

**Function:** `buildTokenGovernanceScenario(tenantId)`
**Event count:** 20
**Primary connector:** OPENAI

**Key characteristics:**
- 10 `TOKEN_USAGE` events on `gpt-4o` with elevated input tokens (1,200–2,100) and costs ($0.042–$0.069)
- 10 `TOKEN_USAGE` events on `gpt-4o-mini` for the same task types with similar token volumes but costs 35x lower (~$0.001–$0.002)
- Both sets share `workflowId` values from the same pool (`wf-simple-0` through `wf-simple-2`), demonstrating that simple workflows are consuming premium model capacity

This scenario is the primary test input for the AI Token Governance pack's MODEL_DOWNGRADE recommendation path.

---

### MODEL_ROUTING

**Function:** `buildModelRoutingScenario(tenantId)`
**Event count:** 15
**Primary connector:** OPENAI

**Key characteristics:**
- 10 events on `gpt-4o` for classification workflows (`wf-classify-0` through `wf-classify-4`) with low token counts (400–700 input), indicating TRIVIAL or SIMPLE tasks — these are over-qualified
- 5 events on `gpt-4o` for genuinely complex workflows (`wf-complex-0` through `wf-complex-4`) with high token counts (3,000–5,000 input) — correctly qualified

The 10:5 ratio of over-qualified to correctly-qualified requests is the signal that triggers TASK_CLASSIFICATION_ROUTING and DOWNGRADE_TO_MINI recommendations.

---

### VENDOR_SEAT_RECLAIM

**Function:** `buildVendorSeatReclaimScenario(tenantId)`
**Event count:** 20
**Primary connector:** CURSOR (also includes OPENAI)

**Key characteristics:**
- 6 CURSOR `SEAT_ACTIVITY` events with `seatActive: true` and `seatLastActiveAt` within the last 3 days
- 6 OPENAI `SEAT_ACTIVITY` events with `seatActive: true` and `seatLastActiveAt` within the last 2 days
- 8 mixed CURSOR/OPENAI `SEAT_ACTIVITY` events with `seatActive: false` and `seatLastActiveAt` 35–56 days ago

The 8 idle seats are the direct input to the SEAT_RECLAIM recommendation generator.

---

### AGENT_RUNTIME

**Function:** `buildAgentRuntimeScenario(tenantId)`
**Event count:** 25
**Primary connector:** ANTHROPIC

**Key characteristics:**
- 8 `AGENT_ACTIVITY` events per active agent for three agents: `agent-alpha`, `agent-beta`, `agent-gamma` (24 events total)
- Each agent uses `claude-sonnet-4-6` with increasing cost per agent (alpha is cheapest, gamma is most expensive)
- 1 `TOKEN_USAGE` event for `agent-delta` with `inputTokens: 0`, `outputTokens: 0`, `costUSD: 0`, timestamped 7 days ago — this is the idle/orphaned agent signal

The single zero-activity event for agent-delta triggers the AGENT_DISABLE or AGENT_ARCHIVE recommendation path.

---

### CONTEXT_GOVERNANCE

**Function:** `buildContextGovernanceScenario(tenantId)`
**Event count:** 15
**Primary connector:** OPENAI

**Key characteristics:**
- 10 `TOKEN_USAGE` events on `gpt-4o` with `inputTokens` between 105,000 and 119,000 — these represent context windows that are 80%+ utilized against GPT-4o's 128k limit
- 5 `TOKEN_USAGE` events on `gpt-4o` with normal `inputTokens` (4,000–6,800) for comparison
- All events carry `workflowId` values from the pool `wf-cg-0` through `wf-cg-3`

The 10:5 split of bloated vs normal context requests is the primary signal for CONTEXT_COMPRESSION and RETRIEVAL_LIMIT recommendations.

---

### ROI_GOVERNANCE

**Function:** `buildROIGovernanceScenario(tenantId)`
**Event count:** 20
**Primary connector:** OPENAI

**Key characteristics:**
- All 20 events have `workflowId: null` — there is no outcome linkage on any record
- Mixed model usage: every 3rd event uses `gpt-4o`, the rest use `gpt-4o-mini`
- Cost range: $0.028–$0.057 per event
- No agent attribution

The complete absence of `workflowId` across all records is the signal for `ESTABLISH_OUTCOME_TRACKING` and `REALLOCATE_UNATTRIBUTED_SPEND` recommendations.

---

### DRIFT_GOVERNANCE

**Function:** `buildDriftGovernanceScenario(tenantId)`
**Event count:** 30
**Primary connector:** OPENAI

**Key characteristics:**
- 10 baseline events from days 14–5 ago with `inputTokens` 1,000–1,450 and cost $0.035–$0.049
- 20 spike events from the last 7 days with `inputTokens` 3,000–5,850 (3x baseline) and cost $0.105–$0.189 (also approximately 3x)
- Both sets share the same `workflowId` pool (`wf-dg-0` through `wf-dg-2`), indicating the same workflows are now consuming far more resources

The cost ratio between the two periods is the primary input to TOKEN_SPIKE and COST_SPIKE drift rules.

---

### OVERLAP_ELIMINATION

**Function:** `buildOverlapEliminationScenario(tenantId)`
**Event count:** 20
**Primary connectors:** CURSOR and WINDSURF

**Key characteristics:**
- 5 users have `seatActive: true` on both CURSOR and WINDSURF simultaneously — these are the overlap users (`user-overlap-0` through `user-overlap-4` with seed offset)
- 5 users have a CURSOR-only seat active
- 5 users have a WINDSURF-only seat active
- All 20 events are `SEAT_ACTIVITY` type

The 5 dual-tool users are the direct input to the `CONSOLIDATE_VENDOR` and `REMOVE_REDUNDANT_TOOL` recommendation paths.

---

## Using buildMockTelemetrySnapshot in Tests

```typescript
import { buildMockTelemetrySnapshot } from '../lib/ai-mock-telemetry-fixtures.js'

const snapshot = buildMockTelemetrySnapshot('tenant-abc', 'TOKEN_GOVERNANCE')

// snapshot.normalizedEvents — array of NormalizedAITelemetryEvent
// snapshot.overallFreshnessState — 'FRESH'
// snapshot.overallTrustLevel — 'HIGH'
// snapshot.overallTrustScore — 0.9
// snapshot.connectorAssessments[0].connectorId — 'OPENAI'
// snapshot.periodStartAt — 14 days before MOCK_REFERENCE_DATE
// snapshot.periodEndAt — MOCK_REFERENCE_DATE
```

All mock snapshots are created with `freshnessState: 'FRESH'`, `trustLevel: 'HIGH'`, and `trustScore: 0.9`. The connector assessment's `lastSyncAt` is set to 1 hour before `MOCK_REFERENCE_DATE`. This means freshness gates in governance packs will always pass on mock snapshots, allowing tests to reach the recommendation and simulation layers without mocking the freshness layer separately.

The `snapshotId` follows the pattern `mock-snapshot-{scenario}-{tenantId}`, making it stable and searchable in test output.

---

## Raw Event Fixtures

`buildRawTokenUsageEvents(tenantId, connectorId, count)` produces `RawAITelemetryEvent` arrays suitable for testing the normalizer pipeline directly. Each event has a `rawPayload` with `modelId`, `userId`, `inputTokens`, `outputTokens`, and `costUSD` fields using OpenAI-style camelCase names. `collectedAt` is offset by one hour per event from `MOCK_REFERENCE_DATE`.

---

## Adding a New Scenario

1. Define a builder function following the pattern `build{ScenarioName}Scenario(tenantId: string): NormalizedAITelemetryEvent[]`. Use `makeEvent()` with required overrides. Use `offsetHours()` or `offsetDays()` for timestamps. Use `tenantSeed(tenantId)` for any index-based variation.

2. Add the scenario key to the `ScenarioKey` union type.

3. Add a case in `buildScenarioEvents()` dispatching to the new builder.

4. Add a case in `scenarioConnector()` returning the primary connector for the scenario.

5. Call `buildMockTelemetrySnapshot(tenantId, 'YOUR_SCENARIO')` in tests. No other wiring is required.

Do not use `Math.random()`, `Date.now()`, or any other non-deterministic source. All variation must flow from `tenantId` via `tenantSeed()` or from loop indices.
