# Certen Product Language Guide

## Approved lifecycle labels
- Identified
- Eligible
- Approved
- Executing
- Verified
- Blocked
- Drift detected
- Rollback available
- Proof incomplete
- Demo simulation

## State meanings
- **Identified**: potential savings detected from connector evidence.
- **Eligible**: governance checks passed and action can proceed.
- **Approved**: operator/approver accepted governed action.
- **Executing**: action is queued or running in execution workflow.
- **Verified**: savings validated through verification evidence.
- **Blocked**: missing prerequisites, policy, readiness, or role constraints.

## Banned labels
- maybe ready
- pending action
- unknown
- live-ish
- simulated success

## Demo wording
Always include: "Demo workspace", "Synthetic evidence", "No production systems connected", and "Demo simulation only".

## Proof wording
Use "Proof incomplete" when evidence is missing and include next step.

## Execution wording
Use "Live execution disabled" in demo/read-only modes and explain why.
