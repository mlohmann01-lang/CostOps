# Token Governance Setup Guide (Sprint D)

## Overview

Token Governance provides real-time enforcement of token budgets and model routing policies. It includes budget gates to block overspend, model downgrade execution with approval gates, and verification of realized savings.

## Core Concepts

### Policy & Budgets

A **Policy** defines token governance rules for a tenant:
- **Risk Class** (A/B/C): Determines enforcement stringency
  - Class A: Strict enforcement, requires dual approval for changes
  - Class B: Moderate enforcement
  - Class C: Permissive (default)
- **Budgets**: Define spending limits by scope (tenant-wide, per-workflow, per-user)
- **Model Rules**: Define downgrade triggers and targets
- **Enforcement Mode**:
  - `WARN`: Log violations but allow execution
  - `BLOCK`: Reject requests that exceed limits
  - `REQUIRE_APPROVAL`: Allow with explicit approval

### Budget Gates

Budget gates intercept requests before execution and check against policies:
- Calculate estimated cost based on model and tokens
- Verify against budget constraints
- Block/warn/require approval based on enforcement mode
- Record actual spend after execution

### Model Downgrade Execution

Downgrades route traffic from expensive models to cheaper alternatives:
- Triggered by MODEL_ROUTING recommendations
- Requires DUAL_APPROVAL for class A policies
- Executes immediately once approved
- Maintains routing table for request-time resolution

### Savings Verification

Automatically verifies that downgrades achieve projected savings:
- Records baseline costs before downgrade
- Measures post-downgrade costs
- Calculates realized savings with confidence levels
- Integrates with proof graph

## Step 1: Create a Policy

```bash
curl -X POST http://localhost:3000/api/token-governance/policies \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Cost Control",
    "riskClass": "A",
    "enforcementMode": "BLOCK",
    "budgets": [
      {
        "scope": "TENANT",
        "budgetType": "MONTHLY",
        "budgetAmountUSD": 5000,
        "alertThresholdPercent": 80
      },
      {
        "scope": "WORKFLOW",
        "scopeId": "workflow-ai-agents",
        "budgetType": "WEEKLY",
        "budgetAmountUSD": 500,
        "alertThresholdPercent": 75
      }
    ]
  }'
```

Response:
```json
{
  "policyId": "policy-tenant-123-1716374400000",
  "status": "CREATED",
  "readiness": {
    "status": "READY",
    "errors": [],
    "warnings": []
  }
}
```

## Step 2: View Policies

```bash
curl -X GET http://localhost:3000/api/token-governance/policies \
  -H "Authorization: Bearer <your_jwt_token>"
```

Response:
```json
{
  "tenantId": "tenant-123",
  "policies": [
    {
      "policyId": "policy-tenant-123-1716374400000",
      "name": "Production Cost Control",
      "riskClass": "A",
      "enabled": true,
      "enforcementMode": "BLOCK",
      "budgets": 2,
      "modelRules": 0,
      "createdAt": "2026-05-22T12:00:00Z"
    }
  ]
}
```

## Step 3: View Budgets

```bash
curl -X GET http://localhost:3000/api/token-governance/budgets \
  -H "Authorization: Bearer <your_jwt_token>"
```

Response:
```json
{
  "tenantId": "tenant-123",
  "budgets": [
    {
      "budgetId": "budget-...",
      "scope": "TENANT",
      "budgetType": "MONTHLY",
      "budgetAmountUSD": 5000,
      "currentSpendUSD": 2340.50,
      "percentUsed": 46.8,
      "status": "ACTIVE",
      "alertThreshold": 80
    },
    {
      "budgetId": "budget-...",
      "scope": "WORKFLOW",
      "scopeId": "workflow-ai-agents",
      "budgetType": "WEEKLY",
      "budgetAmountUSD": 500,
      "currentSpendUSD": 425.00,
      "percentUsed": 85.0,
      "status": "ACTIVE",
      "alertThreshold": 75
    }
  ],
  "totalBudgetUSD": 5500,
  "totalSpendUSD": 2765.50
}
```

## Step 4: Propose Model Downgrade

When a MODEL_ROUTING recommendation is generated (e.g., GPT-4 used for simple tasks):

```bash
curl -X POST http://localhost:3000/api/token-governance/downgrades \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fromModel": "gpt-4",
    "toModel": "gpt-3.5-turbo",
    "reason": "Simple tasks <100 input tokens detected",
    "estimatedMonthlySavingsUSD": 1200,
    "affectedWorkflows": ["workflow-ai-agents", "workflow-analytics"]
  }'
```

Response:
```json
{
  "executionId": "exec-downgrade-gpt-4-to-gpt-3.5-turbo-1716374400000",
  "proposalId": "downgrade-gpt-4-to-gpt-3.5-turbo-1716374400000",
  "status": "PENDING_APPROVAL",
  "requiresDualApproval": true,
  "estimatedSavings": 1200
}
```

