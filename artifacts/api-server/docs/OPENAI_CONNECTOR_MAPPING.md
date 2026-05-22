# OpenAI Connector Mapping Guide

## Overview

This guide explains how OpenAI telemetry maps to the 8 AI governance packs and enables downstream recommendations, drift detection, and verification.

## Mapping Matrix

| Governance Domain | Input Data | Processing | Output |
|---|---|---|---|
| **TOKEN_GOVERNANCE** | inputTokens, outputTokens by model | Detect overspend patterns | Compression recommendations, cache enforcement |
| **MODEL_ROUTING** | costUSD, inputTokens by model | Analyze cost/token ratio | Downgrade recommendations, routing policies |
| **AI_VENDOR_GOVERNANCE** | Projects, Users, cost aggregation | Detect idle projects/seats | Consolidation recommendations |
| **AGENT_RUNTIME_GOVERNANCE** | Workflow attribution, execution counts | Track workflow activity | Archive/disable recommendations |
| **CONTEXT_GOVERNANCE** | Output token ratio, prompt patterns | Estimate context bloat | Context compression, pruning |
| **AI_ROI_GOVERNANCE** | Total cost, execution count, outcomes | Cost per outcome | Realized savings verification |
| **AI_DRIFT_GOVERNANCE** | Cost trend, model selection | Detect anomalies | Drift alerts, policy re-enforcement |
| **AI_OVERLAP_ELIMINATION** | Multiple connectors' data | Compare capabilities | Consolidation roadmap |

## Pack Integration Points

### 1. TOKEN_GOVERNANCE Pack

**Input**: `NormalizedAITelemetryEvent[]` with inputTokens, outputTokens

**Processing**:
```typescript
const events = await fetchOpenAIEvents(tenantId, period);
const avgOutputRatio = events.reduce((sum, e) => sum + e.outputTokens) / 
                       events.reduce((sum, e) => sum + e.inputTokens + e.outputTokens);

if (avgOutputRatio > 0.4) {
  emit(Recommendation.TOKEN_GOVERNANCE, "High output ratio, implement compression");
}
```

**Output**: Recommendations for:
- Prompt compression
- Context window limits
- Cache-first routing
- Retry limits

**Evidence Source**: OPENAI_CONNECTOR (real API data)

### 2. MODEL_ROUTING Pack

**Input**: Events grouped by modelId with cost and token breakdown

**Processing**:
```typescript
const byModel = groupBy(events, e => e.modelId);
for (const [model, modelEvents] of byModel) {
  const avgTokens = modelEvents.reduce(sum => e.inputTokens) / modelEvents.length;
  const costPerToken = totalCost / totalTokens;
  
  if (isExpensiveModel(model) && avgTokens < 100) {
    emit(Recommendation.MODEL_ROUTING, "Downgrade to cheaper tier");
  }
}
```

**Output**: Routing policies enforcing:
- Task complexity classification
- Model tier selection rules
- Cost gates per workflow
- Reasoning model limits

### 3. AI_VENDOR_GOVERNANCE Pack

**Input**: Unique projects, users, cost aggregation

**Processing**:
```typescript
const projectActivity = groupBy(events, e => e.projectId);
const lastActivityThreshold = 30 * 24 * 60 * 60 * 1000; // 30 days

for (const [project, projectEvents] of projectActivity) {
  if (projectEvents.length === 0 || 
      Date.now() - max(projectEvents.createdAt) > lastActivityThreshold) {
    emit(Recommendation.VENDOR_CONSOLIDATION, "Archive idle project");
  }
}
```

**Output**: Consolidation recommendations for:
- Idle project archival
- Multi-org rationalization
- Licensing optimization
- Redundant tool retirement

### 4. AGENT_RUNTIME_GOVERNANCE Pack

**Input**: Events with workflowId, execution frequency

**Processing**:
```typescript
const byWorkflow = groupBy(events, e => e.workflowId);
for (const [workflow, workflowEvents] of byWorkflow) {
  const executionFreq = workflowEvents.length / period_days;
  const avgCostPerRun = totalCost / workflowEvents.length;
  
  if (executionFreq < 1 && avgCostPerRun > 1.0) {
    emit(Recommendation.AGENT_RUNTIME, "Low-activity expensive workflow");
  }
}
```

**Output**: Agent governance actions:
- Disable low-activity agents
- Archive workflows
- Decommission unused MCP servers

### 5. CONTEXT_GOVERNANCE Pack

**Input**: Output token ratio, model analysis

**Processing**:
```typescript
const outputTokens = events.reduce((sum, e) => sum + e.outputTokens, 0);
const totalTokens = events.reduce((sum, e) => sum + (e.inputTokens + e.outputTokens), 0);
const outputRatio = outputTokens / totalTokens;

if (outputRatio > 0.45) {
  emit(Recommendation.CONTEXT, "Excessive output tokens indicate context bloat");
}
```

**Output**: Context optimization:
- Memory archive and pruning
- Vector database consolidation
- Retrieval window limits

### 6. AI_ROI_GOVERNANCE Pack

**Input**: Events with workflow attribution and cost

