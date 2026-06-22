// Program 14A — Database Tenant Isolation Verification Authority (api-server mirror).
//
// Mirrors the control-plane's database-tenant-isolation-verification-authority.ts
// model so both surfaces report identical, honest values. Direct successor to
// Program 13 (Tenant Isolation Verification Authority).
// Program 13 verified tenant isolation at the platform/route/domain level.
// This authority goes one layer deeper: it inspects the actual persistence
// code paths — repository classes, the generic createPersistenceStore<T>()
// pattern (api-server's Drizzle/Postgres + in-memory dual-mode stores),
// raw SQL/Drizzle query construction, route-to-repository tenant-context
// wiring, and audit/evidence stores — and reports an honest verdict per
// domain about whether one tenant can ever read, write, list, mutate,
// audit, or infer another tenant's data through a database-backed path.
//
// This is a verification/reporting layer ONLY. It does not implement new
// tenant enforcement, does not redesign the persistence layer, and does not
// fix the bugs it finds — it reports them as findings with file/symbol
// citations so they can be fixed deliberately, with full visibility.
//
// Honest-data bias (same as Program 13, made explicit at this deeper layer):
//   - A domain is VERIFIED only when (a) a real repository method scopes
//     every read/list/update/delete query by tenantId, (b) the route that
//     calls it derives tenantId from server-side auth context rather than
//     trusting a client-supplied value, AND (c) a test exists proving
//     cross-tenant access is denied. All three, or no VERIFIED.
//   - A domain backed ONLY by an in-memory store (no Drizzle/Postgres path)
//     is never reported as "database-verified" — it is classified UNKNOWN
//     or NOT_APPLICABLE with an explicit note that it is memory-only.
//   - A `tenantId` field/column existing is NOT evidence of isolation by
//     itself — every domain below is checked for whether queries actually
//     filter by it, not just whether the type has the field.
//   - Where scoping exists but cross-tenant denial is not test-proven, the
//     domain is PARTIAL, not VERIFIED.
//   - Where a lookup path exists with no tenant parameter at all (e.g. a
//     credential store keyed only by an opaque ref), the domain is FAILED.

// ─── Part 1 — Core Entity Types (per Program 14A spec) ─────────────────────

export type DatabaseTenantIsolationVerdict = 'VERIFIED' | 'PARTIAL' | 'UNKNOWN' | 'FAILED' | 'NOT_APPLICABLE'

export type DatabaseTenantIsolationEvidenceType =
  | 'REPOSITORY_SCOPE'
  | 'QUERY_FILTER'
  | 'WRITE_SCOPE'
  | 'READ_SCOPE'
  | 'LIST_SCOPE'
  | 'MUTATION_SCOPE'
  | 'DELETE_SCOPE'
  | 'AUDIT_SCOPE'
  | 'TEST_PROOF'
  | 'ROUTE_BOUNDARY'
  | 'PERSISTENCE_PROVIDER'
  | 'RAW_SQL_REVIEW'

export interface DatabaseTenantIsolationEvidence {
  id: string
  domain: string
  evidenceType: DatabaseTenantIsolationEvidenceType
  filePath: string
  symbol?: string
  description: string
  tenantScoped: boolean
  confidence: number
}

export interface DatabaseTenantIsolationFinding {
  id: string
  domain: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  verdict: DatabaseTenantIsolationVerdict
  title: string
  description: string
  affectedFiles: string[]
  remediation: string
}

export interface DatabaseTenantIsolationDomainResult {
  domain: string
  verdict: DatabaseTenantIsolationVerdict
  confidence: number
  evidence: DatabaseTenantIsolationEvidence[]
  findings: DatabaseTenantIsolationFinding[]
  testedOperations: {
    read: boolean
    list: boolean
    create: boolean
    update: boolean
    delete: boolean
    audit: boolean
  }
}

export interface DatabaseTenantIsolationAuthorityResult {
  authority: 'DATABASE_TENANT_ISOLATION_VERIFICATION'
  generatedAt: string
  platformVerdict: DatabaseTenantIsolationVerdict
  confidence: number
  domainResults: DatabaseTenantIsolationDomainResult[]
  criticalFindings: DatabaseTenantIsolationFinding[]
  summary: {
    verifiedDomains: number
    partialDomains: number
    unknownDomains: number
    failedDomains: number
    notApplicableDomains: number
  }
}

const GENERATED_AT = '2026-06-22T00:00:00.000Z'

function evidence(
  domain: string,
  id: string,
  evidenceType: DatabaseTenantIsolationEvidenceType,
  filePath: string,
  description: string,
  tenantScoped: boolean,
  confidence: number,
  symbol?: string,
): DatabaseTenantIsolationEvidence {
  return { id, domain, evidenceType, filePath, symbol, description, tenantScoped, confidence }
}

function finding(
  domain: string,
  id: string,
  severity: DatabaseTenantIsolationFinding['severity'],
  verdict: DatabaseTenantIsolationVerdict,
  title: string,
  description: string,
  affectedFiles: string[],
  remediation: string,
): DatabaseTenantIsolationFinding {
  return { id, domain, severity, verdict, title, description, affectedFiles, remediation }
}