## Step 5: Approve Downgrade (DUAL_APPROVAL)

Since this is a Class A policy, two different approvers are required:

**First Approval:**
```bash
curl -X POST http://localhost:3000/api/token-governance/downgrades/exec-downgrade-gpt-4-to-gpt-3.5-turbo-1716374400000/approve \
  -H "Authorization: Bearer <actor1_jwt_token>"
```

Response:
```json
{
  "executionId": "exec-downgrade-...",
  "status": "PENDING_APPROVAL",
  "approvalChain": 1,
  "nextStep": "AWAITING_SECOND_APPROVAL"
}
```

**Second Approval (different actor):**
```bash
curl -X POST http://localhost:3000/api/token-governance/downgrades/exec-downgrade-gpt-4-to-gpt-3.5-turbo-1716374400000/approve \
  -H "Authorization: Bearer <actor2_jwt_token>"
```

Response:
```json
{
  "executionId": "exec-downgrade-...",
  "status": "EXECUTED",
  "approvalChain": 2,
  "nextStep": "ROUTING_UPDATED"
}
```

Note: Attempting second approval from the same actor (actor1) would be blocked with error `DUAL_APPROVAL_SAME_ACTOR_BLOCKED`.

## Step 6: View Savings Verifications

After the downgrade has been executed for 30 days:

```bash
curl -X GET http://localhost:3000/api/token-governance/verifications \
  -H "Authorization: Bearer <your_jwt_token>"
```

Response:
```json
{
  "tenantId": "tenant-123",
  "verifications": [
    {
      "verificationId": "verify-exec-downgrade-...",
      "executionId": "exec-downgrade-...",
      "fromModel": "gpt-4",
      "toModel": "gpt-3.5-turbo",
      "baselineCostUSD": 1500.00,
      "measuredCostUSD": 980.00,
      "realizedSavingsUSD": 520.00,
      "realizedSavingsPercent": 34.67,
      "status": "COMPLETED",
      "confidenceLevel": "HIGH",
      "startedAt": "2026-05-22T12:00:00Z",
      "completedAt": "2026-06-22T12:00:00Z"
    }
  ],
  "totalRealizedSavingsUSD": 520.00,
  "completedVerifications": 1,
  "averageConfidence": "HIGH"
}
```

## Pricing Model

The budget gate uses simplified pricing for cost estimation:

| Model | Input Price | Output Price |
|-------|------------|--------------|
| gpt-4 | $0.00003/token | $0.00006/token |
| gpt-4-turbo | $0.00001/token | $0.00003/token |
| gpt-4o | $0.000005/token | $0.000015/token |
| gpt-3.5-turbo | $0.0000005/token | $0.0000015/token |

## Policy Enforcement Modes

### WARN
- Log policy violations but allow execution
- Use for initial rollout or permissive policies
- Helps identify problem areas without impacting users

### BLOCK
- Reject requests that violate policy
- Use for Class A policies to enforce hard limits
- Returns HTTP 403 with violation details

### REQUIRE_APPROVAL
- Allow high-cost/unusual requests with explicit approval
- Operator can approve override for legitimate use cases
- Requires integration with approval workflow

## Best Practices

1. **Start Permissive**: Begin with WARN enforcement, graduate to REQUIRE_APPROVAL, then BLOCK as patterns stabilize.

2. **Set Realistic Budgets**: Review historical spending before setting limits. Use alert thresholds at 75-80%.

3. **Model Downgrade Rules**: Define rules only for models where you have proven cost-quality trade-offs.

4. **Dual Approval**: Class A policies require two different actors. Ensure approval workflow supports this.

5. **Verification Windows**: Allow 30+ days of data collection before interpreting savings verification. Confidence levels guide interpretation.

6. **Monitor Alerts**: Set up notifications when budgets hit alert threshold (e.g., 80%). Early intervention prevents exceeded budgets.

## Troubleshooting

### "Budget Exceeded" Blocks All Requests

- Check if budget window has ended (DAILY/WEEKLY/MONTHLY resets)
- Verify current spend hasn't been calculated correctly
- Consider temporarily disabling policy while investigating

### Downgrade "Blocks Same Actor Second Approval"

- This is intentional for DUAL_APPROVAL
- First approver cannot also be second approver
- Request approval from a different actor

### Savings Verification Shows "INCONCLUSIVE"

- Common if workflow load increased post-downgrade
- Indicates token usage grew despite model change
- Review workflow logs for changes during measurement window
- Confidence levels (HIGH/MEDIUM/LOW) indicate measurement reliability

## Next Steps

1. Create policies for your critical workflows
2. Monitor budget usage and alert patterns
3. Propose model downgrades based on recommendations
4. Verify realized savings over 30-day cycles
5. Iterate policies based on actual outcomes
