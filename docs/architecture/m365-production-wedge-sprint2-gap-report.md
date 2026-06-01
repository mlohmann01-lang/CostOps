# M365 Production Wedge Sprint 2 Gap Report

## Playbooks built

- Inactive User Reclaim detects licensed, inactive users over 90 days while excluding admin, service-account, shared-mailbox, and no-reply candidates.
- License Pool Recovery detects unused purchased capacity and licenses assigned to inactive users.
- Copilot Utilization Rightsizing detects Copilot assignments with high/medium/low/no usage bands and emits remove/reassign/review opportunities.
- Shared Mailbox Conversion detects generic or shared licensed mailboxes such as `info@`, `support@`, `sales@`, and `accounts@`.
- Duplicate License Detection flags E5 plus redundant add-ons such as Power BI Pro, Defender, Entra, or other overlap candidates.
- Dormant Group Cleanup detects ownerless/stale groups and emits manual-review cleanup candidates.
- Security SKU Rationalization detects suite licensing plus overlapping security/identity add-ons.

## Coverage

- All playbooks read only from the canonical M365 snapshot repository created by Sprint 1.
- Candidate evidence includes snapshot, user, license, usage, mailbox, SKU, and group references where available.
- Savings use the M365 SKU pricing helper; unknown costs fall back to `LOW_CONFIDENCE_COST` and lower confidence.
- Playbooks emit candidates only. They do not create recommendations, approvals, execution requests, or Graph mutations.

## Opportunity generation

- `M365OpportunityProvider` is registered with the Opportunity Factory.
- The provider runs all M365 playbooks, applies M365 trust gating, converts candidates into raw Opportunity Factory payloads, and returns them to the factory.
- Canonical opportunities use `source = M365_PLAYBOOK` and flow through Opportunity Factory normalization, dedupe, persistence, Opportunity Store, and Executive Prioritization.
- No direct Opportunity Store writes occur in the playbooks or provider.

## Remaining execution gaps

- Live license execution remains disabled.
- No `assignLicense` call is added or reachable through the Sprint 2 playbook path.
- Rollback evidence and governed one-user/one-license execution proof are deferred to Sprint 3.

## Remaining verification gaps

- Savings remain projected until later execution and verification stages produce outcome proof.
- Mailbox/group activity coverage depends on available Microsoft Graph Reports evidence.
- SKU overlap logic is rules-based and should be refined against tenant-specific license bundles before high-confidence automation.

## Sprint 3 prerequisites

1. Durable M365 snapshot persistence.
2. Operator review for low-confidence cost and manual-only group/mailbox opportunities.
3. Approval Authority linkage from prioritized M365 opportunities.
4. Controlled one-user, one-license governed execution validation.
5. Outcome Proof projection from verified M365 execution results.