// ─── Part 2 — Domain Registry ───────────────────────────────────────────────
// Real domains derived directly from repository inspection (api-server/src
// + lib/db), not a forced count. Each domain maps to a genuinely distinct
// persistence pattern or boundary that this audit could independently
// evaluate.

export const DATABASE_TENANT_ISOLATION_DOMAIN_IDS = [
  'core-persistence-stores',
  'route-to-repository-boundary',
  'm365-connector-snapshot-store',
  'connector-credential-store',
  'audit-ledger-tables',
  'evidence-registry-db',
  'raw-sql-query-construction',
  'cross-tenant-test-coverage',
] as const

export type DatabaseTenantIsolationDomainId = (typeof DATABASE_TENANT_ISOLATION_DOMAIN_IDS)[number]

const DOMAIN_NAMES: Record<DatabaseTenantIsolationDomainId, string> = {
  'core-persistence-stores': 'Core Persistence Stores (createPersistenceStore<T>)',
  'route-to-repository-boundary': 'Route-to-Repository Tenant Boundary',
  'm365-connector-snapshot-store': 'M365 Connector Snapshot Store',
  'connector-credential-store': 'Connector Credential / Token Store',
  'audit-ledger-tables': 'Audit & Outcome Ledger Tables (Drizzle/Postgres)',
  'evidence-registry-db': 'Evidence Registry Database Path',
  'raw-sql-query-construction': 'Raw SQL / Drizzle Query Construction Review',
  'cross-tenant-test-coverage': 'Cross-Tenant Database Test Coverage (Meta)',
}

// ─── Part 3 — Core Persistence Stores ───────────────────────────────────────
// Real evidence: 17 api-server modules (evidence-registry, financial-truth-
// authority, governed-execution, outcome-finance-reconciliation,
// value-realisation, workflow-value-graph, ai-value-attribution,
// ai-economics, ai-initiative-portfolio, ai-capital-allocation,
// ownership-intelligence, decision-authority, technology-commercial-
// authority, technology-portfolio-authority, live-tenant-readiness,
// connector-readiness, executive-proof-packs) all implement the same
// createPersistenceStore<T extends {id;tenantId}>() pattern: a
// MemoryPersistenceStore and a DatabasePersistenceStore, selected by
// `process.env.DATABASE_URL`. Every method (get/list/upsert/deleteTenant)
// takes tenantId as a required first parameter and the Database variant's
// Drizzle queries all include `eq(table.tenantId, t)` (verified directly by
// reading all 17 *-persistence.ts files — no exception found). This is
// real, structural read/list/write/delete scoping — but no test was found
// that runs the DatabasePersistenceStore variant against a live Postgres
// instance with two tenants and asserts cross-tenant denial (tests found
// only exercise the in-memory variant or check `instanceof` provider
// selection). Verdict: PARTIAL — strong structural evidence, incomplete
// behavioural proof against the actual DB-backed code path.

function verifyCorePersistenceStores(): DatabaseTenantIsolationDomainResult {
  const domain = 'core-persistence-stores'
  const ev: DatabaseTenantIsolationEvidence[] = [
    evidence(domain, 'cps-ev-1', 'REPOSITORY_SCOPE', 'src/lib/evidence-registry/evidence-registry-persistence.ts', 'MemoryPersistenceStore and DatabasePersistenceStore both key every row by `${tenantId}:${id}` (memory) or a tenant-qualified primary key (DB); get/list/upsert/deleteTenant all require tenantId as the first parameter.', true, 0.7, 'createPersistenceStore'),
    evidence(domain, 'cps-ev-2', 'QUERY_FILTER', 'src/lib/evidence-registry/evidence-registry-persistence.ts', 'DatabasePersistenceStore.list()/get()/deleteTenant() build Drizzle queries with `and(eq(table.tenantId, t), eq(table.collection, this.collection))` — every read/list/delete query is tenant-filtered at the SQL level.', true, 0.7, 'DatabasePersistenceStore'),
    evidence(domain, 'cps-ev-3', 'PERSISTENCE_PROVIDER', 'src/lib/evidence-registry/evidence-registry-persistence.ts', 'createPersistenceStore<T>() selects DatabasePersistenceStore when process.env.DATABASE_URL is set, else MemoryPersistenceStore — same pattern repeated identically across 17 modules (financial-truth-authority, governed-execution, outcome-finance-reconciliation, value-realisation, workflow-value-graph, ai-value-attribution, ai-economics, ai-initiative-portfolio, ai-capital-allocation, ownership-intelligence, decision-authority, technology-commercial-authority, technology-portfolio-authority, live-tenant-readiness, connector-readiness, executive-proof-packs).', true, 0.65, 'createPersistenceStore'),
    evidence(domain, 'cps-ev-4', 'TEST_PROOF', 'src/tests/evidence-registry-persistence.test.ts', 'evidence-registry-persistence.test.ts proves the provider switch (Memory when DATABASE_URL unset, Database when set) and that the Drizzle table has a tenantId column, but does NOT run a live query against a database and does NOT assert that two tenants\' rows are mutually invisible through DatabasePersistenceStore.get/list — the behavioural cross-tenant proof exists only for the in-memory variant.', false, 0.5, 'createPersistenceStore'),
    evidence(domain, 'cps-ev-5', 'RAW_SQL_REVIEW', 'src/lib/governed-execution/governed-execution-persistence.ts', 'Direct read of all 17 *-persistence.ts files found no list()/get()/deleteTenant() method that omits the tenantId equality filter — no raw, unscoped SELECT/DELETE was found in this pattern family.', true, 0.65),
  ]
  const findings: DatabaseTenantIsolationFinding[] = [
    finding(domain, 'cps-finding-1', 'MEDIUM', 'PARTIAL', 'DatabasePersistenceStore tenant scoping is structurally sound but not behaviourally tested against a real database', 'All 17 createPersistenceStore<T>() modules scope Drizzle queries by tenantId in code, but every test found exercises only the Memory variant or checks `instanceof` provider selection. No test runs against an actual Postgres connection with two distinct tenantIds and asserts DatabasePersistenceStore.list/get returns no cross-tenant rows.', ['src/lib/evidence-registry/evidence-registry-persistence.ts', 'src/tests/evidence-registry-persistence.test.ts'], 'Add an integration test (gated behind a real or test-container DATABASE_URL) that writes rows for two tenants via DatabasePersistenceStore and asserts list()/get() never cross tenant boundaries.'),
  ]
  return {
    domain,
    verdict: 'PARTIAL',
    confidence: 0.6,
    evidence: ev,
    findings,
    testedOperations: { read: true, list: true, create: true, update: false, delete: true, audit: false },
  }
}

