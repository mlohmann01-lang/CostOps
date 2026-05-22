# AI Cost Packs

## Overview

The 8 AI governance packs are the primary cost optimization tools of the AI Economic Operations Layer. Each pack is compiled via `compileEconomicOperationsPack()` from a typed `EconomicOperationsPackDefinition` and registered in the global pack registry at module initialization time. This document covers each pack from the perspective of what data it consumes, what it saves, and how its internal layers interact.

---

## How Packs Integrate with the Pack Factory

Each pack calls `compileEconomicOperationsPack(definition)` where `definition` conforms to `EconomicOperationsPackDefinition<Evidence, Recommendation, Simulation, Payload, Result>`. The factory:

1. Validates all required fields at compile time (throws if `id`, `name`, `domain`, or required layers are absent)
2. Wraps the definition's layer implementations in a runtime adapter that enforces the trust threshold before allowing evidence to proceed
3. Registers the compiled pack with `globalPackRegistry` via the explicit `globalPackRegistry.register(pack)` call at the bottom of each pack module
4. Exposes the pack's evidence, recommendation, simulation, execution, verification, and drift layers through the `globalPackRuntime` interface consumed by the REST API

The `packId` assigned by the factory is `definition.id`, which is the value used in all API routes (e.g. `POST /packs/ai-token-governance/recommendations/generate`).

---

## Pack-by-Pack Breakdown

### 1. AI Token Governance (`ai-token-governance`)

**Data consumed:**
- Model-level token breakdown (inputTokens, outputTokens, costUSD per model)
- Retry count and error count from usage API
- Runaway candidate detection: models with OVERSIZED_CONTEXT or REASONING_OVERUSE flags
- Agent request percentage

**Recommendations generated:**
- `MODEL_DOWNGRADE` when premium/reasoning model cost share exceeds 40%
- `CACHE_ENFORCEMENT` when retry rate exceeds 4% of total requests
- `CONTEXT_TRUNCATION` when a runaway candidate with OVERSIZED_CONTEXT is present

**Projected savings range:** 25–42% of premium/reasoning model spend. For a tenant spending $940/month on those tiers, expected savings are $235–$395/month.

**Simulation before/after:** Before state captures `monthlyCostUSD` at current premium model spend. Proposed state shows cost after 30% downgrade savings plus 12% cache savings. `changesApplied` lists `MODEL_DOWNGRADE` and `CACHE_ENFORCEMENT` interventions.

**Verification strategy:** Pending 30-day window comparison. `verified: false` until window completes; confidence: 0.0 pending, 0.82 projected on completion.

**Drift rules monitored:** `TOKEN_EXPANSION` (MEDIUM, >20% MoM token growth), `MODEL_CREEP` (HIGH, >45% premium cost share).

**Trust scoring:** Starts at 0.95, deducts 0.05 per runaway candidate (max -0.20), deducts 0.05 if window > 14 days. Minimum trust threshold: 0.60.

---

### 2. AI Model Routing (`ai-model-routing`)

**Data consumed:**
- Per-model usage entries with `avgComplexityBand` and `overqualifiedPct`
- Total monthly cost and estimated wasted cost from over-qualified routing

**Recommendations generated:**
- `DOWNGRADE_TO_MINI` for premium models with high `overqualifiedPct`
- `TASK_CLASSIFICATION_ROUTING` to introduce complexity scoring at workflow boundaries
- `CACHE_FIRST_ROUTING` to reduce inference volume for repeated queries
- `REASONING_ONLY_WHEN_REQUIRED` to gate o1-class models

**Projected savings range:** 20–35% of misrouted model spend, depending on the proportion of TRIVIAL/SIMPLE tasks reaching premium models.

**Verification strategy:** `MODEL_ROUTING_VERIFICATION` — re-checks model distribution for workloads that were downgraded. Confidence: 0.75.

**Drift rules monitored:** MODEL_CREEP (from ai-drift-rules, MEDIUM severity).

---

### 3. AI Vendor Seat Reclaim (`ai-vendor-seat-reclaim`)

**Data consumed:**
- Seat records from GitHub Copilot, ChatGPT Enterprise, and Cursor Pro connectors
- Per-seat `lastActiveDaysAgo` and `isIdle` flags
- `idleThresholdDays` per vendor (default 30)

**Recommendations generated:**
- One `SEAT_RECLAIM` recommendation per vendor that has at least one idle seat
- Each recommendation lists specific `seatUserIds` for targeted reclaim

