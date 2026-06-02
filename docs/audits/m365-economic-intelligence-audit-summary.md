# M365 Economic Intelligence Audit Summary

Audit date: 2026-06-01
Scope: existing seven M365 playbooks; audit only; no new playbooks, execution actions, authorities, UI, or architecture.

## Executive answer

Certen should **not** safely execute live M365 license-removal recommendations yet.

Certen **can** safely use the current M365 recommendations for read-only discovery, prioritization, and governed human review, provided users understand that many savings figures are estimates and several playbooks identify possible opportunities rather than execution-ready actions.

Before Sprint 3 enables governed execution, Certen must harden evidence, savings, trust, and execution safety gates. The first execution candidate should be limited to the narrowest, best-evidenced inactive-user or direct-license reclaim scenario after blockers below are fixed.

## Overall M365 intelligence score

**Overall score: 5.1 / 10**

This score reflects useful opportunity discovery but insufficient proof for live removal. The score is pulled down by estimated savings, weak entitlement intelligence, generic trust gating, and missing execution blockers for high-risk playbooks.

## `M365PlaybookAuditScore` framework

```ts
export interface M365PlaybookAuditScore {
  playbookId: string
  evidenceQuality: number // 0-10
  trustworthiness: number // 0-10
  savingsAccuracy: number // 0-10
  executionSafety: number // 0-10
  commercialValue: number // 0-10
  overall: number // average of the five scores
  executionReadiness: 'READY' | 'NEEDS_HARDENING' | 'NOT_READY'
}
```

Scoring criteria:

- Evidence Quality: source record depth, field specificity, and explainability.
- Trustworthiness: whether trust dimensions match the actual playbook risk.
- Savings Accuracy: tenant-price realism, contract reducibility, and annualization validity.
- Execution Safety: false-positive controls, blockers, assignment safety, and rollback prerequisites.
- Commercial Value: expected value if hardened and accurately priced.

## Playbook scorecard and rankings

| Rank | Playbook | Evidence Quality | Trustworthiness | Savings Accuracy | Execution Safety | Commercial Value | Overall | Execution Readiness |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | Inactive User Reclaim | 6 | 6 | 6 | 5 | 8 | 6.2 | NEEDS_HARDENING |
| 2 | Dormant Group Cleanup | 5 | 5 | 8 | 7 | 3 | 5.6 | NEEDS_HARDENING |
| 3 | License Pool Recovery | 6 | 5 | 4 | 5 | 8 | 5.6 | NEEDS_HARDENING |
| 4 | Shared Mailbox Conversion | 4 | 5 | 6 | 4 | 7 | 5.2 | NEEDS_HARDENING |
| 5 | Copilot Rightsizing | 4 | 4 | 5 | 4 | 9 | 5.2 | NEEDS_HARDENING |
| 6 | Duplicate License Detection | 4 | 3 | 3 | 3 | 8 | 4.2 | NOT_READY |
| 7 | Security SKU Rationalization | 3 | 3 | 3 | 2 | 7 | 3.6 | NOT_READY |

Note: Dormant Group Cleanup ranks lower commercially because it intentionally claims zero savings, but it is safer than many license-removal playbooks because it carries a manual-review blocker.

## Highest value playbook

**Copilot Rightsizing** has the highest potential commercial value because Copilot licenses are high-cost and frequently scrutinized. It is not the most execution-ready because it currently relies on generic Microsoft 365 active-user signals rather than direct Copilot usage evidence.

## Highest risk playbook

**Security SKU Rationalization** is the highest risk because it can affect security posture, uses substring-based entitlement assumptions, lacks policy dependency evidence, and applies placeholder savings logic.

## Weakest evidence area

The weakest evidence area is **entitlement overlap intelligence** for duplicate-license and security SKU rationalization. SKU-name matching cannot prove that a license is redundant.

The second weakest evidence area is **direct usage evidence** for Copilot. Generic workload activity cannot prove Copilot utilization or business value.

## Weakest trust area

The weakest trust area is **playbook-specific trust gating**. Current gating is global and allows `INVESTIGATE` trust to pass as approval-required. There is no first-class entitlement-overlap trust, contract-price trust, assignment-type trust, mailbox-conversion trust, or security-dependency trust.

## Hardening recommendations by playbook

### Inactive User Reclaim

- Keep: clear purpose, understandable title, useful inactive-user evidence, protected-user heuristic hook.
- Improve: require role/admin evidence, service-account ownership evidence, direct-vs-group assignment evidence, and explicit handling of missing sign-in data.
- Blockers: missing sign-in currently behaves like old activity; group-assigned licenses are not blocked; privileged role proof is absent.
- Execution readiness: **NEEDS_HARDENING**.

### License Pool Recovery

- Keep: combines SKU capacity and inactive-assignment visibility in a commercially useful signal.
- Improve: split unused prepaid capacity from inactive-user reclaim; attach contract reducibility, renewal timing, protected-user exclusions, and assignment type.
- Blockers: savings can be overstated when prepaid licenses are already committed or inactive users are group-assigned/protected.
- Execution readiness: **NEEDS_HARDENING**.

### Copilot Rightsizing

