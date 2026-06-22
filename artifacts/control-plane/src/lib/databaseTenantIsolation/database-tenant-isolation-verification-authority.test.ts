import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  DATABASE_TENANT_ISOLATION_DOMAIN_IDS,
  buildDatabaseTenantIsolationDomainResults,
  getDatabaseTenantIsolationAuthority,
} from './database-tenant-isolation-verification-authority'

// ─── Domain registry ────────────────────────────────────────────────────────

test('domain registry is non-empty and every id has a corresponding result', () => {
  assert.ok(DATABASE_TENANT_ISOLATION_DOMAIN_IDS.length > 0)
  const results = buildDatabaseTenantIsolationDomainResults()
  assert.equal(results.length, DATABASE_TENANT_ISOLATION_DOMAIN_IDS.length)
  const ids = new Set(results.map((r) => r.domain))
  for (const id of DATABASE_TENANT_ISOLATION_DOMAIN_IDS) assert.ok(ids.has(id))
})

test('every domain cites at least one piece of evidence', () => {
  const results = buildDatabaseTenantIsolationDomainResults()
  for (const r of results) {
    assert.ok(r.evidence.length > 0, `${r.domain} should cite evidence`)
  }
})

// ─── Honest-data bias: no domain reports VERIFIED ──────────────────────────

test('no domain reports VERIFIED — proof requires repository scoping + trusted route + cross-tenant test, which no domain fully has yet', () => {
  const results = buildDatabaseTenantIsolationDomainResults()
  for (const r of results) {
    assert.notEqual(r.verdict, 'VERIFIED', `${r.domain} must not be VERIFIED without full repository+route+test proof`)
  }
})

test('a domain is never VERIFIED merely because it has a tenantId field — audit-ledger-tables has tenantId columns but is UNKNOWN, not VERIFIED', () => {
  const results = buildDatabaseTenantIsolationDomainResults()
  const auditLedger = results.find((r) => r.domain === 'audit-ledger-tables')!
  assert.notEqual(auditLedger.verdict, 'VERIFIED')
  assert.ok(auditLedger.evidence.some((e) => e.description.toLowerCase().includes('column')))
})

test('memory-only stores are never reported as database-verified — m365 snapshot store is NOT_APPLICABLE, explicitly noted as memory-only', () => {
  const results = buildDatabaseTenantIsolationDomainResults()
  const m365 = results.find((r) => r.domain === 'm365-connector-snapshot-store')!
  assert.equal(m365.verdict, 'NOT_APPLICABLE')
  assert.ok(m365.evidence.some((e) => e.description.toLowerCase().includes('memory-only')))
})

test('route boundary domain is FAILED, citing the real governed-execution.ts client-override bug', () => {
  const results = buildDatabaseTenantIsolationDomainResults()
  const route = results.find((r) => r.domain === 'route-to-repository-boundary')!
  assert.equal(route.verdict, 'FAILED')
  assert.ok(route.findings.some((f) => f.affectedFiles.some((p) => p.includes('governed-execution.ts'))))
  assert.ok(route.findings.some((f) => f.severity === 'CRITICAL'))
})

test('connector credential store domain is FAILED, citing the absence of any tenantId parameter in the token store API', () => {
  const results = buildDatabaseTenantIsolationDomainResults()
  const ccs = results.find((r) => r.domain === 'connector-credential-store')!
  assert.equal(ccs.verdict, 'FAILED')
  assert.ok(ccs.evidence.some((e) => e.filePath.includes('microsoft-token-store.ts') && e.tenantScoped === false))
})

test('core persistence stores domain is PARTIAL, not VERIFIED — structural scoping is real but live-DB cross-tenant test is missing', () => {
  const results = buildDatabaseTenantIsolationDomainResults()
  const cps = results.find((r) => r.domain === 'core-persistence-stores')!
  assert.equal(cps.verdict, 'PARTIAL')
  assert.ok(cps.findings.length > 0)
})

test('evidence registry db domain cites the real Drizzle schema and repository, and is PARTIAL not VERIFIED', () => {
  const results = buildDatabaseTenantIsolationDomainResults()
  const erd = results.find((r) => r.domain === 'evidence-registry-db')!
  assert.equal(erd.verdict, 'PARTIAL')
  assert.ok(erd.evidence.some((e) => e.filePath.includes('evidenceRegistry.ts')))
  assert.ok(erd.evidence.some((e) => e.filePath.includes('evidence-registry-repository.ts')))
})

test('cross-tenant test coverage meta-domain is UNKNOWN, honestly documenting that no test proves DB-level cross-tenant denial', () => {
  const results = buildDatabaseTenantIsolationDomainResults()
  const ctc = results.find((r) => r.domain === 'cross-tenant-test-coverage')!
  assert.equal(ctc.verdict, 'UNKNOWN')
})

// ─── Findings quality ───────────────────────────────────────────────────────

test('every FAILED or UNKNOWN domain has at least one finding with a concrete remediation', () => {
  const results = buildDatabaseTenantIsolationDomainResults()
  for (const r of results) {
    if (r.verdict === 'FAILED' || r.verdict === 'UNKNOWN') {
      assert.ok(r.findings.length > 0, `${r.domain} (${r.verdict}) should have findings`)
      for (const f of r.findings) {
        assert.ok(f.remediation.length > 10)
        assert.ok(f.affectedFiles.length > 0)
      }
    }
  }
})

test('findings never claim VERIFIED as their own verdict label when the domain itself is not VERIFIED', () => {
  const results = buildDatabaseTenantIsolationDomainResults()
  for (const r of results) {
    for (const f of r.findings) {
      if (r.verdict !== 'VERIFIED') {
        assert.notEqual(f.verdict, 'VERIFIED')
      }
    }
  }
})