// ─── Part 4 — Route-to-Repository Boundary ──────────────────────────────────
// Real evidence: requireTenantContext() (api-server/src/middleware/
// security-guards.ts) sets `req.tenantId` only after validating the
// requested tenantId against the authenticated session's tenantId (403
// TENANT_ACCESS_DENIED on mismatch, unless PLATFORM_ADMIN). Most routes
// (evidence-registry, financial-truth-authority, ownership-intelligence,
// outcome-finance-reconciliation, live-tenant-readiness, technology-
// commercial-authority) correctly spread `{...req.body, tenantId:
// tenant(req)}` — tenantId last, so the server-derived value always wins
// even if a client sends a conflicting tenantId in the body. However,
// governed-execution.ts's POST /plans handler spreads in the OPPOSITE
// order — `{tenantId: tenant(req), ...(req.body ?? {})}` — meaning a
// client-supplied `tenantId` in the request body silently OVERRIDES the
// server-derived value. This is a real, concrete cross-tenant write/read
// vector: a tenant A session can create an execution plan with
// `tenantId: "TENANT-B"` in the body and have it persisted under tenant
// B's key. Verdict: FAILED for this specific path; PARTIAL overall because
// the majority of routes get the order right.

function verifyRouteToRepositoryBoundary(): DatabaseTenantIsolationDomainResult {
  const domain = 'route-to-repository-boundary'
  const ev: DatabaseTenantIsolationEvidence[] = [
    evidence(domain, 'rtb-ev-1', 'ROUTE_BOUNDARY', 'src/middleware/security-guards.ts', 'requireTenantContext() sets `req.tenantId` only after validating that the requested tenantId matches `auth.tenantId` (derived server-side via buildAuthContextSync), rejecting mismatches with 403 TENANT_ACCESS_DENIED unless the caller is PLATFORM_ADMIN.', true, 0.75, 'requireTenantContext'),
    evidence(domain, 'rtb-ev-2', 'ROUTE_BOUNDARY', 'src/routes/evidence-registry.ts', 'tenant() helper reads `req.__authContext?.tenantId` first, with header/query/body fallbacks; write handlers build `{...req.body, tenantId: tenant(req)}` — tenantId spread LAST, so it cannot be overridden by a client-supplied tenantId in the body.', true, 0.65, 'tenant'),
    evidence(domain, 'rtb-ev-3', 'ROUTE_BOUNDARY', 'src/routes/financial-truth-authority.ts', 'Same safe ordering (`{...req.body, tenantId: tenant(req)}`) confirmed in financial-truth-authority.ts, ownership-intelligence.ts, outcome-finance-reconciliation.ts, live-tenant-readiness.ts and technology-commercial-authority.ts.', true, 0.65),
    evidence(domain, 'rtb-ev-4', 'ROUTE_BOUNDARY', 'src/routes/governed-execution.ts', 'POST /plans builds the create payload as `{tenantId: tenant(req), ...(req.body ?? {})}` — tenantId spread FIRST, so if req.body contains a `tenantId` field it silently overwrites the server-derived value before reaching GovernedExecutionService.createExecutionPlan(). A tenant A caller can write a plan under any tenantId of their choosing.', false, 0.8, 'router.post(\'/plans\')'),
    evidence(domain, 'rtb-ev-5', 'ROUTE_BOUNDARY', 'src/lib/microsoft-auth/microsoft-token-store.ts', 'EncryptedMicrosoftTokenStore.getConnection(credentialRef)/getTokenSet(credentialRef) take ONLY an opaque credentialRef, with no tenantId parameter anywhere in the class — any caller who obtains or guesses a credentialRef can decrypt and read that connection\'s OAuth tokens regardless of which tenant they are authenticated as. There is no tenant check at this layer at all.', false, 0.75),
  ]
  const findings: DatabaseTenantIsolationFinding[] = [
    finding(domain, 'rtb-finding-1', 'CRITICAL', 'FAILED', 'governed-execution.ts POST /plans lets a client-supplied body tenantId override the server-derived tenant', 'The execution-plan create payload is built as `{tenantId: tenant(req), ...(req.body ?? {})}`. Because `req.body` is spread after `tenantId`, any `tenantId` key present in the client-supplied JSON body silently replaces the trusted, auth-derived tenantId before the repository ever sees the request. This breaks the rule that routes must pass server-derived tenant context, not trust client-supplied tenant IDs.', ['src/routes/governed-execution.ts'], 'Change the payload construction to `{...(req.body ?? {}), tenantId: tenant(req)}` (or explicitly strip `tenantId` from req.body before merging) so the server-derived tenantId always wins, matching the safe pattern already used in evidence-registry.ts, financial-truth-authority.ts and outcome-finance-reconciliation.ts.'),
    finding(domain, 'rtb-finding-2', 'HIGH', 'FAILED', 'EncryptedMicrosoftTokenStore has no tenant scoping at the lookup-API level', 'getConnection()/getTokenSet()/revoke() are keyed only by credentialRef with no tenantId check. Encryption protects data at rest from a storage-level leak, but does not stop an authenticated caller from one tenant from decrypting another tenant\'s OAuth tokens if they can supply or guess a valid credentialRef. This is a real query path that can access data without tenant scope.', ['src/lib/microsoft-auth/microsoft-token-store.ts'], 'Add a tenantId parameter to getConnection/getTokenSet/revoke and verify it against the stored connection\'s tenantId before returning or decrypting any token payload, mirroring the explicit tenant checks used by M365SnapshotRepository.'),
  ]
  return {
    domain,
    verdict: 'FAILED',
    confidence: 0.7,
    evidence: ev,
    findings,
    testedOperations: { read: true, list: false, create: true, update: false, delete: false, audit: false },
  }
}