**Projected savings range:** Savings are highly deterministic — `idleSeats × costPerSeatPerMonth`. For a 225-seat estate with ~51 idle seats across three vendors, expected savings are $910–$1,200/month.

**Simulation before/after:** Before state shows `activeSeats`, `idleSeats`, and `totalMonthlyCostUSD` per vendor. Proposed state shows post-reclaim seat counts and reduced cost.

**Verification strategy:** `SEAT_RECLAIM_VERIFICATION` — re-pulls vendor roster and confirms reclaimed seat IDs are absent from active entitlements. Confidence: 0.90. Rollback available within the rollback window (30 days).

**Drift rules monitored:** `IDLE_SEAT_ACCUMULATION` (MEDIUM), `VENDOR_COST_SPIKE` (HIGH).

**Trust scoring:** Starts at 0.92, deducts 0.15 if more than 20% of seats have unknown `lastActiveDaysAgo`, deducts 0.25 if no vendor records present. Minimum trust threshold: 0.65.

---

### 4. AI Agent Runtime Governance (`ai-agent-runtime-governance`)

**Data consumed:**
- `AgentEntry` records: `executionsLast30Days`, `lastExecutionDaysAgo`, `isOrphaned`, `isRecursive`, `monthlyCostEstimateUSD`
- `MCPServerEntry` records: `connectedAgents`, `lastUsedDaysAgo`, `isIdle`, `monthlyComputeCostUSD`

**Recommendations generated:**
- `AGENT_DISABLE` for orphaned or recursive agents
- `AGENT_ARCHIVE` for idle agents (activity gap under orphan threshold)
- `MCP_RETIREMENT` for idle MCP servers

**Projected savings range:** Proportional to `wastedComputeCostUSD`. For a tenant with 4 agents where 1 is orphaned and 1 is idle, expected savings are 30–50% of total agent compute cost.

**Verification strategy:** `AGENT_RETIREMENT_VERIFICATION` — checks that retired agent IDs have zero post-execution activity. Confidence: 0.95.

**Drift rules monitored:** `AGENT_PROLIFERATION` (HIGH) from ai-drift-rules.

---

### 5. AI Context Governance (`ai-context-governance`)

**Data consumed:**
- `avgContextTokens`, `peakContextTokens`, `systemPromptTokens`, `retrievalChunkTokens`
- `totalVectorCollections`, `staleCollections`, `duplicateEmbeddingPct`
- `memoryTokensPerUser`, `monthlyCostUSD`, `estimatedOptimizablePct`

**Recommendations generated:**
- `CONTEXT_COMPRESSION` when average context is above target utilization
- `MEMORY_ARCHIVE` when per-user memory footprint is high
- `VECTOR_PRUNING` for stale collections
- `EMBEDDING_CONSOLIDATION` for high duplication percentage
- `RETRIEVAL_LIMIT` for oversized retrieval windows

**Projected savings range:** Typically 15–30% of context-related inference cost, depending on how much of the context window is retrieval-driven vs system prompt.

**Verification strategy:** `CONTEXT_COMPRESSION_VERIFICATION` — checks that `contextWindowUtilization` has decreased to the target level post-intervention. Confidence: 0.70.

**Drift rules monitored:** `TOKEN_EXPANSION` (indirectly, via context-driven token growth).

---

### 6. AI ROI Governance (`ai-roi-governance`)

**Data consumed:**
- `totalAISpendUSD`, `verifiedSavingsUSD`, `unverifiedSavingsUSD`
- `productivitySignals` (CODE_REVIEW_FASTER, TICKET_RESOLUTION_FASTER, AUTOMATION_RATE)
- `costPerOutcome`, `roiRatio`, `unattributedSpendUSD`, `spendByDomain`

**Recommendations generated:**
- `ESTABLISH_OUTCOME_TRACKING` when `costPerOutcome` is null
- `VERIFY_CLAIMED_SAVINGS` when `unverifiedSavingsUSD` exceeds `verifiedSavingsUSD`
- `REALLOCATE_UNATTRIBUTED_SPEND` when `unattributedSpendUSD` is material
- `ROI_GOVERNANCE_REPORT` to produce a board-ready cost-per-outcome breakdown

**Projected savings range:** ROI governance does not produce direct cost savings; it surfaces the measurement gap so that future optimization decisions are evidence-based. Indirect impact is high because unverified ROI claims often mask actual overspend.

**Drift rules monitored:** `COST_SPIKE` (HIGH) from ai-drift-rules.

---

### 7. AI Drift Governance (`ai-drift-governance`)

