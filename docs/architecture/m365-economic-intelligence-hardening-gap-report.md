# M365 Economic Intelligence Hardening Gap Report

Date: 2026-06-01

## 1. Audit findings addressed

- Added deterministic production-intelligence metadata to M365 playbook candidates and Opportunity Factory payloads: evidence quality, savings confidence, execution safety, false-positive risk, human-review requirement, allowed next step, and production readiness.
- Added explicit SKU cost authority so hardcoded estimates remain LOW confidence and unknown costs block execution-grade readiness.
- Added an entitlement matrix so duplicate-license and security-SKU opportunities no longer rely on SKU-name overlap alone.
- Added evidence scoring and execution-safety classification so missing usage, missing cost, protected accounts, group-assigned licenses, and insufficient trust cannot become approval-ready.
- Updated opportunity mapping so M365 playbooks do not emit `ELIGIBLE` readiness in this sprint.

## 2. SKU cost authority coverage

The v1 SKU cost authority supports CONTRACT, INVOICE, TENANT_PRICE, CATALOG, ESTIMATED, and UNKNOWN sources. CONTRACT and INVOICE map to HIGH confidence, configured catalog values map to MEDIUM, legacy/static estimates map to LOW, and unknown SKU costs map to UNKNOWN. The test fixture table covers M365_E5, M365_E3, POWER_BI_PRO, COPILOT, TEAMS_PHONE, DEFENDER, ENTRA_PREMIUM, and EXCHANGE_ARCHIVE.

## 3. Entitlement matrix coverage

The v1 entitlement matrix is intentionally minimal. It explicitly models E5-to-E3-like suite inclusion and medium-confidence overlap review for Power BI Pro, Defender, and Entra/AAD examples. Unknown relationships default to UNKNOWN/LOW and cannot become approval-ready.

## 4. Playbooks hardened

All seven existing M365 playbooks now flow through the existing framework and attach economic assessment metadata before Opportunity Factory persistence:

1. Inactive User Reclaim
2. License Pool Recovery
3. Copilot Rightsizing
4. Shared Mailbox Conversion
5. Duplicate License Detection
6. Dormant Group Cleanup
7. Security SKU Rationalization

## 5. Playbooks still not execution-ready

- Copilot Rightsizing remains review-required because generic M365 usage is not direct Copilot execution permission.
- Shared Mailbox Conversion remains review-required or blocked because mailbox owner, storage, archive, and compliance proof are still required before conversion.
- Duplicate License Detection remains review-required because entitlement matrix v1 is intentionally conservative.
- Security SKU Rationalization remains not ready because security posture and policy dependency evidence are not yet authoritative.
- Dormant Group Cleanup remains review-only.
- License Pool Recovery remains show-opportunity only because it mixes renewal economics and reclaim signals.

## 6. Readiness by playbook

| Playbook | Current maximum readiness | Reason |
| --- | --- | --- |
| Inactive User Reclaim | READY_FOR_APPROVAL only after HIGH/TRUSTED trust, direct/known assignment, non-protected account, adequate evidence, and HIGH/MEDIUM savings confidence | Narrow candidate for Sprint 3 approval flow. |
| License Pool Recovery | NEEDS_HARDENING / SHOW_OPPORTUNITY | Contract reducibility and assignment action are not proven. |
| Copilot Rightsizing | NEEDS_HARDENING / REVIEW_ONLY | Direct Copilot usage and policy approval are still missing. |
| Shared Mailbox Conversion | NEEDS_HARDENING or NOT_READY | Conversion eligibility evidence remains incomplete. |
| Duplicate License Detection | NEEDS_HARDENING / REVIEW_ONLY | Entitlement overlap requires explicit matrix confidence and human review. |
| Dormant Group Cleanup | NEEDS_HARDENING / REVIEW_ONLY | No license execution path. |
| Security SKU Rationalization | NOT_READY / REVIEW_ONLY | Security dependency and policy-owner review are mandatory. |

## 7. Remaining Sprint 3 blockers

- No live Microsoft Graph `assignLicense` mutation should be enabled until a separate execution sprint proves approval, dry-run, rollback, outcome proof, and tenant-write controls.
- Tenant-specific pricing and contract reducibility must be integrated before savings can be treated as execution-grade.
- Group-assigned license action semantics must be explicitly governed.
- Protected-account detection must be expanded with privileged role and break-glass evidence.
- Direct Copilot usage, mailbox compliance/owner evidence, and authoritative Microsoft service-plan intelligence remain required for broader execution.

## 8. Recommended Sprint 3 execution scope

Sprint 3 should start with a narrow inactive-user reclaim approval path only. The candidate must be a non-protected enabled member user, inactive for more than 90 days with conservative sign-in/usage evidence, directly removable or assignment-known license, HIGH/TRUSTED trust dimensions, HIGH/MEDIUM savings confidence, and a complete evidence pack. All other M365 playbooks should remain review-only or show-opportunity until their blockers are resolved.
