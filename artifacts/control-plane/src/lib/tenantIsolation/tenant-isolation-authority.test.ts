import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ISOLATION_DOMAIN_IDS,
  verifyStorageIsolation,
  verifyApiIsolation,
  verifyConnectorIsolation,
  verifyDiscoveryIsolation,
  verifySnapshotIsolation,
  verifyAuthorityIsolation,
  verifyEvidenceIsolation,
  verifyOutcomeIsolation,
  verifyOutcomeFinanceIsolation,
  verifyExportIsolation,
  verifyHeadlessIsolation,
  verifyGraphIsolation,
  verifyAuditIsolation,
  buildIsolationDomains,
  buildIsolationRecommendations,
  evaluateTenantIsolationReadiness,
  getTenantIsolationAuthority,
} from './tenant-isolation-authority'

// ─── Part 2 — Domain Registry ──────────────────────────────────────────────

test('exactly 13 isolation domains are registered, matching the spec', () => {
  assert.equal(ISOLATION_DOMAIN_IDS.length, 13)
})

test('every domain produces a check with at least one piece of evidence', () => {
  const domains = buildIsolationDomains()
  assert.equal(domains.length, 13)
  for (const domain of domains) {
    assert.ok(domain.evidenceCount > 0, `${domain.name} should cite at least one evidence record`)
  }
})

// ─── Honest-data bias: no domain is VERIFIED without real evidence ────────

test('no domain reports VERIFIED — current platform evidence is thin/partial everywhere, never fabricated', () => {
  const domains = buildIsolationDomains()
  for (const domain of domains) {
    assert.notEqual(domain.status, 'VERIFIED', `${domain.name} must not be VERIFIED without stronger proof than currently exists`)
  }
})

test('domains with no underlying implementation (export, headless, graph) report UNKNOWN, not FAILED or VERIFIED', () => {
  assert.equal(verifyExportIsolation().status, 'UNKNOWN')
  assert.equal(verifyHeadlessIsolation().status, 'UNKNOWN')
  assert.equal(verifyGraphIsolation().status, 'UNKNOWN')
})

test('domains with real (if partial) enforcement code report PARTIAL, not UNKNOWN', () => {
  assert.equal(verifyStorageIsolation().status, 'PARTIAL')
  assert.equal(verifyApiIsolation().status, 'PARTIAL')
  assert.equal(verifyConnectorIsolation().status, 'PARTIAL')
  assert.equal(verifyDiscoveryIsolation().status, 'PARTIAL')
  assert.equal(verifySnapshotIsolation().status, 'PARTIAL')
  assert.equal(verifyAuthorityIsolation().status, 'PARTIAL')
  assert.equal(verifyEvidenceIsolation().status, 'PARTIAL')
  assert.equal(verifyOutcomeIsolation().status, 'PARTIAL')
  assert.equal(verifyOutcomeFinanceIsolation().status, 'PARTIAL')
  assert.equal(verifyAuditIsolation().status, 'PARTIAL')
})

// ─── Evidence wiring: every verify*() cites a real file path ──────────────

test('storage isolation evidence cites the real M365SnapshotRepository file', () => {
  const check = verifyStorageIsolation()
  assert.ok(check.evidence.some((e) => e.reference.includes('m365-snapshot-repository.ts')))
})

test('api isolation evidence cites the real security-guards middleware and routes/index.ts', () => {
  const check = verifyApiIsolation()
  assert.ok(check.evidence.some((e) => e.reference.includes('security-guards.ts')))
  assert.ok(check.evidence.some((e) => e.reference.includes('routes/index.ts')))
})

test('api isolation evidence honestly documents unguarded routers, not fabricated full coverage', () => {
  const check = verifyApiIsolation()
  assert.ok(check.evidence.some((e) => e.description.includes('WITHOUT requireTenantContext()')))
})

test('headless isolation evidence cites the literal identity-stub contract file, proving no real API exists', () => {
  const check = verifyHeadlessIsolation()
  assert.ok(check.evidence.some((e) => e.reference.includes('runtime-headless-contract.ts')))
})

test('graph isolation evidence distinguishes the internal relationship graph from Microsoft Graph and documents the unguarded demo route', () => {
  const check = verifyGraphIsolation()
  assert.ok(check.evidence.some((e) => e.reference.includes('governance-graph')))
  assert.ok(check.evidence.some((e) => e.description.includes('demo')))
})

