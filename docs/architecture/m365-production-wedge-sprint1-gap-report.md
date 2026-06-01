# M365 Production Wedge Sprint 1 Gap Report


## Official Microsoft Graph references applied

- Microsoft Graph permissions reference for application permission assumptions: https://learn.microsoft.com/en-us/graph/permissions-reference
- `user: licenseDetails` for direct and group-transitive license details: https://learn.microsoft.com/en-us/graph/api/user-list-licensedetails?view=graph-rest-1.0
- `getOffice365ActiveUserDetail` Reports API and `Reports.Read.All`: https://learn.microsoft.com/en-us/graph/api/reportroot-getoffice365activeuserdetail?view=graph-rest-1.0
- `getMailboxUsageDetail` Reports API and `Reports.Read.All`: https://learn.microsoft.com/en-us/graph/api/reportroot-getmailboxusagedetail?view=graph-rest-1.0
- `signInActivity` user property: https://learn.microsoft.com/en-us/graph/api/resources/signinactivity?view=graph-rest-1.0
- `assignLicense` is a POST mutation endpoint and is explicitly excluded from Sprint 1 production connector paths: https://learn.microsoft.com/en-us/graph/api/user-assignlicense?view=graph-rest-1.0

## 1. Existing connector components reused

- Reused the existing `/api/connectors/m365/*` route ownership rather than adding a second connector API.
- Reused the existing client-credentials Graph token path and existing permission environment inventory while adding a stricter production readiness report.
- Reused existing read-only Graph client concepts and kept the existing guarded `assignLicense` write client outside the Sprint 1 connector path.
- Reused existing connector hub, runtime health, and data trust UI surfaces rather than adding a new dashboard.

## 2. Auth/readiness coverage

- Readiness validates required read permissions: `User.Read.All`, `Directory.Read.All`, `Organization.Read.All`, `AuditLog.Read.All`, and `Reports.Read.All`.
- Token failures, missing config, missing read permissions, and Graph reachability failures fail closed.
- Future write readiness is reported separately from read readiness and does not block read-only discovery.
- `Directory.ReadWrite.All` / `User.ReadWrite.All` are not required for this sprint and remain execution-readiness signals only.

## 3. Discovery coverage

- Discovery performs read-only organization, subscribed SKU, user/sign-in, bounded per-user `licenseDetails`, active-user report, mailbox-usage report, and group reads.
- User and license failures fail discovery; Reports API failures produce partial discovery and degrade trust.
- Discovery is bounded by `maxUsers`/`perPage` to avoid runaway per-user license detail calls.

## 4. Persistence coverage

- Sprint 1 adds a tenant-scoped in-memory/dev snapshot repository for canonical tenant snapshots, users, license assignments, SKUs, usage records, mailboxes, groups, and discovery runs.
- Durable DB tables for full snapshot-scoped M365 entities remain a Sprint 2 blocker. Existing DB tables continue to support legacy/read-only evidence paths.

## 5. Trust dimension coverage

- M365 trust now reports identity, license, usage, activity, mailbox, and execution-safety dimensions.
- Every dimension returns a score, band, and reasons.
- Execution safety remains `LOW_CONFIDENCE` unless future write readiness and rollback proof are available.

## 6. Health coverage

- M365 health now includes auth, permissions, users read, licenses read, usage reports read, mailbox reports read, freshness, and rate-limit-risk dimensions.
- Missing config returns `NOT_CONFIGURED`; token or Graph failures return `FAILED`; no/stale snapshot returns `DEGRADED`; missing reports return `PARTIAL`/degraded trust.

## 7. UI/live coverage

- Connector Hub calls production M365 readiness, health, trust, and latest-snapshot endpoints in live mode with no demo fallback.
- Connector Hub exposes Check readiness, Run discovery, View trust-report details, latest sync, blockers, and warnings.
- Runtime Health shows an M365 Connector component with auth, permissions, discovery, freshness, trust, and rate-limit dimensions.
- Data Trust includes M365 dimension-level trust when live trust data is available.

## 8. Explicit no-mutation proof

- No new Graph write method was added.
- Discovery uses only GET/read endpoints.
- No approval creation, execution request creation, recommendation creation, or Opportunity Factory promotion is performed by the Sprint 1 production connector path.
- The existing `assignLicense` write client remains guarded and is not referenced by the new readiness/discovery/health/trust services.

## 9. Remaining gaps for Sprint 2

1. Add durable DB schemas for `m365_tenant_snapshots`, `m365_license_assignments`, `m365_subscribed_skus`, `m365_usage_records`, `m365_mailboxes`, and `m365_discovery_runs`.
2. Add encrypted connector-secret retrieval instead of direct environment variable fallback.
3. Add source-specific report download retention and evidence-pack linkage.
4. Add deeper admin/service/shared mailbox detection using directory roles and mailbox recipient data.
5. Add production run scheduling, retry budgets, and operator review workflows.

## 10. Production risks

- Microsoft Graph Reports APIs return CSV download redirects and can lag behind real time.
- Large tenants require careful concurrency/rate limiting for per-user `licenseDetails` calls.
- Permission inventory from environment variables must be replaced with verified service-principal grant inspection before production rollout.
- Durable persistence and encrypted secret storage are required before the connector can be considered production complete.
