# M365 Playbook-by-Playbook Risk Audit

Audit date: 2026-06-01

## Risk summary

| Playbook | Primary execution risk | Can a critical object be incorrectly targeted? | Risk rating |
| --- | --- | --- | --- |
| Inactive User Reclaim | Critical licensed user, admin, or service account can be targeted if heuristics or sign-in telemetry are incomplete. | Yes. | HIGH |
| License Pool Recovery | Savings can be overstated and protected inactive users can be counted in recoverable pool. | Yes, for inactive-assigned component. | MEDIUM-HIGH |
| Copilot Rightsizing | Low generic workload usage can be misclassified as low Copilot value. | Yes. | HIGH |
| Shared Mailbox Conversion | Normal mailbox can be incorrectly flagged by prefix or heuristic. | Yes. | HIGH |
| Duplicate License Detection | Real entitlement overlap is assumed and add-ons can be incorrectly treated as redundant. | Yes. | HIGH |
| Dormant Group Cleanup | Important groups can be ownerless or have missing activity, but candidate is blocked for manual review. | Yes, but execution is blocked. | MEDIUM |
| Security SKU Rationalization | Security add-ons can be incorrectly treated as redundant, weakening security posture. | Yes. | HIGH |

## Inactive User Reclaim

### Validations

- Admin exclusion: present only through `isAdminCandidate` via `isProtectedUser`; no direct role membership or privileged role assignment check is visible in this playbook.
- Service account exclusion: present only through `isServiceAccountCandidate`; no app/service principal, naming, sign-in pattern, or ownership proof is required.
- Shared mailbox exclusion: present only through `isSharedMailboxCandidate`; no mailbox recipient type validation is performed here.
- Group-assigned license edge cases: not handled. The playbook sums all assigned licenses and does not inspect `M365LicenseAssignment.assignmentType`.
- Recent sign-in edge cases: uses last interactive sign-in or last non-interactive sign-in. Missing or invalid dates become 9999 days old, so missing telemetry can create candidates.

### Critical-user targeting answer

Yes. A critical user can be incorrectly targeted when sign-in data is missing, an admin/service/shared mailbox flag is wrong, or a license is assigned by group and cannot be safely removed from only that user.

### Required hardening before live execution

- Require privileged role evidence and admin exclusion from Graph role assignments.
- Require service-account ownership and exclusion proof.
- Require mailbox recipient type check when shared-mailbox heuristic is involved.
- Include assignment type and block automatic execution for group-assigned licenses.
- Treat missing sign-in activity as low-confidence investigation, not inactive proof.

## Copilot Rightsizing

### Validations

- Actual usage signals available: the current playbook uses Microsoft 365 workload booleans from usage records, not direct Copilot interaction telemetry.
- Missing usage signals: missing usage row is interpreted as `NO_USAGE` unless the user is already inactive.
- Inactive vs low usage distinction: inactive status forces `NO_USAGE`; otherwise active-signal count produces high/medium/low/no usage bands.

### Low-usage misclassification answer

Yes. Low usage can be misclassified because a user can have valid Copilot usage despite low Teams/Outlook/Exchange/OneDrive/SharePoint booleans, and missing reports are treated as no usage.

### Required hardening before live execution

- Require direct Copilot usage telemetry or keep all Copilot actions review-only.
- Distinguish telemetry missing from true zero usage.
- Require manager, department, role, or exception context for executive/high-value users.
- Validate reassignment supply/demand before claiming savings.

## Shared Mailbox Conversion

### Validations

- Mailbox type evidence: not used directly by the playbook. Snapshot mailboxes exist in the data model, but the playbook filters users only by `isSharedMailboxCandidate` or generic UPN prefixes.
- Mailbox usage evidence: not used. Storage, item count, and last activity are not inspected.
- Ownership evidence: not used. No owner/delegate/business owner is required.

### Normal-mailbox misflag answer

Yes. A normal mailbox can be incorrectly flagged when a real user has a generic-looking UPN or an inaccurate shared-mailbox candidate flag.

### Required hardening before live execution

- Require mailbox recipient type evidence and conversion eligibility.
- Require owner/delegate evidence and business owner approval.
- Require storage/archive/compliance hold checks.
- Block automated execution when mailbox type or owner evidence is missing.

## Duplicate License Detection

### Validations

- Real entitlement overlap: not proven. The code identifies E5 plus hinted add-ons by SKU-name substrings.
- Assumed overlap: substantial. Add-ons containing Power BI, Defender, Entra, Audio, Phone, and configured duplicate hints are treated as potentially redundant with E5.
- Unknown overlap: all Microsoft service-plan combinations outside the hint list, disabled service plans, geography, licensing program, and feature usage remain unknown.

### Microsoft licensing dependencies

Production-grade duplicate-license decisions depend on Microsoft service plan IDs, SKU inclusion matrices, disabled plans, add-on-specific rights, tenant feature usage, geography, purchase channel, contract terms, and whether a suite actually grants the same entitlement as the standalone add-on for that user.

### Required hardening before live execution

- Add authoritative entitlement overlap data and version it.
- Compare service plan IDs, not just SKU part substrings.
- Require feature usage/dependency checks for Phone, Audio, Power BI, Defender, and Entra.
- Treat unknown overlap as blocked, not medium-confidence savings.

## Security SKU Rationalization

### Validations

- Actual SKU relationships: not proven. Suite detection is substring-based (`E5` or `EMS`), and security add-ons are substring hints.
- Assumed relationships: security SKU overlap is inferred whenever a suite and at least one security-like SKU are both assigned.
- Incomplete entitlement intelligence: there is no service-plan matrix, no Defender/Entra plan depth comparison, no policy usage evidence, no security admin approval, and no compliance exception model.

### Required hardening before live execution

- Require authoritative security SKU/service-plan overlap matrix.
- Require security policy, device, identity, and compliance dependency evidence.
- Require security owner approval and rollback proof.
- Remove placeholder savings floors from execution decisions.

## License Pool Recovery

### Additional risks

- Combines unused prepaid capacity with inactive-user reclaim into one recoverable number even though one may be renewal-only and the other may require user-level action.
- Does not exclude protected inactive users.
- Does not handle group-assigned license removal constraints.

### Required hardening before live execution

- Split renewal avoidance from user license removal.
- Attach contract reducibility and renewal date evidence.
- Exclude protected users and block group-assigned actions.

## Dormant Group Cleanup

### Additional risks

- Missing activity is treated as stale evidence.
- Display-name regex can be misleading.
- Owners may be represented differently from `ownerId`/`owners`.

### Required hardening before live execution

- Keep manual-review blocker.
- Add group type, membership count, app/resource dependencies, Teams/SharePoint backing resources, and last activity evidence before any deletion or archiving action.

## Risk audit conclusion

Certen should not enable live removal or destructive execution from these playbooks yet. Inactive-user reclaim may become execution-ready first after protected-user, assignment-type, and sign-in-missing controls are hardened. Entitlement-overlap playbooks require the largest hardening investment.