// ─── Part 5 — M365 Connector Snapshot Store ─────────────────────────────────
// Real evidence: M365SnapshotRepository is backed entirely by static
// in-process Maps (bundles, latestByTenant, runs) — there is no Drizzle
// table behind it and no `process.env.DATABASE_URL` branch. Per Rule 5
// ("Do not mark memory-store isolation as database isolation unless the
// domain ONLY has memory persistence"), this domain has ONLY memory
// persistence, so it is explicitly classified NOT_APPLICABLE to "database"
// tenant isolation rather than silently treated as DB-verified — even
// though, as Program 13 already found, the Map-keyed structure does give
// genuine in-memory isolation.

function verifyM365ConnectorSnapshotStore(): DatabaseTenantIsolationDomainResult {
  const domain = 'm365-connector-snapshot-store'
  const ev: DatabaseTenantIsolationEvidence[] = [
    evidence(domain, 'm365-ev-1', 'PERSISTENCE_PROVIDER', 'src/lib/connectors/m365/m365-snapshot-repository.ts', 'M365SnapshotRepository is backed entirely by static `Map<string, ...>` fields (bundles, latestByTenant, runs) with no Drizzle table, no DATABASE_URL branch and no createPersistenceStore() call — this is memory-only persistence, not a database path, and clearForTests() simply resets the static Maps.', true, 0.85, 'M365SnapshotRepository'),
    evidence(domain, 'm365-ev-2', 'READ_SCOPE', 'src/lib/connectors/m365/m365-snapshot-repository.ts', 'getLatest(tenantId)/listRuns(tenantId)/listUsers(tenantId) all resolve through `latestByTenant.get(tenantId)` — genuine structural isolation for the in-memory representation, consistent with Program 13\'s prior finding for this same file.', true, 0.7, 'getLatest'),
  ]
  const findings: DatabaseTenantIsolationFinding[] = [
    finding(domain, 'm365-finding-1', 'MEDIUM', 'NOT_APPLICABLE', 'M365 discovery snapshots have no database persistence to verify', 'M365SnapshotRepository never touches lib/db or Drizzle; all data lives in process memory and is lost on restart. This domain is correctly reported NOT_APPLICABLE to database tenant isolation rather than VERIFIED, per the explicit rule against treating memory-store isolation as database isolation.', ['src/lib/connectors/m365/m365-snapshot-repository.ts'], 'If M365 discovery snapshots need durable, tenant-isolated storage, migrate this repository onto the same createPersistenceStore<T>() pattern used by evidence-registry/financial-truth-authority, backed by a Drizzle table with a tenantId column and indexes, then re-evaluate this domain.'),
  ]
  return {
    domain,
    verdict: 'NOT_APPLICABLE',
    confidence: 0.8,
    evidence: ev,
    findings,
    testedOperations: { read: true, list: true, create: true, update: false, delete: false, audit: false },
  }
}

// ─── Part 6 — Connector Credential / Token Store ────────────────────────────
// Already partially covered under route-to-repository-boundary (rtb-ev-5),
// reported as its own domain because it is a distinct persistence
// component (encrypted-at-rest, in-memory Map) with its own FAILED-grade
// isolation gap at the lookup-API level, independent of any route issue.

