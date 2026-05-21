# AI Economic Governance Runbook

## Overview

The AI Economic Operations Layer provides 8 governance packs that detect cost waste, model misuse, idle resources, and economic drift across an organisation's AI stack. Each pack follows the same lifecycle: evidence is collected and trust-scored, recommendations are generated, a simulation projects before/after state, an operator approves and executes, verification confirms savings, and drift detection monitors for regression.

---

## Pack Lifecycle

```
1. EVIDENCE COLLECT     POST /packs/:packId/evidence/sync
2. NORMALIZE            Internal: normalizer converts raw evidence to canonical form
3. TRUST SCORE          Internal: trust scorer gates pack execution
4. RECOMMEND            POST /packs/:packId/recommendations/generate
5. SIMULATE             POST /packs/:packId/simulation
6. APPROVE (operator)   POST /economic-operations/intent  { intentType: "APPROVE" }
7. EXECUTE              POST /economic-operations/intent  { intentType: "EXECUTE" }
8. VERIFY               POST /packs/:packId/verify
9. DRIFT DETECT         POST /packs/:packId/drift/scan
```

Steps 2–3 are automatic; all other steps are API-triggered. Evidence sync and drift scans are also scheduled via background jobs.

---

## The 8 AI Governance Packs

### 1. AI Token Governance (`ai-token-governance`)

**Domain:** TOKEN_GOVERNANCE — Strategic priority: CRITICAL

**What it detects:**
- Models with `OVERSIZED_CONTEXT` pattern (average context tokens well above task requirements)
- `REASONING_OVERUSE` — reasoning-tier models (e.g. o1-preview) applied to tasks that don't require chain-of-thought
- High retry rate (retries > 4% of total requests) indicating prompt storms or transient failure loops
- Premium model share exceeding 40% of total cost

**Key recommendations:**
- `MODEL_DOWNGRADE` — route SIMPLE/TRIVIAL tasks to economy-tier models
- `CACHE_ENFORCEMENT` — enable semantic prompt caching to eliminate duplicate inference charges
- `CONTEXT_TRUNCATION` — enforce a sliding-window context policy to bound input token spend

**Verification strategy:** Re-collect token cost evidence after 30 days and compare against the pre-execution baseline snapshot.

**Drift rules:**
- `TOKEN_EXPANSION` (MEDIUM) — triggered when month-over-month token growth exceeds 20%
- `MODEL_CREEP` (HIGH) — triggered when premium/reasoning model cost share rises above 45% post-intervention

---

### 2. AI Model Routing (`ai-model-routing`)

**Domain:** MODEL_ROUTING — Strategic priority: HIGH

**What it detects:**
- Premium models (GPT-4o, Opus) handling TRIVIAL or SIMPLE complexity-band tasks
- No task-complexity classification driving routing decisions
- Over-qualified model usage: high `overqualifiedPct` on premium model entries

**Key recommendations:**
- `DOWNGRADE_TO_MINI` — redirect simple tasks to mini-tier models
- `TASK_CLASSIFICATION_ROUTING` — introduce task complexity scoring at the workflow boundary
- `REASONING_ONLY_WHEN_REQUIRED` — gate reasoning models behind complexity threshold
- `CACHE_FIRST_ROUTING` — check cache before routing to any inference endpoint

**Verification strategy:** `MODEL_ROUTING_VERIFICATION` — confirms downgraded workloads are using the target model post-execution. Confidence: 0.75.

---

### 3. AI Vendor Seat Reclaim (`ai-vendor-seat-reclaim`)

**Domain:** AI_VENDOR_GOVERNANCE — Strategic priority: HIGH

**What it detects:**
- Users with no seat activity beyond the idle threshold (default: 30 days) across GitHub Copilot, ChatGPT Enterprise, and Cursor Pro
- Idle seats continuing to accrue monthly subscription cost

**Key recommendations:**
- `SEAT_RECLAIM` — one recommendation per vendor with idle seats, listing specific user IDs

**Verification strategy:** `SEAT_RECLAIM_VERIFICATION` — re-pulls vendor seat roster to confirm reclaimed seat IDs no longer appear as active entitlements. Confidence: 0.90. Rollback supported: re-provision via vendor admin portal within 24 hours.

**Drift rules:**
- `IDLE_SEAT_ACCUMULATION` (MEDIUM) — triggered when idle seat percentage climbs above 15% post-reclaim
- `VENDOR_COST_SPIKE` (HIGH) — triggered when AI vendor subscription cost grows more than 20% month-over-month

---

### 4. AI Agent Runtime Governance (`ai-agent-runtime-governance`)

**Domain:** AGENT_RUNTIME_GOVERNANCE — Strategic priority: HIGH

