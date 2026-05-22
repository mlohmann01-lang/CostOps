# AI Cost Attribution Model

## Overview

The AI Cost Attribution Engine provides multi-dimensional cost attribution across all AI spend. It ingests `NormalizedCostRecord` arrays, groups them by dimension, computes aggregates, and assembles an `AIAttributionReport` with five breakdown views. A confidence assessment is attached to every report to communicate data quality to operators.

---

## Cost Dimensions

Eight dimensions are supported. The engine currently produces attribution reports across five of them (PROVIDER, MODEL, USER, WORKFLOW, AGENT). TOOL, BUSINESS_UNIT, and OUTCOME are available for future extension.

| Dimension | Key Source Field | Fallback Value |
|---|---|---|
| `PROVIDER` | `connectorId` | (always present) |
| `MODEL` | `modelId` | `'unknown'` |
| `USER` | `userId` | `'anonymous'` |
| `WORKFLOW` | `workflowId` | `'unattributed'` |
| `AGENT` | `agentId` | `'unattributed'` |
| `TOOL` | `toolId` | `'unattributed'` |
| `BUSINESS_UNIT` | `businessUnit` | `'unattributed'` |
| `OUTCOME` | `outcomeId` | `'no-outcome'` |

The fallback values are chosen intentionally. `'unattributed'` groups all records that lack a dimension key into a single visible bucket, making invisible spend visible. `'no-outcome'` in the OUTCOME dimension is the primary signal used by the AI ROI Governance pack to detect spend without business linkage.

---

## NormalizedCostRecord

The atomic unit consumed by the attribution engine. Telemetry events are converted to cost records via `telemetryEventsToAttributionRecords()` before attribution runs.

| Field | Type | Notes |
|---|---|---|
| `connectorId` | `string` | Source AI provider |
| `modelId` | `string \| null` | Inference model; null if not applicable |
| `userId` | `string \| null` | User who incurred cost |
| `workflowId` | `string \| null` | Workflow or pipeline context |
| `agentId` | `string \| null` | Agent context for autonomous spend |
| `toolId` | `string \| null` | Tool invocation context (future) |
| `businessUnit` | `string \| null` | Organisational unit (future) |
| `outcomeId` | `string \| null` | Business outcome linkage (future) |
| `inputTokens` | `number` | Input token count for this record |
| `outputTokens` | `number` | Output token count for this record |
| `costUSD` | `number` | USD cost attributed to this record |

Records arriving from telemetry events have `toolId`, `businessUnit`, and `outcomeId` set to `null` because those fields are not present in the telemetry pipeline. They are available when records are constructed directly by billing export connectors or enrichment pipelines.

---

## CostBreakdownEntry

Each breakdown report contains an array of `CostBreakdownEntry` records, one per unique value of the dimension key. Entries are sorted descending by `totalCostUSD`.

| Field | Type | Description |
|---|---|---|
| `dimensionType` | `CostDimension` | Which dimension this entry represents |
| `dimensionKey` | `string` | The specific value (e.g. `'OPENAI'`, `'gpt-4o'`, `'user@example.com'`) |
| `periodStart` | `string` | ISO 8601 period start |
| `periodEnd` | `string` | ISO 8601 period end |
| `totalCostUSD` | `number` | Total USD cost attributed to this key |
| `inputTokens` | `number` | Summed input tokens for this key |
| `outputTokens` | `number` | Summed output tokens for this key |
| `requestCount` | `number` | Number of cost records grouped under this key |
| `avgCostPerRequestUSD` | `number` | `totalCostUSD / requestCount`; 0 if requestCount is 0 |
| `percentageOfTotal` | `number` | Share of report-level `totalCostUSD`; range 0–100 |

---

## CostBreakdownReport

A single-dimension aggregate report returned by `buildCostBreakdown()`.

| Field | Type | Description |
|---|---|---|
| `tenantId` | `string` | Owning tenant |
| `periodStart` | `string` | ISO 8601 period start |
| `periodEnd` | `string` | ISO 8601 period end |
| `totalCostUSD` | `number` | Sum of all record costs in the period |
| `breakdowns` | `CostBreakdownEntry[]` | Sorted descending by cost |
| `generatedAt` | `string` | ISO 8601 generation timestamp |