function verifyConnectorCredentialStore(): DatabaseTenantIsolationDomainResult {
  const domain = 'connector-credential-store'
  const ev: DatabaseTenantIsolationEvidence[] = [
    evidence(domain, 'ccs-ev-1', 'PERSISTENCE_PROVIDER', 'src/lib/microsoft-auth/microsoft-token-store.ts', 'EncryptedMicrosoftTokenStore is an in-memory `Map<string, StoredMicrosoftCredential>` keyed by credentialRef — no Drizzle table, no DATABASE_URL branch.', true, 0.8, 'EncryptedMicrosoftTokenStore'),
    evidence(domain, 'ccs-ev-2', 'READ_SCOPE', 'src/lib/microsoft-auth/microsoft-token-store.ts', 'getConnection(credentialRef) and getTokenSet(credentialRef) accept no tenantId argument at all and perform no tenant comparison before decrypting and returning the stored token payload — the only secrecy boundary is "do you know the credentialRef", not "are you the owning tenant".', false, 0.75, 'getTokenSet'),
    evidence(domain, 'ccs-ev-3', 'MUTATION_SCOPE', 'src/lib/microsoft-auth/microsoft-token-store.ts', 'updateStatus(credentialRef, ...) and revoke(credentialRef) similarly have no tenant check — any caller who can reach these methods with a valid credentialRef can revoke or mutate another tenant\'s connector credential.', false, 0.7, 'updateStatus'),
  ]
  const findings: DatabaseTenantIsolationFinding[] = [
    finding(domain, 'ccs-finding-1', 'HIGH', 'FAILED', 'No tenant scoping at all in the connector credential store API', 'AES-256-GCM encryption protects the token payload from a passive storage leak, but every method in EncryptedMicrosoftTokenStore is reachable with just a credentialRef and performs no tenantId check, so cross-tenant read/mutate/revoke is possible at the store API itself if a credentialRef is known or guessable by a calling code path.', ['src/lib/microsoft-auth/microsoft-token-store.ts'], 'Require tenantId on every method and verify it against `connection.tenantId` (already present on MicrosoftOAuthConnection) before returning or mutating any record; add a test proving tenant B cannot read/revoke a credentialRef created under tenant A.'),
  ]
  return {
    domain,
    verdict: 'FAILED',
    confidence: 0.75,
    evidence: ev,
    findings,
    testedOperations: { read: true, list: false, create: true, update: true, delete: true, audit: false },
  }
}

// ─── Part 7 — Audit & Outcome Ledger Tables ─────────────────────────────────
// Real evidence: lib/db/src/schema/auditEvents.ts and outcomeLedger.ts
// define genuine Drizzle/Postgres tables with `tenantId: text('tenant_id')
// .notNull()` columns. This proves the schema is tenant-aware, but no
// repository/query-layer code path or test was found in this audit that
// reads these specific tables back out filtered by tenantId (unlike the
// createPersistenceStore<T> family, which was directly verified end to
// end). A column existing is not query-level proof — per the spec's
// explicit rule, a tenantId field alone must not be reported VERIFIED.

function verifyAuditLedgerTables(): DatabaseTenantIsolationDomainResult {
  const domain = 'audit-ledger-tables'
  const ev: DatabaseTenantIsolationEvidence[] = [
    evidence(domain, 'alt-ev-1', 'WRITE_SCOPE', 'lib/db/src/schema/auditEvents.ts', 'auditEvents Drizzle table defines `tenantId: text(\'tenant_id\').notNull()` — every audit event row is required to carry a tenant identifier at the schema level.', true, 0.55, 'auditEvents'),
    evidence(domain, 'alt-ev-2', 'WRITE_SCOPE', 'lib/db/src/schema/outcomeLedger.ts', 'outcomeLedger Drizzle table defines `tenantId: text("tenant_id").notNull().default("default")` — note the default("default") fallback means a row CAN be written without an explicit tenantId and will silently land in a shared "default" tenant bucket if the application layer fails to pass one.', true, 0.5, 'outcomeLedger'),
    evidence(domain, 'alt-ev-3', 'AUDIT_SCOPE', 'lib/db/src/schema/auditEvents.ts', 'No repository class, query helper, or route handler reading from auditEventsTable with a tenantId filter was found in this audit — the column exists in the schema but no corresponding tenant-scoped read/list query was located, so per-tenant audit isolation at the query layer is UNVERIFIED, not just unproven.', false, 0.4),
  ]
  const findings: DatabaseTenantIsolationFinding[] = [
    finding(domain, 'alt-finding-1', 'HIGH', 'UNKNOWN', 'Audit and outcome-ledger tables have a tenantId column but no verified tenant-scoped query path', 'A tenantId column existing on auditEvents/outcomeLedger is necessary but not sufficient evidence of isolation — no reader/repository code was found in this audit that actually filters these tables by tenantId, and outcomeLedger\'s `default("default")` fallback is a real risk of silent cross-tenant bucketing if a write path omits tenantId.', ['lib/db/src/schema/auditEvents.ts', 'lib/db/src/schema/outcomeLedger.ts'], 'Locate or build the repository/query layer for these tables, confirm every read filters by tenantId, remove the `default("default")` fallback on outcomeLedger.tenantId (require it explicitly), and add a cross-tenant test before any VERIFIED claim is made.'),
  ]
  return {
    domain,
    verdict: 'UNKNOWN',
    confidence: 0.35,
    evidence: ev,
    findings,
    testedOperations: { read: false, list: false, create: false, update: false, delete: false, audit: false },
  }
}