test('audit isolation evidence flags the hardcoded PASS stub as fabricated evidence, not real proof', () => {
  const check = verifyAuditIsolation()
  assert.ok(check.evidence.some((e) => e.reference.includes('tenant-isolation-audit-service.ts')))
  assert.ok(check.evidence.some((e) => e.description.toLowerCase().includes('fabricated')))
})

test('outcome isolation evidence cites a real behavioural test file, not a generic helper test', () => {
  const check = verifyOutcomeIsolation()
  assert.ok(check.evidence.some((e) => e.reference.includes('economic-operations-tenant-isolation.test.ts')))
})

// ─── Findings generated dynamically from evaluation results ───────────────

test('findings are generated dynamically, not hardcoded — every non-VERIFIED domain has at least one finding', () => {
  const domains = buildIsolationDomains()
  for (const domain of domains) {
    if (domain.status !== 'VERIFIED') {
      assert.ok(domain.findings.length > 0, `${domain.name} (${domain.status}) should have at least one finding`)
    }
  }
})

test('audit domain surfaces a CROSS_TENANT_RISK finding about the fabricated-evidence stub service', () => {
  const domains = buildIsolationDomains()
  const audit = domains.find((d) => d.id === 'audit')!
  assert.ok(audit.findings.some((f) => f.type === 'CROSS_TENANT_RISK' && f.rationale.toLowerCase().includes('compliance theatre')))
})

test('api domain surfaces a CROSS_TENANT_RISK finding about unguarded routers', () => {
  const domains = buildIsolationDomains()
  const api = domains.find((d) => d.id === 'api')!
  assert.ok(api.findings.some((f) => f.type === 'CROSS_TENANT_RISK' && f.rationale.includes('outcomes')))
})

test('export and headless domains surface findings even though UNKNOWN (gap is tracked, not ignored)', () => {
  const domains = buildIsolationDomains()
  const exportDomain = domains.find((d) => d.id === 'export')!
  const headlessDomain = domains.find((d) => d.id === 'headless')!
  assert.ok(exportDomain.findings.length > 0)
  assert.ok(headlessDomain.findings.length > 0)
})

// ─── Recommendations generated dynamically from findings ──────────────────

test('recommendations are generated for every non-VERIFIED domain', () => {
  const domains = buildIsolationDomains()
  const recommendations = buildIsolationRecommendations(domains)
  const nonVerifiedDomains = domains.filter((d) => d.status !== 'VERIFIED')
  assert.equal(recommendations.length, nonVerifiedDomains.length)
})

test('UNKNOWN-domain recommendations honestly state there is nothing to verify yet, not a fabricated action plan', () => {
  const domains = buildIsolationDomains()
  const recommendations = buildIsolationRecommendations(domains)
  const exportRec = recommendations.find((r) => r.domainId === 'export')!
  assert.ok(exportRec.recommendedAction.includes('no implementation to verify yet'))
})

// ─── Readiness score ────────────────────────────────────────────────────────

test('readiness score reflects honestly thin evidence — never reports READY when no domain is VERIFIED', () => {
  const readiness = evaluateTenantIsolationReadiness()
  assert.notEqual(readiness.status, 'READY')
  assert.ok(readiness.score < 80)
})

test('readiness score is deterministic across repeated calls', () => {
  const a = evaluateTenantIsolationReadiness()
  const b = evaluateTenantIsolationReadiness()
  assert.equal(a.score, b.score)
  assert.equal(a.status, b.status)
})

test('readiness score is the weighted sum of the 8 explicitly weighted domains, each capped at 0.5 credit since none are VERIFIED', () => {
  const readiness = evaluateTenantIsolationReadiness()
  // storage(.2)+api(.2)+connector(.15)+discovery(.15)+evidence(.1)+authority(.1)+export(.05)+headless(.05) = 1.0 weight
  // all PARTIAL except export/headless which are UNKNOWN (0 credit)
  const expected = Math.round((0.2 + 0.2 + 0.15 + 0.15 + 0.1 + 0.1) * 0.5 * 100)
  assert.equal(readiness.score, expected)
})

// ─── Full authority model ──────────────────────────────────────────────────

test('getTenantIsolationAuthority returns 13 domains, 13 checks and a readiness summary', () => {
  const authority = getTenantIsolationAuthority()
  assert.equal(authority.domains.length, 13)
  assert.equal(authority.checks.length, 13)
  assert.ok(typeof authority.readiness.score === 'number')
})

test('authority model is internally consistent — domain status matches its underlying check status', () => {
  const authority = getTenantIsolationAuthority()
  for (const domain of authority.domains) {
    const check = authority.checks.find((c) => c.domainId === domain.id)!
    assert.equal(domain.status, check.status)
  }
})
