# Sprint D: Token Governance End-to-End Guide

## Vision

Transform AI cost management from reactive (analyzing overspend) to proactive (preventing overspend). Token governance enforces budgets in real-time, executes model downgrades with approval gates, and verifies that optimization actually saves money.

## Strategic Flow

```
Real OpenAI Telemetry (from Sprint C)
  ↓
AI Recommendations (token gov, model routing, drift)
  ↓
Policy Registry (define budgets, risk classes, rules)
  ↓
Budget Gates (intercept requests, estimate cost, allow/block/require-approval)
  ↓
Model Downgrade Execution (convert recommendation → execution with DUAL_APPROVAL)
  ↓
Routing Table (resolve old model → new model at request time)
  ↓
Savings Verification (measure post-downgrade costs, calculate realized savings)
  ↓
Proof Graph (record execution and verification as evidence)
```

## Components (6 Parts)

### Part 1: Token Governance Policy Registry

**What it does:**
- Defines policies with risk classes (A/B/C)
- Manages budgets (tenant-wide, per-workflow, per-user)
- Validates policies before activation
- Retrieves applicable policy for a request

**Key files:**
- `token-governance-policy.ts`: Policy types, validation, registry

**Key concepts:**
- **Risk Class A**: Strict enforcement, requires dual approval
- **Risk Class B/C**: Moderate/permissive enforcement
- **Budget Scope**: TENANT (org-wide), WORKFLOW (per-workflow), USER (per-user)
- **Budget Types**: DAILY, WEEKLY, MONTHLY, PER_REQUEST

**Example usage:**
```typescript
const policy = tokenGovernancePolicyRegistry.createDefaultPolicy('tenant-123');
policy.riskClass = 'A';
policy.enforcementMode = 'BLOCK';
tokenGovernancePolicyRegistry.registerPolicy(policy);

const applicable = tokenGovernancePolicyRegistry.getPolicyForRequest(
  'tenant-123',
  'workflow-ai-agents', // Workflow takes priority
  'user-456'
);
```

### Part 2: Budget Gate Middleware

**What it does:**
- Checks requests against budget constraints
- Estimates cost based on model and tokens
- Returns allow/block/require-approval decisions
- Records actual spend after execution

**Key files:**
- `budget-gate.ts`: BudgetCheckResult, BudgetGate class

**Key checks:**
1. Policy enabled? (default: allow if not)
2. Exceed maxTokensPerRequest? → block/warn/require-approval
3. Exceed maxOutputRatio? → block/warn/require-approval
4. Cost above requireApprovalAboveCost? → require-approval
5. Exceed budget? → block/warn/require-approval
6. Budget alert threshold? → log warning

**Example usage:**
```typescript
const result = budgetGate.checkBudget(
  'tenant-123',
  'gpt-4',
  inputTokens: 500,
  outputTokens: 200,
  workflowId: 'workflow-ai-agents'
);

if (!result.allowed) {
  // Return 403 with result.reason
}
if (result.requiresApproval) {
  // Queue for manual approval before execution
}

// After execution:
budgetGate.recordSpend('tenant-123', budgetId, estimatedCostUSD, totalTokens);
```

### Part 3: Model Downgrade Execution Engine

**What it does:**
- Creates downgrade proposals from recommendations
- Manages approval workflow (including DUAL_APPROVAL for class A)
- Executes downgrade (updates routing table)
- Prevents same-actor dual approval

**Key files:**
- `model-downgrade-execution.ts`: Proposals, executions, approval workflow

**Approval flow (Class A example):**
```
PENDING_APPROVAL
  ↓ [first approval from actor-1]
PENDING_APPROVAL (waiting for second approval)
  ↓ [second approval from actor-2] ← must be different actor
APPROVED
  ↓ [execute downgrade]
EXECUTED (routing: gpt-4 → gpt-3.5-turbo active)
```

**Blocking same-actor dual approval:**
```typescript
const exec = modelDowngradeExecutor.createExecution(proposal); // PENDING_APPROVAL

modelDowngradeExecutor.recordApproval(exec.executionId, 'actor-1');
// → PENDING_APPROVAL (waiting for second approval)

modelDowngradeExecutor.recordApproval(exec.executionId, 'actor-1');
// → ERROR: DUAL_APPROVAL_SAME_ACTOR_BLOCKED
```

**Resolving model at request time:**
```typescript
const requestModel = 'gpt-4'; // User requested gpt-4
const actualModel = modelDowngradeExecutor.resolveModel(requestModel);
// → 'gpt-3.5-turbo' (if downgrade executed)
// → 'gpt-4' (if no active downgrade)
```