// ─── Part 8 — Evidence Registry Database Path ───────────────────────────────
// The strongest single domain in this audit: evidence-registry has both a
// real Drizzle table (evidenceRegistryRecordsTable, lib/db/src/schema/
// evidenceRegistry.ts) with a composite tenant+collection+record unique
// index, AND a direct test (evidence-registry-persistence.test.ts) that
// asserts the table has a tenantId column and that the provider switch
// (Memory vs Database) works. Reported as its own domain (separate from
// the generic core-persistence-stores rollup) because it is the one module
// in this family with a dedicated persistence-level test file, making it
// the closest any domain gets to a "VERIFIED" bar — but it still falls
// short because the test never proves cross-tenant denial against the live
// Database-backed query path, only that the schema/wiring exists.

function verifyEvidenceRegistryDb(): DatabaseTenantIsolationDomainResult {
  const domain = 'evidence-registry-db'
  const ev: DatabaseTenantIsolationEvidence[] = [
    evidence(domain, 'erd-ev-1', 'QUERY_FILTER', 'lib/db/src/schema/evidenceRegistry.ts', 'evidenceRegistryRecordsTable defines a composite unique index `tenantCollectionRecordIdx` on (tenantId, collection, recordId) and a secondary index `tenantCollectionIdx` on (tenantId, collection) — the schema is purpose-built for tenant-scoped lookups, not just a passive column.', true, 0.6, 'evidenceRegistryRecordsTable'),
    evidence(domain, 'erd-ev-2', 'REPOSITORY_SCOPE', 'src/lib/evidence-registry/evidence-registry-repository.ts', 'EvidenceRegistryRepository.getEvidenceRecord/listEvidenceRecords/listArtifacts/listEvidenceLinks/listProvenanceEvents/listLifecycleEvents/listRetentionPolicies/listRedactionRecords/listExportMarkers/listSnapshots ALL take tenantId as their first parameter and delegate to the tenant-scoped persistence store — there is no method on this repository that can list or get a record without supplying a tenant.', true, 0.65, 'EvidenceRegistryRepository'),
    evidence(domain, 'erd-ev-3', 'DELETE_SCOPE', 'src/lib/evidence-registry/evidence-registry-repository.ts', 'deleteTenantEvidenceData(tenantId) calls `s.deleteTenant(t)` across every store, and the underlying DatabasePersistenceStore.deleteTenant() issues `DELETE ... WHERE tenantId = t AND collection = c` — a real, tenant-scoped delete path.', true, 0.6, 'deleteTenantEvidenceData'),
    evidence(domain, 'erd-ev-4', 'TEST_PROOF', 'src/tests/evidence-registry-persistence.test.ts', 'Confirms `evidenceRegistryRecordsTable.tenantId` exists and that createPersistenceStore() returns the Database variant when DATABASE_URL is set — but does NOT open a real connection or insert/query two tenants\' rows, so the cross-tenant DENIAL behaviour of the live SQL path remains unproven.', false, 0.45),
  ]
  const findings: DatabaseTenantIsolationFinding[] = [
    finding(domain, 'erd-finding-1', 'MEDIUM', 'PARTIAL', 'Evidence registry has the strongest schema/repository evidence in the audit, but lacks a live cross-tenant database test', 'Schema indexes, repository method signatures and the provider-switch test are all real and tenant-aware, but no test in the repository actually proves that, against a live Postgres connection, tenant B cannot read/list/delete tenant A\'s evidence records. Per the evidence quality bar, VERIFIED requires a test proving cross-tenant denial against the real path — that specific test does not yet exist.', ['src/lib/evidence-registry/evidence-registry-repository.ts', 'lib/db/src/schema/evidenceRegistry.ts'], 'Add an integration test that runs against a real or containerized Postgres instance, inserts evidence records for two tenants via EvidenceRegistryRepository, and asserts getEvidenceRecord/listEvidenceRecords/deleteTenantEvidenceData never cross tenant boundaries.'),
  ]
  return {
    domain,
    verdict: 'PARTIAL',
    confidence: 0.6,
    evidence: ev,
    findings,
    testedOperations: { read: true, list: true, create: true, update: true, delete: true, audit: false },
  }
}

// ─── Part 9 — Raw SQL / Drizzle Query Construction Review ──────────────────
// A direct, file-by-file review of every *-persistence.ts file implementing
// the DatabasePersistenceStore pattern (17 modules) for any query that
// might bypass tenant filtering. None were found with an unscoped
// SELECT/UPDATE/DELETE; size() intentionally counts across ALL tenants for
// a given collection (used for operational metrics, not tenant-facing
// reads) which is a deliberate, reviewed design choice, not a leak — it is
// flagged here for visibility, not as a finding, since it does not return
// row-level data, only a count.

