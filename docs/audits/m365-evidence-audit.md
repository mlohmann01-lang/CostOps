# M365 Evidence Audit

Audit date: 2026-06-01

## CIO-click question

If a CIO clicks an M365 opportunity, the platform can usually explain the top-level reason the opportunity exists, but it cannot always prove the recommendation is safe to execute. Evidence chains are strongest for simple record existence and weakest for entitlement equivalence, economic reducibility, usage interpretation, and execution safety.

## Evidence chain by playbook

| Playbook | Why opportunity exists | Current evidence chain | Source records | Trust reasoning | Savings reasoning | Can we explain it? | Can we prove execution safety? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Inactive User Reclaim | User is enabled, licensed, not protected by heuristic, and activity is older than 90 days. | `snapshot`, `user`, `lastSignIn`, `license` strings. | `M365User`, `M365SubscribedSku`. | Global identity/license/activity trust appended by provider. | Sum assigned SKU estimated monthly costs; annual is monthly x 12. | Yes, at summary level. | No, not without role, assignment type, and missing-activity safeguards. |
| License Pool Recovery | SKU has unused prepaid capacity and/or inactive assigned users. | `snapshot`, `sku`, `unusedCapacity`, `inactiveAssigned`, user IDs. | `M365SubscribedSku`, `M365User`. | Global license/activity trust. | Recoverable units times estimated SKU cost. | Yes. | No, not without contract reducibility and assignment-type evidence. |
| Copilot Rightsizing | Copilot-assigned user has no/low/medium usage band. | `snapshot`, `user`, `copilotUsage`, `lastSignIn`, license IDs. | `M365User`, `M365UsageRecord`, `M365SubscribedSku`. | Global usage/activity/license trust. | Full Copilot default price for no/low usage; 40% for medium. | Partly. | No, because direct Copilot usage is absent and missing usage means no usage. |
| Shared Mailbox Conversion | Licensed user appears generic/shared by heuristic or prefix. | `snapshot`, `user`, `mailbox:<UPN>`, licenses. | `M365User`, `M365SubscribedSku`; mailbox records are not actually consulted in the playbook. | Global mailbox/identity/license trust may be appended, but opportunity evidence lacks mailbox record proof. | Sum assigned estimated SKU costs. | Partly. | No, because recipient type, storage, compliance, and owner proof are missing. |
| Duplicate License Detection | User has E5 plus hinted redundant add-ons. | `snapshot`, `user`, license parts, overlap list. | `M365User`, `M365SubscribedSku`. | Global license trust, but no entitlement-overlap trust. | Sum estimated add-on costs. | Yes for “why flagged”; no for “why redundant.” | No, entitlement overlap is assumed. |
| Dormant Group Cleanup | Group has no owner and missing/stale-looking activity/name evidence. | `snapshot`, `group`, `owner:missing`, `lastActivity`. | Group record from snapshot. | Global trust plus explicit manual-review blocker. | Zero savings. | Yes, with caveat that evidence is sparse. | Not applicable for automation; blocker prevents execution. |
| Security SKU Rationalization | User has suite SKU plus security-like add-ons. | `snapshot`, `user`, `securitySkus` list. | `M365User`, `M365SubscribedSku`. | Global license trust, but no security entitlement or policy dependency trust. | Sum estimated security add-on costs with $5 minimum. | Yes for “why flagged”; no for “why removable.” | No, security dependency proof is absent. |

## Evidence gaps

1. Source-record depth: evidence strings reference records but do not expose field-level source values, timestamps, or extraction provenance.
2. Assignment type: group vs direct license assignment is modeled but not used by most savings/playbook logic.
3. Entitlement intelligence: no service-plan matrix backs duplicate-license or security rationalization decisions.
4. Usage quality: Copilot uses generic M365 active-user fields rather than direct Copilot utilization.
5. Mailbox proof: shared mailbox conversion does not require mailbox recipient type, owner, storage, archive, or compliance evidence.
6. Contract proof: savings do not cite tenant-specific price, renewal date, term, or reducibility.
7. Trust specificity: opportunity reasons include generic trust requirements rather than the exact dimensions and thresholds that passed or failed.

## Evidence audit conclusion

The evidence chain is adequate for explaining why an opportunity was generated, but not adequate for proving safe execution across most playbooks. Before Sprint 3, execution candidates must carry enough evidence for an administrator to answer: what exact record was found, why it is safe, what price is being avoided, how the license is assigned, what would change, and how rollback works.