### Part 4: Savings Verification Service

**What it does:**
- Records baseline cost before downgrade
- Measures cost after downgrade window (30 days)
- Calculates realized savings with confidence levels
- Integrates with proof graph

**Key files:**
- `savings-verification.ts`: Baselines, verifications, proof graph nodes

**Confidence levels:**
- **HIGH**: >15% actual savings (high confidence savings are real)
- **MEDIUM**: 5-15% savings (moderate confidence)
- **LOW**: <5% savings or token usage increased (low confidence)

**Example flow:**
```typescript
// Step 1: Record baseline (before downgrade)
const baseline = savingsVerificationService.recordBaseline(
  executionId,
  'tenant-123',
  'gpt-4',
  periodDays: 30,
  totalTokens: 100000,
  totalCostUSD: 500.00
);

// Step 2: Execute downgrade
modelDowngradeExecutor.executeDowngrade(executionId);

// Step 3: Initialize verification (30 days later)
const verification = savingsVerificationService.initializeVerification(executionId);

// Step 4: Record measurement (30 days later)
const measured = savingsVerificationService.recordMeasurement(
  verification.verificationId,
  95000,   // 5% fewer tokens (good sign)
  320.00   // $320 cost (36% reduction)
);

// Result:
// realizedSavingsUSD: $180
// realizedSavingsPercent: 36%
// confidenceLevel: HIGH (>15%)
```

### Part 5: Token Governance Routes

**What it does:**
- Exposes policy management endpoints
- Triggers downgrade execution
- Records approvals (first & second)
- Views budget state and verifications

**6 Endpoints:**

1. **GET /policies** — List all active policies
2. **POST /policies** — Create/update policy
3. **GET /budgets** — View budget state & current spend
4. **POST /downgrades** — Propose model downgrade
5. **POST /downgrades/{id}/approve** — Approve downgrade (supports dual approval)
6. **GET /verifications** — View savings verifications & totals

All routes require `Authorization: Bearer <jwt>` header with tenantId in JWT claims.

### Part 6: Comprehensive Tests

**Test coverage:**
- Policy creation and validation
- Budget gate blocking/allowing/requiring approval
- Single-approval flow (class C)
- Dual-approval flow with same-actor blocking (class A)
- Model routing table updates
- Baseline recording and measurement
- Confidence level calculation
- Proof graph node building
- Total realized savings computation

**Run tests:**
```bash
node scripts/run-pattern-tests.mjs token-governance
```

## End-to-End Example

### Scenario: GPT-4 Over-Used for Simple Tasks

**Day 1: Telemetry Ingestion**
```
OpenAI Admin API → Connector (Sprint C)
  ↓ Records usage: gpt-4 with avg 50 input tokens
  ↓ Normalizes to OpenAI telemetry events
  ↓ Runs recommendations engine
```

**Day 1: Recommendation Generated**
```
Recommendation Engine detects:
  - gpt-4 used for simple tasks (50 avg input tokens)
  - Meets downgrade trigger (cheap tasks on expensive model)
  - Proposes: downgrade gpt-4 → gpt-3.5-turbo
  - Estimated savings: $1,200/month
```

**Day 2: Policy Created**
```
POST /token-governance/policies
{
  "name": "Prevent GPT-4 Overuse",
  "riskClass": "A",
  "enforcementMode": "BLOCK",
  "budgets": [{
    "scope": "TENANT",
    "budgetType": "MONTHLY",
    "budgetAmountUSD": 10000,
    "alertThresholdPercent": 80
  }]
}
```

**Day 2: Downgrade Proposed**
```
POST /token-governance/downgrades
{
  "fromModel": "gpt-4",
  "toModel": "gpt-3.5-turbo",
  "reason": "Simple tasks <100 input tokens detected",
  "estimatedMonthlySavingsUSD": 1200,
  "affectedWorkflows": ["workflow-ai-agents"]
}
→ executionId: exec-downgrade-...
→ status: PENDING_APPROVAL
→ requiresDualApproval: true (class A)
```

**Day 2: First Approval**
```
POST /token-governance/downgrades/exec-downgrade-.../approve
Authorization: Bearer <actor1_jwt>

→ status: PENDING_APPROVAL (waiting for second approval from different actor)
```

**Day 2: Second Approval (different actor)**
```
POST /token-governance/downgrades/exec-downgrade-.../approve
Authorization: Bearer <actor2_jwt>

→ status: EXECUTED
→ Routing table updated: gpt-4 → gpt-3.5-turbo
```