function verifyRawSqlQueryConstruction(): DatabaseTenantIsolationDomainResult {
  const domain = 'raw-sql-query-construction'
  const ev: DatabaseTenantIsolationEvidence[] = [
    evidence(domain, 'rsq-ev-1', 'RAW_SQL_REVIEW', 'src/lib/evidence-registry/evidence-registry-persistence.ts', 'DatabasePersistenceStore.get/list/deleteTenant all build their Drizzle `.where()` clause with `and(eq(table.tenantId, t), eq(table.collection, this.collection))` — reviewed directly, no unscoped read/delete found.', true, 0.6),
    evidence(domain, 'rsq-ev-2', 'RAW_SQL_REVIEW', 'src/lib/financial-truth-authority/financial-truth-persistence.ts', 'Same and(eq(tenantId,t), eq(collection,c)) pattern confirmed; reviewed across all 17 *-persistence.ts files (financial-truth-authority, governed-execution, outcome-finance-reconciliation, value-realisation, workflow-value-graph, ai-value-attribution, ai-economics, ai-initiative-portfolio, ai-capital-allocation, ownership-intelligence, decision-authority, technology-commercial-authority, technology-portfolio-authority, live-tenant-readiness, connector-readiness, executive-proof-packs, evidence-registry) — no exception found.', true, 0.6),
    evidence(domain, 'rsq-ev-3', 'RAW_SQL_REVIEW', 'src/lib/evidence-registry/evidence-registry-persistence.ts', 'DatabasePersistenceStore.size() intentionally queries `eq(table.collection, this.collection)` WITHOUT a tenantId filter, returning a cross-tenant row count for operational metrics (collectionStatus()) — this is a deliberate aggregate count, not a row-level cross-tenant read, but is noted explicitly rather than silently passed over.', false, 0.5, 'size'),
    evidence(domain, 'rsq-ev-4', 'RAW_SQL_REVIEW', 'lib/db/src/schema/outcomeLedger.ts', 'outcomeLedger schema\'s tenantId default("default") means a write path that forgets to pass tenantId will not error — it will silently succeed into a shared bucket. This is a query-construction-adjacent risk: there is no NOT NULL-without-default constraint forcing callers to be explicit.', false, 0.45),
  ]
  const findings: DatabaseTenantIsolationFinding[] = [
    finding(domain, 'rsq-finding-1', 'LOW', 'PARTIAL', 'Aggregate size()/collectionStatus() counts are cross-tenant by design and not row-level data, but are worth tracking', 'DatabasePersistenceStore.size() omits the tenantId filter on purpose to support operational/ops dashboards (collectionStatus()). It returns only a number, not tenant-identifiable rows, so it is not a tenant-isolation breach, but it is flagged here so a future contributor does not assume size()/collectionStatus() is per-tenant.', ['src/lib/evidence-registry/evidence-registry-persistence.ts'], 'Document size()/collectionStatus() explicitly as platform-wide (not tenant-scoped) in code comments and in any place these metrics are surfaced to end users, to avoid a future regression where someone assumes per-tenant scoping.'),
  ]
  return {
    domain,
    verdict: 'PARTIAL',
    confidence: 0.6,
    evidence: ev,
    findings,
    testedOperations: { read: true, list: true, create: false, update: false, delete: true, audit: false },
  }
}

// ─── Part 10 — Cross-Tenant Database Test Coverage (Meta) ──────────────────
// A meta-domain answering: does the test suite actually prove cross-tenant
// denial against real persistence code, or only against in-memory helpers?
// Program 13 already found that most "tenant isolation" test files
// (tenant-isolation-v2/v3, scale-tenant-isolation-pressure, historical-
// tenant-isolation-replay) exercise in-memory array-filtering helpers, not
// real repositories. This audit's own review of *-persistence.test.ts files
// confirms the same pattern one layer deeper: real behavioural coverage
// exists for the in-memory store variant, but no test in the repository
// exercises DatabasePersistenceStore against a live database with two
// tenants. This program's own tests (added below) are the first to assert
// cross-tenant denial directly against MemoryPersistenceStore-shaped logic
// and to add meta-tests guarding the honesty of this very authority.