// ─── Authority model assembly ───────────────────────────────────────────────

test('authority result reports authority name and a deterministic platform verdict', () => {
  const a = getDatabaseTenantIsolationAuthority()
  assert.equal(a.authority, 'DATABASE_TENANT_ISOLATION_VERIFICATION')
  assert.ok(typeof a.generatedAt === 'string')
  assert.ok(a.platformVerdict)
})

test('platform verdict is FAILED because at least one domain (route-to-repository-boundary) is FAILED — never silently upgraded', () => {
  const a = getDatabaseTenantIsolationAuthority()
  assert.equal(a.platformVerdict, 'FAILED')
})

test('platform verdict is deterministic across repeated calls', () => {
  const a = getDatabaseTenantIsolationAuthority()
  const b = getDatabaseTenantIsolationAuthority()
  assert.equal(a.platformVerdict, b.platformVerdict)
  assert.deepEqual(a.summary, b.summary)
})

test('summary counts add up to the total number of domains', () => {
  const a = getDatabaseTenantIsolationAuthority()
  const total = a.summary.verifiedDomains + a.summary.partialDomains + a.summary.unknownDomains + a.summary.failedDomains + a.summary.notApplicableDomains
  assert.equal(total, a.domainResults.length)
})

test('summary reports zero VERIFIED domains', () => {
  const a = getDatabaseTenantIsolationAuthority()
  assert.equal(a.summary.verifiedDomains, 0)
})

test('criticalFindings includes only CRITICAL/HIGH severity findings, and includes the governed-execution and token-store findings', () => {
  const a = getDatabaseTenantIsolationAuthority()
  for (const f of a.criticalFindings) {
    assert.ok(f.severity === 'CRITICAL' || f.severity === 'HIGH')
  }
  assert.ok(a.criticalFindings.some((f) => f.affectedFiles.some((p) => p.includes('governed-execution.ts'))))
  assert.ok(a.criticalFindings.some((f) => f.affectedFiles.some((p) => p.includes('microsoft-token-store.ts'))))
})

// ─── Meta: classification-system honesty guard ─────────────────────────────
// These tests guard the classification system itself, not just its current
// output — a domain with no test-type evidence must never be reported
// VERIFIED, and every domain's testedOperations must be consistent with at
// least one piece of cited evidence (no fabricated "tested" claims).

test('[meta] no domain reports VERIFIED while having zero TEST_PROOF evidence — VERIFIED always requires cited test evidence', () => {
  const results = buildDatabaseTenantIsolationDomainResults()
  for (const r of results) {
    const hasTestProof = r.evidence.some((e) => e.evidenceType === 'TEST_PROOF')
    if (r.verdict === 'VERIFIED') {
      assert.ok(hasTestProof, `${r.domain} cannot be VERIFIED without TEST_PROOF evidence`)
    }
  }
})

test('[meta] every domain marked testedOperations.read/list/create/update/delete true has at least one corresponding evidence entry', () => {
  const results = buildDatabaseTenantIsolationDomainResults()
  const opToTypes: Record<string, string[]> = {
    read: ['READ_SCOPE', 'REPOSITORY_SCOPE', 'QUERY_FILTER', 'ROUTE_BOUNDARY', 'PERSISTENCE_PROVIDER', 'RAW_SQL_REVIEW'],
    list: ['LIST_SCOPE', 'REPOSITORY_SCOPE', 'QUERY_FILTER', 'ROUTE_BOUNDARY', 'PERSISTENCE_PROVIDER', 'RAW_SQL_REVIEW'],
    create: ['WRITE_SCOPE', 'REPOSITORY_SCOPE', 'MUTATION_SCOPE', 'ROUTE_BOUNDARY', 'PERSISTENCE_PROVIDER', 'RAW_SQL_REVIEW'],
    update: ['MUTATION_SCOPE', 'WRITE_SCOPE', 'REPOSITORY_SCOPE', 'ROUTE_BOUNDARY', 'PERSISTENCE_PROVIDER', 'RAW_SQL_REVIEW'],
    delete: ['DELETE_SCOPE', 'REPOSITORY_SCOPE', 'ROUTE_BOUNDARY', 'PERSISTENCE_PROVIDER', 'RAW_SQL_REVIEW'],
  }
  for (const r of results) {
    for (const [op, types] of Object.entries(opToTypes)) {
      if ((r.testedOperations as any)[op]) {
        assert.ok(
          r.evidence.some((e) => types.includes(e.evidenceType)),
          `${r.domain} claims testedOperations.${op}=true but cites no matching evidence type`,
        )
      }
    }
  }
})

test('[meta] no FAILED domain is missing a CRITICAL or HIGH finding — severity must be honest, not downgraded', () => {
  const results = buildDatabaseTenantIsolationDomainResults()
  for (const r of results) {
    if (r.verdict === 'FAILED') {
      assert.ok(r.findings.some((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH'), `${r.domain} is FAILED but has no CRITICAL/HIGH finding`)
    }
  }
})

test('[meta] confidence scores are within [0,1] and never claim full (1.0) confidence anywhere', () => {
  const results = buildDatabaseTenantIsolationDomainResults()
  for (const r of results) {
    assert.ok(r.confidence >= 0 && r.confidence <= 1)
    assert.ok(r.confidence < 1, `${r.domain} should never claim full 1.0 confidence given known gaps`)
    for (const e of r.evidence) {
      assert.ok(e.confidence >= 0 && e.confidence <= 1)
    }
  }
})