**Day 2: Budget Gate Active**
```
Request comes in: model=gpt-4, tokens=100
↓
budgetGate.checkBudget('tenant-123', 'gpt-4', 50, 50)
  - policy found (active)
  - estimated cost: $0.00015 (gpt-4 pricing)
  - budget check: OK ($2,500/month spent, $10k budget)
  - response: allowed=true
↓
modelDowngradeExecutor.resolveModel('gpt-4')
  - returns: 'gpt-3.5-turbo' (downgrade active)
↓
Use gpt-3.5-turbo instead of gpt-4
  - Actual cost: $0.00001 (93% cheaper)
  - Recording: recordSpend(tenantId, budgetId, $0.00001, 100)
```

**Day 32: Verification Recorded**
```
30+ days later, system measures:

Baseline (first 30 days with gpt-4):
  - 100,000 tokens
  - $500 cost
  - avg: 50 input tokens per request

Measured (next 30 days with gpt-3.5-turbo):
  - 98,000 tokens (2% natural variation)
  - $310 cost
  - Savings: $190 (38% reduction)

Confidence: HIGH (>15% savings)
Status: COMPLETED

Proof Graph Node:
{
  nodeType: "SAVINGS_VERIFICATION",
  realizedSavingsUSD: 190,
  realizedSavingsPercent: 38,
  confidenceLevel: "HIGH"
}
```

**Day 32: Verification API**
```
GET /token-governance/verifications

Response:
{
  "verifications": [{
    "fromModel": "gpt-4",
    "toModel": "gpt-3.5-turbo",
    "baselineCostUSD": 500,
    "measuredCostUSD": 310,
    "realizedSavingsUSD": 190,
    "realizedSavingsPercent": 38,
    "confidenceLevel": "HIGH",
    "status": "COMPLETED"
  }],
  "totalRealizedSavingsUSD": 190,
  "completedVerifications": 1,
  "averageConfidence": "HIGH"
}
```

## Integration Points

### With Sprint A (Enterprise Trust Boundary)
- All routes require JWT auth with tenantId
- All operations logged to immutable audit trail
- DUAL_APPROVAL integrates with approval-workflow.ts

### With Sprint B (Runtime Hardening)
- Downgrade execution uses distributed lock (prevent race conditions)
- Job retry policy applies to verification measurement
- Rate limits apply to policy endpoints

### With Sprint C (OpenAI Connector)
- OpenAI telemetry feeds recommendations
- Recommendations trigger downgrade proposals
- Real costs update budgets in real-time

## Key Design Decisions

### Why Dual Approval for Class A?
Class A policies govern critical cost levers. Two-actor approval prevents accidental downgrade that could degrade service. Same-actor blocking ensures independent review.

### Why Lazy Verification (30 days)?
Requires sufficient time to assess real-world impact. Immediate assessment risks noise from natural workload variation. 30 days provides statistical confidence.

### Why Confidence Levels?
Realized savings may diverge from estimates due to workload changes. Confidence levels (HIGH/MEDIUM/LOW) guide operator interpretation and prevent over-claiming savings.

### Why Record Baseline Before Downgrade?
Establishes ground truth for comparison. Post-downgrade measurement alone cannot isolate downgrade impact (workload changed too). Baseline + Measured = causality.

## Limitations & Future Work

### Current
- Pricing model simplified (real: use OpenAI actual pricing)
- No multi-week rolling budgets (only fixed windows)
- No cost attribution by cost center
- No automated rollback on savings failure

### Future
- Integrate with CostOps approval workflow for automated DUAL_APPROVAL detection
- Add cost-per-user attribution for chargeback
- Implement automated rollback if savings < 10%
- Add model-specific performance validation before downgrade
- Support cost anomaly detection (spike alerts)

## Testing

All 32 tests pass:

```bash
$ node scripts/run-pattern-tests.mjs token-governance

# tests 32
# pass 32
# fail 0
```

Key test suites:
- Policy (4 tests): creation, validation, readiness, registry
- Budget Gate (4 tests): allowed, blocked, requires-approval, cost estimation
- Model Downgrade (5 tests): proposal, single-approval, dual-approval, same-actor blocking, routing
- Savings Verification (7 tests): baseline, initialization, measurement, confidence levels, totals, proof graph
- Integration: Full end-to-end scenarios

## Summary

Sprint D completes the AI economic operations loop:

1. **Observe** (Sprint C): Real OpenAI telemetry ingestion
2. **Recommend** (Sprint C): AI recommendations from real data
3. **Enforce** (Sprint D): Budget gates prevent overspend
4. **Execute** (Sprint D): Downgrade execution with approvals
5. **Verify** (Sprint D): Proven savings with confidence levels

Result: **Closed-loop AI cost governance with real evidence.**
