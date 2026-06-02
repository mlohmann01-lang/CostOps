# M365 Trust Gate Audit

Audit date: 2026-06-01

## Trust model observed

`M365TrustService` computes global trust from six dimensions: identity, license, usage, activity, mailbox, and execution safety. Bands are assigned as follows: `TRUSTED` at score >= 90, `HIGH` at >= 75, `INVESTIGATE` at >= 55, `LOW_CONFIDENCE` above 0, and `BLOCKED` at 0. If read readiness is incomplete, global trust is forced to `LOW_CONFIDENCE` even if the average score is higher.

`M365OpportunityProvider` allows opportunity readiness to remain non-blocked when global trust is `TRUSTED`, `HIGH`, or `INVESTIGATE` and the candidate has no blockers. It sets readiness to `BLOCKED` when global trust is `LOW_CONFIDENCE` or `BLOCKED`, or when candidate blockers exist.

## Execution eligibility verification

No current M365 playbook emits `EXECUTION_ELIGIBLE`. The shared candidate factory emits `APPROVAL_REQUIRED` when there are no candidate blockers and `BLOCKED` when blockers exist. The opportunity provider can downgrade readiness to `BLOCKED` based on global trust. Therefore, no playbook currently generates `EXECUTION_ELIGIBLE` directly.

However, `INVESTIGATE` global trust is currently allowed to pass as `APPROVAL_REQUIRED`. That is acceptable for read-only review but too permissive for any future live license removal. Sprint 3 must introduce or enforce a separate execution gate requiring higher trust before any live action is considered.

## Playbook trust threshold audit

| Playbook | Current effective threshold | Required dimensions | Should threshold change? | Recommended execution band | Rationale |
| --- | --- | --- | --- | --- | --- |
| Inactive User Reclaim | Global `INVESTIGATE` or above; no candidate blockers. | Identity, license, activity, execution safety. | Yes, higher for execution. | HIGH minimum; TRUSTED preferred for batch automation. | Missing sign-in or protected-user evidence can create high-impact false positives. |
| License Pool Recovery | Global `INVESTIGATE` or above; no candidate blockers. | License, activity, identity, execution safety, contract reducibility. | Yes, higher and more specific. | HIGH for review; TRUSTED plus contract evidence for execution. | Current global trust does not prove economic reducibility or assignment type. |
| Copilot Rightsizing | Global `INVESTIGATE` or above; no candidate blockers. | Usage, license, activity, identity, execution safety. | Yes, much higher. | TRUSTED for execution; HIGH only for review. | Missing direct Copilot usage means usage trust must be stronger than generic M365 activity. |
| Shared Mailbox Conversion | Global `INVESTIGATE` or above; no candidate blockers. | Mailbox, identity, license, execution safety. | Yes, higher and mailbox-specific. | HIGH with mailbox evidence; TRUSTED for automated conversion. | Current playbook does not consume mailbox recipient type, storage, or owner evidence. |
| Duplicate License Detection | Global `INVESTIGATE` or above; no candidate blockers. | License, entitlement overlap, identity, execution safety. | Yes, add entitlement trust. | TRUSTED plus entitlement matrix for execution. | License trust is not the same as entitlement-overlap trust. |
| Dormant Group Cleanup | Candidate-level blocker always present. | Directory/group trust, activity, execution safety. | Current blocked posture is appropriate. | BLOCKED until manual review. | Zero-savings governance cleanup should remain manual. |
| Security SKU Rationalization | Global `INVESTIGATE` or above; no candidate blockers. | License, security entitlement overlap, policy dependency, execution safety. | Yes, strongest threshold. | TRUSTED plus security approval. | Incorrect action can weaken security controls. |

## Classification

| Playbook | Current trust classification | Production execution classification |
| --- | --- | --- |
| Inactive User Reclaim | INVESTIGATE | NEEDS HIGH/TRUSTED |
| License Pool Recovery | INVESTIGATE | NEEDS HIGH/TRUSTED plus contract evidence |
| Copilot Rightsizing | LOW_CONFIDENCE to INVESTIGATE, depending on usage coverage | NEEDS TRUSTED |
| Shared Mailbox Conversion | INVESTIGATE | NEEDS HIGH/TRUSTED mailbox evidence |
| Duplicate License Detection | LOW_CONFIDENCE for entitlement correctness | BLOCKED for execution until entitlement intelligence exists |
| Dormant Group Cleanup | BLOCKED by candidate blocker | BLOCKED until manual review |
| Security SKU Rationalization | LOW_CONFIDENCE for entitlement correctness | BLOCKED for execution until entitlement and security dependency evidence exist |

## Trust gate findings

1. The global gate prevents `LOW_CONFIDENCE` and `BLOCKED` tenants from producing non-blocked opportunities.
2. The global gate permits `INVESTIGATE`, which is reasonable for recommendations but insufficient for live license removal.
3. Trust dimensions are global, not playbook-specific; a high average can hide weak usage or mailbox dimensions that matter to specific playbooks.
4. Entitlement-overlap trust does not exist as a first-class dimension, leaving duplicate-license and security rationalization under-gated.
5. Candidate-level blockers are underused. Only dormant group cleanup always blocks itself.

## Trust gate conclusion

The current gate is safe enough for read-only opportunity generation, but not for governed execution. Before Sprint 3 live removal, execution gating must require playbook-specific trust dimensions, block missing required evidence, and prevent `INVESTIGATE` opportunities from becoming executable.