function verifyCrossTenantTestCoverage(): DatabaseTenantIsolationDomainResult {
  const domain = 'cross-tenant-test-coverage'
  const ev: DatabaseTenantIsolationEvidence[] = [
    evidence(domain, 'ctc-ev-1', 'TEST_PROOF', 'src/tests/evidence-registry-persistence.test.ts', 'Confirms provider selection (Memory vs Database) and schema column existence, but not cross-tenant denial against a live database.', false, 0.45),
    evidence(domain, 'ctc-ev-2', 'TEST_PROOF', 'src/tests/economic-operations-tenant-isolation.test.ts', 'Real behavioural cross-tenant test against EconomicOperationsIntentService (an in-memory service, not a Drizzle-backed repository) — strong proof for that service, but not evidence about the database-backed persistence stores audited by this program.', true, 0.5),
    evidence(domain, 'ctc-ev-3', 'TEST_PROOF', 'src/lib/databaseTenantIsolation_or_equivalent', 'No pre-existing test in the repository was found that creates rows for two tenants via a DatabasePersistenceStore-backed repository and asserts list()/get() denial — this program adds the first such tests against the in-memory MemoryPersistenceStore-equivalent logic exercised directly in this authority\'s own test file, and documents the live-database gap as a finding rather than fabricating DB coverage.', false, 0.4),
  ]
  const findings: DatabaseTenantIsolationFinding[] = [
    finding(domain, 'ctc-finding-1', 'HIGH', 'UNKNOWN', 'No test in the repository proves cross-tenant denial against a live Postgres-backed persistence store', 'Every cross-tenant test found in api-server/src/tests (tenant-isolation-v2/v3, scale-tenant-isolation-pressure, historical-tenant-isolation-replay, economic-operations-tenant-isolation) exercises an in-memory data structure, not a real Drizzle/Postgres query path. This program\'s own added tests close part of this gap for the createPersistenceStore<T> in-memory variant, but the live-database variant remains genuinely untested in this codebase.', ['src/tests/evidence-registry-persistence.test.ts'], 'Stand up a test database (or test-container) in CI and add at least one integration test per persistence family proving DatabasePersistenceStore enforces tenant isolation against a real connection, not just the in-memory fallback.'),
  ]
  return {
    domain,
    verdict: 'UNKNOWN',
    confidence: 0.4,
    evidence: ev,
    findings,
    testedOperations: { read: false, list: false, create: false, update: false, delete: false, audit: false },
  }
}

// ─── Part 11 — Domain Registry Assembly ─────────────────────────────────────

const DOMAIN_VERIFIERS: Record<DatabaseTenantIsolationDomainId, () => DatabaseTenantIsolationDomainResult> = {
  'core-persistence-stores': verifyCorePersistenceStores,
  'route-to-repository-boundary': verifyRouteToRepositoryBoundary,
  'm365-connector-snapshot-store': verifyM365ConnectorSnapshotStore,
  'connector-credential-store': verifyConnectorCredentialStore,
  'audit-ledger-tables': verifyAuditLedgerTables,
  'evidence-registry-db': verifyEvidenceRegistryDb,
  'raw-sql-query-construction': verifyRawSqlQueryConstruction,
  'cross-tenant-test-coverage': verifyCrossTenantTestCoverage,
}

export function buildDatabaseTenantIsolationDomainResults(): DatabaseTenantIsolationDomainResult[] {
  return DATABASE_TENANT_ISOLATION_DOMAIN_IDS.map((id) => DOMAIN_VERIFIERS[id]())
}

// ─── Part 12 — Platform Verdict & Summary ───────────────────────────────────
// Platform-level verdict rules (deliberately conservative): if ANY domain is
// FAILED, the platform verdict is FAILED (a single proven unscoped or
// override-able path means the platform cannot claim isolation). Otherwise
// if any domain is UNKNOWN, the platform verdict is UNKNOWN (insufficient
// evidence to claim anything stronger). Otherwise if any domain is PARTIAL,
// platform verdict is PARTIAL. VERIFIED only if every domain is VERIFIED or
// NOT_APPLICABLE.

function platformVerdictFrom(domains: DatabaseTenantIsolationDomainResult[]): DatabaseTenantIsolationVerdict {
  if (domains.some((d) => d.verdict === 'FAILED')) return 'FAILED'
  if (domains.some((d) => d.verdict === 'UNKNOWN')) return 'UNKNOWN'
  if (domains.some((d) => d.verdict === 'PARTIAL')) return 'PARTIAL'
  const relevant = domains.filter((d) => d.verdict !== 'NOT_APPLICABLE')
  if (relevant.length > 0 && relevant.every((d) => d.verdict === 'VERIFIED')) return 'VERIFIED'
  return 'UNKNOWN'
}

function summaryFrom(domains: DatabaseTenantIsolationDomainResult[]): DatabaseTenantIsolationAuthorityResult['summary'] {
  return {
    verifiedDomains: domains.filter((d) => d.verdict === 'VERIFIED').length,
    partialDomains: domains.filter((d) => d.verdict === 'PARTIAL').length,
    unknownDomains: domains.filter((d) => d.verdict === 'UNKNOWN').length,
    failedDomains: domains.filter((d) => d.verdict === 'FAILED').length,
    notApplicableDomains: domains.filter((d) => d.verdict === 'NOT_APPLICABLE').length,
  }
}

export function getDatabaseTenantIsolationAuthority(): DatabaseTenantIsolationAuthorityResult {
  const domainResults = buildDatabaseTenantIsolationDomainResults()
  const criticalFindings = domainResults.flatMap((d) => d.findings).filter((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH')
  const confidenceValues = domainResults.map((d) => d.confidence)
  const confidence = confidenceValues.length > 0 ? Math.round((confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length) * 100) / 100 : 0
  return {
    authority: 'DATABASE_TENANT_ISOLATION_VERIFICATION',
    generatedAt: GENERATED_AT,
    platformVerdict: platformVerdictFrom(domainResults),
    confidence,
    domainResults,
    criticalFindings,
    summary: summaryFrom(domainResults),
  }
}
