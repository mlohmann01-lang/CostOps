# M365 Opportunity Quality Audit

Audit date: 2026-06-01

## Opportunity factory payload pattern

Every playbook uses the shared `candidate` factory. The payload includes title, description, domain, projected monthly and annual savings, readiness, confidence score, trust score, evidence strings, reasons, entity key, recommendation key, cost object key, affected users, opportunity type, playbook ID, and snapshot ID. The provider appends global trust evidence and trust requirements, and can block readiness when global trust is insufficient.

## Quality score by playbook

| Playbook | Evidence sufficiency | Title clarity | Savings realism | Confidence justification | Execution risk captured | Trust reflected | Quality verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Inactive User Reclaim | Partial: user, last sign-in, license strings; missing role, assignment type, and source freshness. | Clear. | Medium: estimated SKU price, annualized simplistically. | Partially justified by cost and evidence count only. | Weak: no blocker for group assignment or missing sign-in. | Global trust reflected, not playbook-specific. | Good for investigation; not execution-ready. |
| License Pool Recovery | Partial: SKU, unused capacity, inactive count, user IDs; missing contract and assignment detail. | Clear. | Weak-medium: mixes unused prepaid and inactive assigned savings. | Based mainly on SKU part presence. | Weak: no blocker for contract reducibility or protected users. | Global trust reflected. | Useful renewal signal; risky as execution signal. |
| Copilot Rightsizing | Partial: user, usage band, last sign-in, license IDs; missing direct Copilot usage. | Clear. | Weak-medium: full or 40% Copilot default price. | Overstated when usage row is missing. | Weak: no blocker for missing usage telemetry. | Global trust reflected. | Needs hardening before action. |
| Shared Mailbox Conversion | Partial: user/mailbox UPN and licenses; missing mailbox type, usage, storage, owner. | Clear. | Medium if license costs are accurate; otherwise estimated. | Fixed medium, not evidence-dependent. | Weak: no blocker for missing mailbox proof. | Global trust reflected. | Review-only. |
| Duplicate License Detection | Partial: user and license strings; missing service plan overlap and feature usage. | Clear enough, says “potentially redundant.” | Weak: assumes add-on removability. | Fixed medium despite unproven overlap. | Weak: no blockers for unknown overlap. | Global trust reflected, but missing entitlement trust. | Not execution-ready. |
| Dormant Group Cleanup | Partial: group, owner missing, activity missing; missing group dependencies. | Clear. | Realistic: zero savings. | Low confidence is appropriate. | Stronger: manual-review blocker present. | Global trust reflected and candidate blocked. | Safe as blocked governance review. |
| Security SKU Rationalization | Weak-partial: user and security SKU strings only. | Clear. | Weak: placeholder floor and assumed overlap. | Fixed medium despite entitlement uncertainty. | Weak: no blocker for security dependency risk. | Global trust reflected, but missing entitlement/security trust. | Not execution-ready. |

## Findings by quality dimension

### Evidence

Evidence is explainable at a high level but often not sufficient for a CIO or administrator to verify safe execution. Evidence strings identify records but do not embed source field values beyond a few derived facts. The weakest evidence areas are entitlement overlap, mailbox conversion proof, direct Copilot usage, and group assignment type.

### Opportunity title

Titles are generally understandable and include the entity context. They are suitable for dashboards.

### Savings

Savings are directionally useful but not execution-grade because they rely on estimated prices and assume license removal creates cash savings. The dormant group playbook correctly avoids unsupported savings by using zero.

### Confidence

Confidence is not always justified. Several playbooks use fixed `MEDIUM` confidence despite missing key proof. `confidenceFor` uses cost availability and evidence count, not actual evidence quality.

### Execution risk

Execution risk is underrepresented. Only dormant group cleanup includes an explicit manual-review blocker. Other high-risk playbooks can remain `APPROVAL_REQUIRED` when global trust is `INVESTIGATE` or better.

### Trust

Trust is reflected as a global score and band, but playbook-specific trust requirements are generic. Opportunity quality would improve if each playbook required the dimensions that actually support its recommendation.

## Opportunity quality conclusion

Current opportunities are suitable for audit, prioritization, and human investigation. They are not yet suitable for live removal because evidence and confidence do not consistently encode the difference between “possible opportunity” and “safe executable action.”