**Data consumed:**
- `currentWeekCostUSD`, `previousWeekCostUSD`, `weekOverWeekChangePct`
- `unauthorizedModels`, `tokenGrowthPct`, `newWorkflowsDetected`
- `routingDriftScore`, `overallDriftSeverity`

**Recommendations generated:**
- `POLICY_ENFORCEMENT` for LOW_DRIFT and MODERATE_DRIFT
- `EXECUTION_LIMIT` and `ROUTING_LOCK` for HIGH_DRIFT
- `BUDGET_GUARD` and `OPERATOR_REVIEW` for CRITICAL_DRIFT

**Projected savings range:** Preventative — arrests regression before costs compound. For a tenant where costs have drifted 50% above the post-optimization baseline, timely ROUTING_LOCK can prevent 30–50% incremental overspend.

**Drift rules monitored:** All 6 rules from ai-drift-rules: `TOKEN_SPIKE`, `MODEL_CREEP`, `COST_SPIKE`, `UNAUTHORIZED_USAGE`, `SEAT_EXPANSION`, `AGENT_PROLIFERATION`.

---

### 8. AI Overlap Elimination (`ai-overlap-elimination`)

**Data consumed:**
- `vendorGroups` with categories: GENERAL_LLM, CODING_ASSISTANT, AGENT_PLATFORM, EMBEDDING
- Per-group `overlapRisk` and `consolidationPotentialUSD`
- `deduplicatedUserCount` — users holding multiple competing tool seats
- `WINDSURF_CURSOR_OVERLAP_EMAILS` from the Windsurf connector

**Recommendations generated:**
- `CONSOLIDATE_VENDOR` for HIGH overlap risk groups
- `REMOVE_REDUNDANT_TOOL` for tools with lower utilization in the same category
- `STANDARDIZE_MODEL` across business units using different providers for the same task class
- `RETIRE_UNUSED_PLATFORM` for agent or embedding platforms with zero active users

**Projected savings range:** Typically 20–40% of the lower-utilization vendor's monthly cost per category. For an organisation with both Cursor ($20/seat) and Windsurf ($15/seat) at 40 dual-holders, eliminating one produces $600–$800/month in savings.

**Verification strategy:** `VENDOR_CONSOLIDATION_VERIFICATION` — confirms removed vendors no longer appear in billing exports. Confidence: 0.85.

**Drift rules monitored:** `VENDOR_COST_SPIKE` (HIGH) and `SEAT_EXPANSION` (MEDIUM).

---

## Proof Graph

Each recommendation generates proof nodes when executed. Node types are:

| Node Type | When Created |
|---|---|
| `TELEMETRY` | Evidence layer — raw/normalised usage data backing the recommendation |
| `COST` | Attribution layer — computed cost totals used in the recommendation |
| `PRICING` | Pricing catalog — model price-per-token entry used for cost computation |
| `TRUST_SCORE` | Freshness assessment for the connector used in evidence collection |
| `SIMULATION` | Before/after state snapshot from the simulation layer |
| `VERIFICATION` | Post-execution verification result |
| `DRIFT` | Drift detection result from drift scan |
| `ROI` | ROI measurement from the ROI governance pack |
| `VENDOR_OVERLAP` | Vendor seat overlap finding from the overlap elimination pack |

The proof graph's `overallTrustScore` is the minimum trust score across all nodes. If any node has low trust (e.g. STALE telemetry contributing a 0.4 trust score), the graph-level trust degrades accordingly. `isMockData: true` is set on the graph if any constituent node was produced from mock data.

---

## Trust Scoring

Pack evidence trust is computed by each pack's `trustScorer.score(evidence)` function. The trust score determines whether the pack can proceed to recommendation generation. If the score falls below `minimumTrustThreshold`, the evidence layer rejects the evidence and the pack returns an error rather than generating unreliable recommendations.

Trust thresholds by pack:

| Pack | Minimum Trust Threshold |
|---|---|
| ai-token-governance | 0.60 |
| ai-vendor-seat-reclaim | 0.65 |
| ai-model-routing | 0.60 |
| ai-agent-runtime-governance | 0.60 |
| ai-context-governance | 0.60 |
| ai-roi-governance | 0.60 |
| ai-drift-governance | 0.60 |
| ai-overlap-elimination | 0.60 |

Connector freshness trust (from `ai-telemetry-freshness.ts`) feeds into pack evidence trust. A STALE connector produces a connector trust score of 0.7; a MISSING connector produces 0.4. Packs that consume multiple connectors aggregate trust scores weighted by relevance to their evidence type.
