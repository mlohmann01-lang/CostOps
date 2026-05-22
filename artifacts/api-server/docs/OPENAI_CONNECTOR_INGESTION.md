# OpenAI Connector Ingestion Guide

## Overview

The ingestion pipeline processes raw OpenAI Admin API data into normalized telemetry events and generates recommendations.

## Ingestion Pipeline Flow

```
Raw OpenAI API Data
        ↓
Credential Validation (API key check)
        ↓
Fetch Usage Data (paginated)
        ↓
Fetch Cost Data (paginated)
        ↓
Fetch Projects & Users
        ↓
Normalization (→ NormalizedAITelemetryEvent)
        ↓
Cost Attribution (project/user allocation)
        ↓
Recommendation Generation
        ↓
Proof Graph Integration
        ↓
Event Persistence
```

## Data Structures

### Raw API Response (Before Normalization)

```typescript
// Usage data from /usage endpoint
{
  project_id: "proj-123",
  model: "gpt-4",
  tokens_in: 1000,
  tokens_out: 500,
  date: "2026-05-22"
}

// Cost data from /billing/costs endpoint
{
  project_id: "proj-123",
  model: "gpt-4",
  amount: 15000,  // in cents
  date: "2026-05-22"
}
```

### Normalized Event (After Normalization)

```typescript
{
  eventId: "openai-usage-proj-123-gpt-4-2026-05-22",
  connectorId: "OPENAI",
  eventType: "TOKEN_USAGE",
  tenantId: "tenant-123",
  modelId: "gpt-4",
  userId: "user-1",
  workflowId: "workflow-1",
  agentId: null,
  inputTokens: 1000,
  outputTokens: 500,
  costUSD: 150.00,
  seatActive: null,
  seatLastActiveAt: null,
  embeddingDimensions: null,
  normalizedAt: "2026-05-22T12:00:00Z",
  rawEventId: "openai-usage-proj-123-gpt-4-2026-05-22",
  dataVersion: "1.0",
  sourceOfTruth: "CONNECTOR",
  isEstimated: false
}
```

## Normalization Rules

### Token Counts

- **inputTokens**: Directly from `tokens_in` field
- **outputTokens**: Directly from `tokens_out` field
- Both must be ≥ 0

### Cost Calculation

- Raw cost in cents from API: divide by 100 to get USD
- Match usage and cost events by (projectId, modelId, date)
- If cost data missing: `isEstimated = true`
- If usage data missing: create event from cost data with `isEstimated = true`

### User/Workflow/Agent Attribution

Attempt to match events to:
- **userId**: From usage data user field
- **workflowId**: From usage data workflow field  
- **agentId**: From usage data agent field

If any field missing:
- Set to `null`
- Set `isEstimated = true`
- Flag in metadata: `hasMissingAttribution = true`

### sourceOfTruth

Always set to `"CONNECTOR"` for OpenAI ingestion (vs. `"MOCK"` for fixtures).

## Pagination Handling

The connector supports cursor-based pagination:

```typescript
// First request
let cursor: string | undefined;
do {
  const result = await openaiAdminClient.getUsageData(
    "2026-05-01",
    "2026-05-31",
    cursor
  );
  
  // Process result.data
  processEvents(result.data);
  
  cursor = result.nextCursor;
} while (result.hasMore);
```

Batch size: 100 events per request (configurable via `limit` param).

## Error Handling

The ingestion pipeline is resilient to partial failures:

| Error | Behavior | Result |
|-------|----------|--------|
| Credential validation fails | Stop immediately | Status: FAILED |
| Usage data fetch fails | Continue to costs | `hasPartialUsageData = true` |
| Cost data fetch fails | Continue to projects | `hasPartialCostData = true` |
| Project/user fetch fails | Continue to normalization | Reduced attribution scope |
| Normalization error | Skip event | `errorCount++` |

## Cost Attribution Algorithm

After normalization, costs are attributed to cost centers:

1. **By Project**: Sum costs per project
2. **By Model**: Sum costs per model within project
3. **By User**: If user_id present, allocate proportional to user's tokens
4. **By Workflow**: If workflow_id present, allocate proportional to workflow's tokens

Example:
```
Total Cost: $100
  - gpt-4: $80
    - user-1: $50 (62.5% of gpt-4 tokens)
    - user-2: $30 (37.5% of gpt-4 tokens)
  - gpt-3.5-turbo: $20
    - user-1: $15
    - user-2: $5
```

## Data Quality Metrics

After ingestion, quality is assessed:

```typescript
{
  estimatedFraction: 0.15,        // 15% of events have missing fields
  usageDataComplete: true,        // All events have token counts
  costDataComplete: true,         // All events have cost data
  attributionComplete: false      // Some events missing user/workflow
}
```

**Rules:**
- `estimatedFraction = count(isEstimated=true) / total`
- `usageDataComplete = all(inputTokens > 0 OR outputTokens > 0)`
- `costDataComplete = all(costUSD > 0)`
- `attributionComplete = all(userId AND workflowId present)`

## Ingestion Events Audit Trail

All ingestion operations are logged to `audit_events` table:

```json
{
  "tenantId": "tenant-123",
  "actorId": "system:openai-sync",
  "actorRole": "SYSTEM",
  "eventType": "EXECUTION_STARTED",
  "resourceType": "CONNECTOR",
  "resourceId": "OPENAI",
  "payload": {
    "jobId": "openai-sync-...",
    "periodStart": "2026-05-01",
    "periodEnd": "2026-05-31",
    "eventCount": 1250
  },
  "outcome": "SUCCESS"
}
```

## Monitoring Ingestion

### Metrics Emitted

- `job_count`: Incremented per sync (labels: jobType=OPENAI_READ_ONLY_SYNC, status)
- `sync_duration_ms`: Duration of entire sync operation
- `error_count`: Count of errors during ingestion
- `connector_health_state`: Overall connector status

### Logs

All ingestion operations emit structured logs:

```
{
  "component": "openai-sync-job",
  "jobId": "openai-sync-tenant-123-...",
  "tenantId": "tenant-123",
  "action": "Starting OpenAI read-only sync",
  "normalizedCount": 1250,
  "estimatedFraction": 0.05,
  "status": "SUCCESS"
}
```

## Next Steps

1. **Verify Ingestion**: Check telemetry endpoint for latest sync status
2. **Review Recommendations**: Generated from normalized events
3. **Configure Mapping**: See OpenAI Connector Mapping Guide for cost allocation
4. **Monitor Drift**: Drift detection automatically flags cost anomalies