**Processing**:
```typescript
const byWorkflow = groupBy(events, e => e.workflowId);
for (const [workflow, events] of byWorkflow) {
  const totalCost = events.reduce((sum, e) => sum + e.costUSD, 0);
  const executionCount = events.length;
  const costPerOutcome = totalCost / executionCount;
  
  const expectedOutcomes = estimateBusinessOutcome(workflow);
  const roi = (expectedOutcomes * value - totalCost) / totalCost;
  
  emit(RecommendationROI, `ROI: ${(roi * 100).toFixed(1)}%`);
}
```

**Output**: ROI verification:
- Realized savings ledger
- Productivity attribution
- Cost per outcome tracking

### 7. AI_DRIFT_GOVERNANCE Pack

**Input**: Time-series cost data, model selection history

**Processing**:
```typescript
const previousPeriodEvents = await getPreviousPeriod(tenantId);
const previousCost = previousPeriodEvents.reduce((sum, e) => sum + e.costUSD, 0);
const currentCost = events.reduce((sum, e) => sum + e.costUSD, 0);

const drift = (currentCost - previousCost) / previousCost;
if (drift > 0.25) {
  emit(DriftSignal.COST_SPIKE, `Cost increased ${(drift * 100).toFixed(1)}%`);
}
```

**Output**: Drift alerts for:
- Token burn spikes
- Model routing reversal
- Unauthorized model adoption
- Cost explosion

### 8. AI_OVERLAP_ELIMINATION Pack

**Input**: Multi-connector telemetry (OpenAI + others)

**Processing**:
```typescript
const openaiEvents = await fetchConnectorEvents('OPENAI_CONNECTOR');
const anthropicEvents = await fetchConnectorEvents('ANTHROPIC_CONNECTOR');

const openaiCost = openaiEvents.reduce((sum, e) => sum + e.costUSD, 0);
const anthropicCost = anthropicEvents.reduce((sum, e) => sum + e.costUSD, 0);

if (openaiCost > 0 && anthropicCost > 0) {
  analyzeOverlap(openaiEvents, anthropicEvents);
}
```

**Output**: Consolidation analysis:
- Vendor overlap detection
- Feature parity analysis
- Migration path recommendations

## Cost Attribution Rules

### By Project

```typescript
costByProject[event.projectId] += event.costUSD
```

### By Model

```typescript
costByModel[event.modelId] += event.costUSD
```

### By User (Proportional Token Share)

```typescript
const userTokenCount = userEvents.reduce((sum, e) => sum + e.inputTokens + e.outputTokens, 0);
const totalTokenCount = allEvents.reduce((sum, e) => sum + e.inputTokens + e.outputTokens, 0);
const userShare = userTokenCount / totalTokenCount;
costByUser[event.userId] = totalCost * userShare;
```

### By Workflow (Proportional Execution Count)

```typescript
const workflowCount = workflowEvents.length;
const totalCount = allEvents.length;
const workflowShare = workflowCount / totalCount;
costByWorkflow[event.workflowId] = totalCost * workflowShare;
```

## Evidence Source Switching

By default, packs use **MOCK** fixtures for development. Switch to real OpenAI data:

```typescript
import { openaiEvidenceSourceManager } from './openai-evidence-integration.js';

// Enable the source (after readiness check passes)
openaiEvidenceSourceManager.enableSource('OPENAI_CONNECTOR');

// Switch active source
openaiEvidenceSourceManager.switchSource('OPENAI_CONNECTOR');

// Packs now consume real data
const events = await getEvents(tenantId); // Returns OPENAI_CONNECTOR events
```

## Proof Graph Integration

All mappings are recorded in the proof graph:

```
Connector Source (OPENAI)
  ├── Capability: USAGE_DATA_READ
  ├── Capability: COST_DATA_READ
  │
  └── Telemetry Batch (sync-123)
      ├── Normalized Event 1
      ├── Normalized Event 2
      │
      └── Cost Attribution
          ├── By Project
          ├── By Model
          ├── By User
          │
          └── Recommendation: TOKEN_GOVERNANCE
          └── Recommendation: MODEL_ROUTING
          └── Drift Signal: COST_SPIKE
```

## Verification Placeholders

Verification of realized savings requires:

1. **Baseline Measurement**: Cost before recommendation
2. **Intervention**: Apply recommendation
3. **Remeasurement**: Cost after recommendation
4. **Delta Calculation**: (Before - After) / Before

Example:
```typescript
const baselineWindowStart = '2026-05-01';
const baselineWindowEnd = '2026-05-31';
const baselineCost = await getMonthlyCost(baselineWindowStart, baselineWindowEnd);

// Apply recommendation: compress prompts
// Wait 30 days

const measureWindowStart = '2026-06-01';
const measureWindowEnd = '2026-06-30';
const measuredCost = await getMonthlyCost(measureWindowStart, measureWindowEnd);

const realized_savings = (baselineCost - measuredCost) / baselineCost;
```

## Next Steps

1. Enable OPENAI_CONNECTOR as evidence source
2. Verify pack data flow with real events
3. Configure cost allocation per business unit
4. Set up drift detection thresholds
5. Establish verification baseline measurements