- Keep: targets a high-value cost area and distinguishes high/medium/low/no usage bands.
- Improve: require direct Copilot usage telemetry, treat missing usage as unknown, and justify reassignment/removal economics.
- Blockers: generic workload activity is not enough to classify Copilot value; missing records are currently treated as no usage.
- Execution readiness: **NEEDS_HARDENING**.

### Shared Mailbox Conversion

- Keep: clear identification of generic/shared-mailbox candidates and understandable opportunity narrative.
- Improve: require mailbox recipient type, owner/delegate, storage/archive, compliance hold, and activity evidence.
- Blockers: normal mailboxes can be flagged by prefix; mailbox records are not directly validated in the playbook.
- Execution readiness: **NEEDS_HARDENING**.

### Duplicate License Detection

- Keep: useful early warning for possible bundle/add-on redundancy.
- Improve: compare Microsoft service plan IDs, disabled plans, feature usage, and actual overlap matrices.
- Blockers: entitlement overlap is assumed from SKU names; high-value add-ons such as Phone, Audio, Power BI, Defender, and Entra can be separately required.
- Execution readiness: **NOT_READY**.

### Dormant Group Cleanup

- Keep: zero-savings posture and manual-review blocker; low confidence is appropriate.
- Improve: include group type, membership count, app dependencies, Teams/SharePoint resources, and group activity sources.
- Blockers: owner and activity evidence are sparse; deletion or archiving should never be automatic yet.
- Execution readiness: **NEEDS_HARDENING** for any destructive action; safe as blocked review.

### Security SKU Rationalization

- Keep: identifies potentially expensive security-stack overlap for human review.
- Improve: add authoritative entitlement matrix, policy dependency checks, security-owner approval, and real SKU pricing.
- Blockers: security posture can be weakened; overlap and savings are assumed; placeholder $5 floor is not execution-grade.
- Execution readiness: **NOT_READY**.

## Required hardening before Sprint 3

1. **Execution gate:** never allow `INVESTIGATE`, `LOW_CONFIDENCE`, or `BLOCKED` trust to execute live license removal.
2. **Playbook-specific gates:** require exact dimensions per playbook, not just global trust.
3. **Assignment evidence:** use direct vs group assignment and block live per-user removal when licenses are group-assigned unless group membership action is explicitly approved.
4. **Protected-user evidence:** prove admin, service account, shared mailbox, no-reply, break-glass, and critical-user exclusions.
5. **Missing-data policy:** treat missing sign-in, usage, mailbox, or entitlement data as unknown/blocking, not as safe evidence.
6. **Tenant pricing:** replace static default pricing with tenant-specific contract or billing costs before representing savings as executable.
7. **Contract reducibility:** distinguish immediate cash savings from renewal avoidance and committed-term optimization.
8. **Entitlement matrix:** add authoritative Microsoft SKU/service-plan overlap intelligence before duplicate-license or security rationalization can execute.
9. **Mailbox proof:** require recipient type, owner, storage/archive, compliance, and activity evidence before shared-mailbox conversion.
10. **Copilot proof:** require direct Copilot utilization or keep Copilot recommendations review-only.
11. **Execution evidence pack:** every executable recommendation must explain source records, trust pass/fail reasons, savings basis, proposed action, rollback path, and approver.

## Recommended Sprint 3 scope

Sprint 3 should **not** enable broad live license removal across all seven playbooks.

Recommended safe Sprint 3 scope:

1. Implement governed execution only for a narrow inactive-user reclaim subset after hardening: enabled member users, non-admin, non-service, non-shared, non-break-glass, direct-assigned licenses only, high activity trust, high license trust, actual tenant price, and explicit approval.
2. Keep Copilot, shared mailbox, license pool, duplicate license, dormant group, and security SKU recommendations as review-only until their evidence blockers are fixed.
3. Add a pre-execution evidence pack and approval checklist for any action.
4. Add hard blocks for missing telemetry, group-assigned licenses, unknown SKU cost, and weak trust dimensions.
5. Use dry-run and rollback proof before any tenant write operation.

## Final deliverable answer

Can Certen safely execute M365 recommendations today?

**No, not as live license-removal actions.** The current intelligence layer is useful and directionally valuable, but it is not yet trustworthy enough to execute across the seven playbooks.

What exactly must be fixed first?

- Prove protected-user exclusions and direct license assignment for inactive-user reclaim.
- Treat missing evidence as blocking rather than negative usage/activity.
- Replace estimated prices with tenant-specific prices and contract reducibility.
- Add playbook-specific trust thresholds and prevent `INVESTIGATE` from being executable.
- Add entitlement intelligence before duplicate-license and security SKU recommendations can move beyond review.
- Add direct Copilot usage and mailbox conversion proof before those playbooks can drive execution.

## Audit artifacts

- `docs/audits/m365-playbook-inventory-audit.md`
- `docs/audits/m365-savings-assumption-audit.md`
- `docs/audits/m365-playbook-risk-audit.md`
- `docs/audits/m365-trust-gate-audit.md`
- `docs/audits/m365-opportunity-quality-audit.md`
- `docs/audits/m365-evidence-audit.md`