**What it detects:**
- Orphaned agents (no owner, no executions in 45+ days)
- Idle MCP servers with no connected agents or recent usage
- Recursive agents (`isRecursive: true`) consuming compute in loops

**Key recommendations:**
- `AGENT_DISABLE` — immediately stop compute allocation for orphaned or runaway agents
- `AGENT_ARCHIVE` — archive idle agents for potential later reactivation
- `MCP_RETIREMENT` — retire idle MCP server infrastructure

**Verification strategy:** `AGENT_RETIREMENT_VERIFICATION` — checks that retired agent IDs show zero activity post-execution. Confidence: 0.95. Rollback supported.

---

### 5. AI Context Governance (`ai-context-governance`)

**Domain:** CONTEXT_GOVERNANCE — Strategic priority: MEDIUM

**What it detects:**
- Context window utilization above 80% (average context tokens near model limits)
- Stale vector collections (no queries in 30+ days)
- High duplicate embedding percentage
- Excessive conversation history in multi-turn chains

**Key recommendations:**
- `CONTEXT_COMPRESSION` — enforce a sliding-window context policy
- `MEMORY_ARCHIVE` — archive stale per-user memory stores
- `VECTOR_PRUNING` — remove unused or duplicate entries from vector collections
- `EMBEDDING_CONSOLIDATION` — merge redundant embedding collections

**Verification strategy:** `CONTEXT_COMPRESSION_VERIFICATION` — checks that context window utilization has decreased to the target level. Confidence: 0.70.

---

### 6. AI ROI Governance (`ai-roi-governance`)

**Domain:** AI_ROI_GOVERNANCE — Strategic priority: CRITICAL

**What it detects:**
- High AI spend with null `workflowId` (no outcome linkage)
- Claimed savings without execution proof
- Zero or null `roiRatio` indicating no measured return
- High `unattributedSpendUSD` relative to total spend

**Key recommendations:**
- `ESTABLISH_OUTCOME_TRACKING` — instrument workflow boundaries to link spend to business outcomes
- `VERIFY_CLAIMED_SAVINGS` — compare claimed savings against execution-backed evidence in the ledger
- `REALLOCATE_UNATTRIBUTED_SPEND` — route unattributed spend to known cost centers
- `ROI_GOVERNANCE_REPORT` — generate a cost-per-outcome breakdown for leadership review

**Verification strategy:** Outcome tracking verification — checks that the `costPerOutcome` metric has been established post-intervention.

---

### 7. AI Drift Governance (`ai-drift-governance`)

**Domain:** AI_DRIFT_GOVERNANCE — Strategic priority: HIGH

**What it detects:**
- Week-over-week AI cost spikes
- Token consumption growth since last optimization
- Unauthorized models (not in the approved tier list)
- New workflow IDs not previously seen (unregistered automation)
- Routing drift score above policy threshold

**Key recommendations:**
- `POLICY_ENFORCEMENT` — re-apply routing and model selection rules
- `EXECUTION_LIMIT` — cap concurrent or daily inference volume
- `ROUTING_LOCK` — freeze model routing configuration pending review
- `BUDGET_GUARD` — activate spend ceiling enforcement
- `OPERATOR_REVIEW` — escalate immediately for HIGH_DRIFT or CRITICAL_DRIFT

**Verification strategy:** Re-measure week-over-week cost delta after policy enforcement.

---

### 8. AI Overlap Elimination (`ai-overlap-elimination`)

**Domain:** AI_OVERLAP_ELIMINATION — Strategic priority: HIGH

**What it detects:**
- Users holding concurrent seats in overlapping tools (Cursor + Windsurf + Copilot)
- Multiple general-purpose LLM subscriptions (Claude + ChatGPT + Gemini) with no differentiation
- Redundant agent platforms running parallel infrastructure
- Duplicate embedding providers

**Key recommendations:**
- `CONSOLIDATE_VENDOR` — designate a primary vendor per functional category
- `REMOVE_REDUNDANT_TOOL` — remove tools with overlapping capability and lower utilisation
- `STANDARDIZE_MODEL` — enforce a single preferred model per task tier
- `RETIRE_UNUSED_PLATFORM` — decommission platforms with zero active users

**Verification strategy:** `VENDOR_CONSOLIDATION_VERIFICATION` — confirms removed vendors are no longer generating spend. Confidence: 0.85.

---

## Telemetry Job Schedule

Background jobs feed evidence into the packs on a recurring basis.

