# AI Telemetry Contracts

## Purpose

This document describes the canonical telemetry schemas used throughout the AI Economic Operations Layer. Every AI governance pack, cost attribution engine, and drift detection rule operates on data that passes through this pipeline. The contracts enforce a clean boundary between raw provider-specific payloads and the normalised, vendor-agnostic form that the rest of the platform consumes.

---

## Event Types

Six event types are defined and handled by the normalization pipeline:

| Event Type | Description |
|---|---|
| `TOKEN_USAGE` | Per-request or per-period token consumption from an inference API |
| `SEAT_ACTIVITY` | Seat assignment status and last-active timestamp for a licensed user |
| `BILLING_EXPORT` | Billing line items exported from a provider's cost API |
| `AGENT_ACTIVITY` | Autonomous or scheduled agent execution events |
| `WORKSPACE_ACTIVITY` | Workspace-level activity (e.g. Cursor, Windsurf IDE sessions) |
| `EMBEDDING_USAGE` | Embedding API calls with dimension and token counts |

---

## RawAITelemetryEvent

The raw event is the unprocessed form collected directly from a provider connector. No field transformation is applied at collection time.

| Field | Type | Description |
|---|---|---|
| `eventId` | `string` | Unique identifier assigned by the connector at collection time |
| `connectorId` | `string` | Identifies the source connector: `OPENAI`, `ANTHROPIC`, `CURSOR`, `WINDSURF`, `AZURE_OPENAI`, `GOOGLE_AI`, or `PERPLEXITY` |
| `eventType` | `string` | One of the six canonical event types listed above |
| `tenantId` | `string` | Platform tenant this event belongs to |
| `rawPayload` | `Record<string, unknown>` | Provider-specific payload; field names vary by vendor (e.g. `prompt_tokens` vs `inputTokens`) |
| `collectedAt` | `string` | ISO 8601 timestamp at which the connector fetched this event |
| `sourceVersion` | `string` | The API version returned by the provider (e.g. `2024-02-01`); used for schema migration tracking |

---

## NormalizedAITelemetryEvent

The normalized event is the canonical output of the normalization pipeline. All governance packs and cost engines consume this form exclusively.

| Field | Type | Description |
|---|---|---|
| `eventId` | `string` | Derived from the raw event: `norm-{rawEventId}` |
| `connectorId` | `string` | Preserved from the raw event |
| `eventType` | `string` | Preserved from the raw event |
| `tenantId` | `string` | Preserved from the raw event |
| `modelId` | `string \| null` | Canonical model identifier (e.g. `gpt-4o`, `claude-sonnet-4-6`); `null` for non-inference events |
| `userId` | `string \| null` | User who triggered the event; `null` when not attributable |
| `workflowId` | `string \| null` | Workflow or pipeline identifier; `null` when not provided |
| `agentId` | `string \| null` | Agent identifier for autonomous execution events; `null` for human-initiated requests |
| `inputTokens` | `number` | Prompt / input token count; `0` for non-token events |
| `outputTokens` | `number` | Completion / output token count; `0` for non-token events |
| `costUSD` | `number` | Cost attributed to this event in USD; `0` when not computable |
| `seatActive` | `boolean \| null` | Whether the seat was active at collection time; populated only for `SEAT_ACTIVITY` and `WORKSPACE_ACTIVITY` events |
| `seatLastActiveAt` | `string \| null` | ISO 8601 timestamp of last seat activity; populated only for seat events |
| `embeddingDimensions` | `number \| null` | Embedding vector dimensionality; populated only for `EMBEDDING_USAGE` events |
| `normalizedAt` | `string` | ISO 8601 timestamp at which normalization ran |
| `rawEventId` | `string` | The `eventId` of the source `RawAITelemetryEvent` |
| `dataVersion` | `string` | Normalization schema version (currently `1.0.0`); enables forward-compatibility checks |

### Data Version Field

`dataVersion` records the version of the normalization schema used to produce each event. When the normalization logic changes — for example, if a new provider introduces a field name variation — the version is incremented. Downstream consumers can inspect `dataVersion` to determine whether re-normalization is required on stored events. The current production version is `1.0.0`.

---

## AITelemetrySnapshot

A snapshot is the unit of input to all 8 AI governance packs. It aggregates normalized events for a tenant across a time window and includes a per-connector freshness assessment.