---

## AIAttributionReport

The top-level output of `computeAttributionReport()`. Provides five breakdown dimensions simultaneously for a single tenant and period.

| Field | Type | Description |
|---|---|---|
| `tenantId` | `string` | Owning tenant |
| `periodStart` | `string` | ISO 8601 period start |
| `periodEnd` | `string` | ISO 8601 period end |
| `totalCostUSD` | `number` | Sum of all cost records in the period |
| `byProvider` | `CostBreakdownReport` | Breakdown by AI provider (connectorId) |
| `byModel` | `CostBreakdownReport` | Breakdown by model identifier |
| `byUser` | `CostBreakdownReport` | Breakdown by user identifier |
| `byWorkflow` | `CostBreakdownReport` | Breakdown by workflow identifier |
| `byAgent` | `CostBreakdownReport` | Breakdown by agent identifier |
| `confidence` | `CostConfidenceResult` | Data quality assessment for this report |
| `generatedAt` | `string` | ISO 8601 generation timestamp |

---

## Confidence Scoring

### CostConfidenceFactors

Before generating a report, the caller supplies a `CostConfidenceFactors` object describing the data quality context.

| Factor | Type | Weight |
|---|---|---|
| `hasModelPricing` | `boolean` | +0.15 — pricing record found for the model in the catalog |
| `hasUserId` | `boolean` | +0.10 — user attribution is available in the records |
| `hasWorkflowId` | `boolean` | +0.05 — workflow attribution is available |
| `hasFreshTelemetry` | `boolean` | +0.10 — telemetry data is less than 4 hours old |
| `hasSufficientVolume` | `boolean` | +0.05 — at least 100 events in the period |
| `attributionCompleteness` | `number` (0–1) | +0.05 × completeness — fraction of records with non-null userId |

### Scoring Formula

```
score = 0.50 (base)
      + 0.15 if hasModelPricing
      + 0.10 if hasUserId
      + 0.05 if hasWorkflowId
      + 0.10 if hasFreshTelemetry
      + 0.05 if hasSufficientVolume
      + 0.05 * min(1, max(0, attributionCompleteness))

confidenceScore = clamp(score, 0, 1)
```

The base score of 0.50 acknowledges that a cost estimate is possible even with poor data; the additive factors reward progressively better data quality up to a maximum of 1.0.

### CostConfidenceResult

| Field | Type | Description |
|---|---|---|
| `confidenceScore` | `number` | Final score in range 0–1 |
| `confidenceLabel` | `string` | Human-readable tier |
| `factors` | `CostConfidenceFactors` | The input factors for traceability |
| `caveats` | `string[]` | One caveat string for each `false` boolean factor |

### Confidence Labels

| Score Range | Label | Interpretation |
|---|---|---|
| >= 0.85 | `HIGH` | Cost estimate is reliable for budget decisions |
| >= 0.70 | `MEDIUM` | Estimate is directionally accurate; review caveats |
| >= 0.50 | `LOW` | Estimate carries material uncertainty; use with caution |
| < 0.50 | `INSUFFICIENT` | Data quality is too low for reliable cost decisions |

---

## Attribution Completeness

`attributionCompleteness` in `CostConfidenceFactors` is computed as:

```
attributionCompleteness = (records with non-null userId) / (total records)
```

A value of 1.0 means every cost record is linked to a named user. A value of 0.0 means all spend is anonymous. This metric directly feeds the confidence score and is surfaced in caveats when low.

---

## Handling Unattributed Records

Records where a dimension key is `null` are not dropped. They are assigned a deterministic fallback key:

- `workflowId = null` becomes `'unattributed'` in the WORKFLOW breakdown
- `agentId = null` becomes `'unattributed'` in the AGENT breakdown
- `userId = null` becomes `'anonymous'` in the USER breakdown
- `outcomeId = null` becomes `'no-outcome'` in the OUTCOME breakdown

This design ensures that unattributed spend is always visible in reports as a named bucket rather than being silently excluded. The `'unattributed'` bucket in the WORKFLOW or AGENT view is the primary indicator that attribution instrumentation is incomplete and should be addressed.
