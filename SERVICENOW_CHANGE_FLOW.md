# ServiceNow Change Request Flow

## Overview

This document maps the ServiceNow change lifecycle to economic operations execution states.

## Change Request State Machine

```
ServiceNow States:
  NEW → ASSESS → AUTHORIZE → SCHEDULED → IMPLEMENT → REVIEW → CLOSED

Platform Maps:
  NEW:        Change created, awaiting assessment
  ASSESS:     Under technical review
  AUTHORIZE:  Awaiting CAB approval
  SCHEDULED:  Approved, scheduled for execution window
  IMPLEMENT:  In implementation window — execution ALLOWED
  REVIEW:     Post-implementation review
  CLOSED:     Change complete
```

## Platform Execution Gate

The platform checks ServiceNow state before allowing live execution:

```typescript
const changeStatus = await connector.readChangeStatus(changeId);

if (changeStatus.ok && changeStatus.data.state === 'IMPLEMENT') {
  // Execution is allowed
  proceedWithExecution();
} else {
  // Block execution
  return reject('INTENT_BLOCKED_BY_POLICY');
}
```

In dry-run mode, `readChangeStatus` returns `state: "ASSESS"` to simulate the
pending-approval scenario. Use `SERVICENOW_MODE=LIVE` with a real sandbox to test
the IMPLEMENT state gate.

## End-to-End Flow: Approval → Execute → Close

```
T+0:  Operator submits REQUEST_APPROVAL intent
T+1:  Approver grants APPROVE intent
T+2:  Platform enqueues SERVICENOW_CHANGE_CREATE job
T+3:  Job worker creates CHG:
      {
        shortDescription: "M365 License Reclaim: user@contoso.com",
        description: "Projected saving: $XX/month. Proof: [proof-ids]...",
        type: "NORMAL",
        tenantId: "TENANT-ID",
        executionId: "m365-exec-123"
      }
T+4:  CHG number returned: CHG0001234
T+5:  Change Advisory Board reviews (ServiceNow workflow)
T+6:  CAB approves → state transitions to IMPLEMENT
T+7:  Operator submits EXECUTE intent
T+8:  Platform calls readChangeStatus("CHG0001234")
      Response: { state: "IMPLEMENT", approvalStatus: "approved" }
T+9:  Execution proceeds (live Graph mutation if M365_LIVE_LICENSE_MUTATION_ENABLED=true)
T+10: Platform calls attachEvidence("CHG0001234", { proofId, executionId })
T+11: Verification job runs (async, T+30min)
T+12: Operator closes CHG in ServiceNow after verification
```

## Change Request Payload

```typescript
connector.createChangeRequest({
  tenantId: "TENANT-ID",
  executionId: "m365-exec-123",
  actorId: "operator-1",
  shortDescription: "M365 License Reclaim: disabled.user@contoso.com",
  description: `
    Economic Operations Platform - License Reclaim
    
    User: disabled.user@contoso.com
    Account Status: Disabled
    Assigned SKUs: Microsoft_365_E3, Power_BI_Pro
    Projected Monthly Saving: $38.40
    
    Approval granted by: approver-1 at 2026-05-21T08:00:00Z
    Proof references: [simulation-proof-123, approval-proof-456]
    
    Rollback plan: Reassign original SKUs from captured set.
    Rollback requires ROLLBACK_APPROVE from an approver.
  `,
  type: "NORMAL"
})
```

## Evidence Attachment

After execution, proof references are attached to the CHG:

```typescript
connector.attachEvidence("CHG0001234", {
  proofId: "execution-evidence-123",
  executionId: "m365-exec-123"
})
```

The attached evidence creates a traceability link:
```
CHG0001234 ← attached → proofId: execution-evidence-123
                       ← traces → executionId: m365-exec-123
                       ← traces → ledgerId: ledger-m365-exec-123
```

## Rollback and ServiceNow

When a rollback is requested:

1. Check if original CHG is in REVIEW or CLOSED state
2. Create a new EMERGENCY change request for rollback:
   ```
   shortDescription: "ROLLBACK: M365 License Reassignment - disabled.user@contoso.com"
   type: EMERGENCY
   ```
3. Reference original CHG number in description
4. Expedited approval (CAB emergency process)
5. Rollback execution proceeds when emergency CHG reaches IMPLEMENT

## Change Audit Trail

Every change request preserves a complete audit trail in both systems:

| Field | Platform Record | ServiceNow Record |
|---|---|---|
| Who requested | `actorId` in intent history | Requested By field |
| Who approved | APPROVE intent actor | Approved By field |
| What changed | Execution payload | Description + Evidence |
| When executed | `executedAt` in ledger | Work notes |
| Verification outcome | Verification events table | Closure notes |
| Rollback state | Rollback events table | Related CHG |

## Testing Without Live ServiceNow

Use dry-run mode for smoke tests and development:

```bash
SERVICENOW_MODE=MOCK_CONNECTOR node dist/index.js
```

All CHG operations return mock data:
- CHG numbers: `CHG10010001`, `CHG10010002`, etc. (unique per call)
- State: `ASSESS` (simulating pending CAB review)
- Approval status: `pending` initially

To simulate CAB approval in tests, advance the mock CHG to IMPLEMENT state
via the in-memory connector store.