| Field | Type | Description |
|---|---|---|
| `tenantId` | `string` | Owning tenant |
| `snapshotId` | `string` | Unique identifier for this snapshot |
| `periodStartAt` | `string` | ISO 8601 start of the telemetry window |
| `periodEndAt` | `string` | ISO 8601 end of the telemetry window |
| `connectorAssessments` | `ConnectorFreshnessAssessment[]` | One assessment per active connector |
| `normalizedEvents` | `NormalizedAITelemetryEvent[]` | All normalized events in the period |
| `overallFreshnessState` | `TelemetryFreshnessState` | Worst-case freshness across all connectors |
| `overallTrustLevel` | `TelemetryTrustLevel` | Derived from `overallTrustScore` |
| `overallTrustScore` | `number` | Aggregate trust score in the range 0–1 |
| `snapshotGeneratedAt` | `string` | ISO 8601 timestamp of snapshot generation |

### ConnectorFreshnessAssessment

Each connector in a snapshot gets a freshness assessment with these fields: `connectorId`, `tenantId`, `lastSyncAt`, `freshnessState`, `trustLevel`, `trustScore`, `eventCount`, `stalenessReasonCodes`, `assessedAt`.

---

## Freshness and Trust States

### TelemetryFreshnessState

| State | Condition |
|---|---|
| `FRESH` | Last sync within 4 hours, sufficient event volume, no duplicate event IDs |
| `STALE` | Last sync between 4 and 24 hours ago |
| `MISSING` | No sync recorded, or last sync older than 72 hours |
| `PARTIAL` | Sync is recent but event count is below the minimum expected threshold (5 events) |
| `CONFLICTING` | Duplicate `eventId` values detected in the event array |

### TelemetryTrustLevel

Trust score is computed by starting at 1.0 and applying deductions:

| Condition | Deduction |
|---|---|
| `MISSING` freshness | -0.60 |
| `STALE` freshness | -0.30 |
| `PARTIAL` freshness | -0.15 |
| `CONFLICTING` freshness | -0.20 |

The final trust score maps to a label:

| Score Range | Label |
|---|---|
| >= 0.8 | `HIGH` |
| >= 0.6 | `MEDIUM` |
| >= 0.4 | `LOW` |
| < 0.4 | `INSUFFICIENT` |

Staleness reason codes: `NO_SYNC`, `SYNC_TOO_OLD`, `LOW_EVENT_COUNT`, `DUPLICATE_EVENTS`.

---

## Normalization Pipeline

```
Provider API
     |
     v
RawAITelemetryEvent (connector-specific field names, rawPayload)
     |
     v
normalizeEvent(raw) — dispatches by eventType
     |
     +-- TOKEN_USAGE       -> normalizeTokenUsageEvent()
     +-- SEAT_ACTIVITY     -> normalizeSeatActivityEvent()
     +-- BILLING_EXPORT    -> normalizeBillingExportEvent()
     +-- AGENT_ACTIVITY    -> normalizeAgentActivityEvent()
     +-- WORKSPACE_ACTIVITY -> normalizeWorkspaceActivityEvent()
     +-- EMBEDDING_USAGE   -> normalizeEmbeddingUsageEvent()
     +-- (unknown)         -> buildZeroEvent() — zero-cost shell, no data loss
     |
     v
NormalizedAITelemetryEvent (canonical fields, dataVersion tagged)
     |
     v
normalizeEvents() — batch wrapper; validates tenantId/connectorId, counts errors
     |
     v
AITelemetrySnapshot — assembled by assessConnectorFreshness() + snapshot builder
     |
     v
AI Governance Pack (evidence layer consumes snapshot)
```

Field extraction in the normalizer is tolerant of vendor naming variations. For example, `inputTokens` is read first, then `prompt_tokens` as fallback. A field that cannot be extracted defaults to `null` (strings) or `0` (numbers) rather than causing an error. Events that throw during normalization are counted in `errorCount` and skipped; the batch continues.

---

## TelemetryIngestionResult

Returned by `normalizeEvents()` alongside the normalized event array. Fields: `tenantId`, `connectorId`, `rawEventCount`, `normalizedEventCount`, `skippedEventCount` (wrong tenant or connector), `errorCount` (normalization exceptions), `ingestedAt`.