| Job Type | Description | Recommended Interval |
|---|---|---|
| `AI_USAGE_SYNC` | Syncs token usage from OpenAI and Anthropic | Every 24 hours |
| `AI_BILLING_SYNC` | Syncs billing export data from OpenAI | Every 24 hours |
| `AI_SEAT_SYNC` | Syncs seat records from Cursor and Windsurf | Every 12 hours |
| `AI_AGENT_RUNTIME_SYNC` | Syncs agent execution activity (stub; pending connector) | Every 24 hours |
| `AI_CONTEXT_USAGE_SYNC` | Syncs context window utilisation metrics (stub) | Every 24 hours |
| `AI_EMBEDDING_USAGE_SYNC` | Syncs embedding API usage (stub) | Every 24 hours |
| `AI_VENDOR_OVERLAP_SCAN` | Detects cross-vendor seat overlap | Every 12 hours |
| `AI_DRIFT_SCAN` | Runs drift detection across all AI packs | Every 24 hours |
| `AI_ROI_RECONCILIATION` | Reconciles claimed vs verified savings (stub) | Every 24 hours |

Stub jobs return zero records until their respective connectors are implemented.

---

## API Operations

### Trigger Evidence Sync

```
POST /packs/:packId/evidence/sync
Body: { tenantId: "tenant-abc" }
```

Re-runs the pack's evidence collector for the tenant. Returns the collected evidence payload and a timestamp. Use this before running recommendations to ensure data is current.

### Generate Recommendations

```
POST /packs/:packId/recommendations/generate
Body: { tenantId: "tenant-abc" }
```

Runs the recommendation generator against the latest evidence. Returns an array of typed recommendation objects. Equivalent to `POST /packs/:packId/recommendations`.

### Run Simulation

```
POST /packs/:packId/simulation
Body: { tenantId: "tenant-abc", executionId: "exec-001", evidence: {} }
```

Projects before/after state and estimated savings without applying any changes. Returns `projectedMonthlySavingsUSD`, `projectedAnnualSavingsUSD`, `beforeState`, `proposedState`, `confidenceScore`, and `blastRadius`.

### Verify an Execution

```
POST /packs/:packId/verify
Body: { tenantId: "tenant-abc", executionId: "exec-001" }
```

Runs the pack's verification strategy against the declared execution. Returns `verified`, `confidence`, `verificationStrategy`, and `details`. Verification results are stored in the outcome ledger.

### Run Drift Scan

```
POST /packs/:packId/drift/scan
Body: { tenantId: "tenant-abc", executionId: "exec-001", context: { ... } }
```

Evaluates all drift rules for the pack. Returns the list of triggered rules with severities and detail strings. Equivalent to `POST /packs/:packId/drift`.

---

## Drift Rules Reference

| Rule ID | Pack | Severity | Trigger Condition |
|---|---|---|---|
| `TOKEN_EXPANSION` | ai-token-governance | MEDIUM | Month-over-month token growth > 20% |
| `MODEL_CREEP` | ai-token-governance | HIGH | Premium/reasoning model cost share > 45% post-intervention |
| `IDLE_SEAT_ACCUMULATION` | ai-vendor-seat-reclaim | MEDIUM | Idle seat percentage > 15% post-reclaim |
| `VENDOR_COST_SPIKE` | ai-vendor-seat-reclaim | HIGH | AI vendor subscription cost growth > 20% MoM |
| `TOKEN_SPIKE` | ai-drift-rules | HIGH | Current month cost > 2x previous month baseline |
| `MODEL_CREEP` | ai-drift-rules | MEDIUM | Models outside the approved tier list detected |
| `COST_SPIKE` | ai-drift-rules | HIGH | Week-over-week AI spend increase > 50% |
| `UNAUTHORIZED_USAGE` | ai-drift-rules | CRITICAL | Usage from connectors not in the approved list |
| `SEAT_EXPANSION` | ai-drift-rules | MEDIUM | Seat count increased without governance approval on record |
| `AGENT_PROLIFERATION` | ai-drift-rules | HIGH | New agents created without a governance approval on record |

---

## Escalation Path

**MEDIUM drift** — Create a follow-up recommendation using `POST /packs/:packId/recommendations/generate`. Schedule a re-execution within the next sprint cycle.

**HIGH drift** — Notify the ECONOMIC_OPERATOR role. Re-run the pack's simulation to assess the current savings gap. Consider activating a `ROUTING_LOCK` or `BUDGET_GUARD` recommendation to halt regression while the root cause is investigated.

**CRITICAL drift** (`UNAUTHORIZED_USAGE`) — Escalate immediately to the OWNER role. Use `POST /packs/:packId/drift/scan` with full context to gather evidence. Block the offending connector via the governance exception registry. Do not proceed with further pack executions until unauthorized usage is contained and the connector is re-approved.
