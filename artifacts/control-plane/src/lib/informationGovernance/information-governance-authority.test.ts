import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  evaluateDataClassification,
  evaluateRetentionPolicy,
  evaluateAccessGovernance,
  evaluateEncryptionGovernance,
  evaluateExportGovernance,
  evaluatePrivacyPosture,
  evaluateInformationGovernanceReadiness,
  getInformationGovernanceAuthority,
  DATA_INVENTORY,
  listClassificationRules,
} from './information-governance-authority'

// ─── Part 3 — Classification Engine ────────────────────────────────────────

test('classification engine: every verbatim rule maps correctly and deterministically', () => {
  const rules: Record<string, string> = {
    'OAuth Tokens': 'RESTRICTED',
    'User Principal Names': 'PII',
    'Email Addresses': 'PII',
    'Display Names': 'PII',
    'Tenant Metadata': 'INTERNAL',
    'Technology Inventory': 'INTERNAL',
    'Evidence Records': 'CONFIDENTIAL',
    'Outcome Finance': 'CONFIDENTIAL',
    'Audit Records': 'CONFIDENTIAL',
    'Question Catalog': 'SYSTEM_METADATA',
    'Question Responses': 'INTERNAL',
  }
  for (const [category, expected] of Object.entries(rules)) {
    assert.equal(evaluateDataClassification(category), expected, `${category} should map to ${expected}`)
  }
})

test('classification engine is pure/deterministic — repeated calls return identical results', () => {
  for (let i = 0; i < 5; i++) {
    assert.equal(evaluateDataClassification('OAuth Tokens'), 'RESTRICTED')
  }
})

test('classification engine returns UNKNOWN for unrecognised categories (no fabrication)', () => {
  assert.equal(evaluateDataClassification('Some Made Up Category'), 'UNKNOWN')
})

test('listClassificationRules returns all 11 verbatim rules', () => {
  assert.equal(listClassificationRules().length, 11)
})

// ─── Part 4 — Retention Policies ───────────────────────────────────────────

test('retention: OAuth Tokens honestly resolves to MISSING (no TTL/expiry logic in token store)', () => {
  const policy = evaluateRetentionPolicy('OAuth Tokens')
  assert.equal(policy.status, 'MISSING')
  assert.equal(policy.retentionDays, 'UNKNOWN')
  assert.ok(!policy.evidence.toLowerCase().includes('defined ttl'))
})

test('retention: Evidence Records resolves to DEFINED, backed by real evidence-retention.ts logic', () => {
  const policy = evaluateRetentionPolicy('Evidence Records')
  assert.equal(policy.status, 'DEFINED')
  assert.ok(policy.evidence.includes('evidence-retention.ts'))
})

test('retention: Outcome Finance Records honestly resolves to UNKNOWN (no retention fields found)', () => {
  const policy = evaluateRetentionPolicy('Outcome Finance Records')
  assert.equal(policy.status, 'UNKNOWN')
})

test('retention: unrecognised/unverified categories resolve to UNKNOWN, never a fabricated DEFINED', () => {
  const policy = evaluateRetentionPolicy('Some Unverified Category')
  assert.equal(policy.status, 'UNKNOWN')
  assert.notEqual(policy.status, 'DEFINED')
})

test('retention: no category in the data inventory has a fabricated DEFINED status without evidence', () => {
  for (const item of DATA_INVENTORY) {
    const policy = evaluateRetentionPolicy(item.name)
    if (policy.status === 'DEFINED') {
      assert.ok(policy.evidence.length > 0, `${item.name} DEFINED status must carry evidence`)
    }
  }
})

// ─── Part 5 — Access Governance ────────────────────────────────────────────

test('access governance: Tenant Isolation honestly reports PARTIAL, not READY', () => {
  const access = evaluateAccessGovernance()
  const tenantIsolation = access.find((a) => a.area === 'Tenant Isolation')
  assert.ok(tenantIsolation)
  assert.equal(tenantIsolation?.status, 'PARTIAL')
})

test('access governance: Role Based Access reflects the real requireCapability() middleware as READY', () => {
  const access = evaluateAccessGovernance()
  const rbac = access.find((a) => a.area === 'Role Based Access')
  assert.equal(rbac?.status, 'READY')
  assert.ok(rbac?.evidence.includes('requireCapability'))
})

test('access governance: covers all 5 required areas', () => {
  const access = evaluateAccessGovernance()
  const areas = access.map((a) => a.area)
  for (const expected of ['Role Based Access', 'Tenant Isolation', 'Restricted Data Access', 'Admin Access', 'Export Access']) {
    assert.ok(areas.includes(expected), `missing area: ${expected}`)
  }
})

// ─── Part 6 — Encryption Governance ────────────────────────────────────────

test('encryption governance: Secrets Storage is READY, reflecting the real EncryptedMicrosoftTokenStore', () => {
  const encryption = evaluateEncryptionGovernance()
  const secrets = encryption.find((e) => e.area === 'Secrets Storage')
  assert.equal(secrets?.status, 'READY')
  assert.ok(secrets?.evidence.includes('AES-256-GCM'))
})

test('encryption governance: At Rest and In Transit honestly resolve to UNKNOWN (not verifiable from app code)', () => {
  const encryption = evaluateEncryptionGovernance()
  const atRest = encryption.find((e) => e.area === 'At Rest')
  const inTransit = encryption.find((e) => e.area === 'In Transit')
  assert.equal(atRest?.status, 'UNKNOWN')
  assert.equal(inTransit?.status, 'UNKNOWN')
})

test('encryption governance: no fabricated READY claims for unverified areas', () => {
  const encryption = evaluateEncryptionGovernance()
  for (const item of encryption) {
    if (item.area !== 'Secrets Storage') {
      assert.notEqual(item.status, 'READY')
    }
  }
})

// ─── Part 7 — Export Governance ────────────────────────────────────────────

test('export governance: all four export areas honestly resolve to MISSING (no export functionality found)', () => {
  const exportControls = evaluateExportGovernance()
  assert.equal(exportControls.length, 4)
  for (const control of exportControls) {
    assert.equal(control.status, 'MISSING')
  }
})

// ─── Part 8 — Privacy Posture ───────────────────────────────────────────────

test('privacy posture: all four content questions resolve to NO, backed by the real scope guard', () => {
  const privacy = evaluatePrivacyPosture()
  assert.equal(privacy.length, 4)
  for (const attribute of privacy) {
    assert.equal(attribute.answer, 'NO')
    assert.ok(attribute.evidence.includes('m365-exposure-scope-guard'))
  }
})

test('privacy posture: evidence cites the actual forbidden scopes from the real guard', () => {
  const privacy = evaluatePrivacyPosture()
  for (const attribute of privacy) {
    assert.ok(attribute.evidence.includes('Mail.Read'))
    assert.ok(attribute.evidence.includes('Files.Read.All'))
  }
})

// ─── Part 9 — Readiness Scoring ────────────────────────────────────────────

test('readiness: score is between 0 and 100', () => {
  const readiness = evaluateInformationGovernanceReadiness()
  assert.ok(readiness.score >= 0 && readiness.score <= 100)
})

test('readiness: status is one of READY/PARTIAL/MISSING', () => {
  const readiness = evaluateInformationGovernanceReadiness()
  assert.ok(['READY', 'PARTIAL', 'MISSING'].includes(readiness.status))
})

test('readiness: given known partial/honest state, overall status is not fabricated as READY', () => {
  const readiness = evaluateInformationGovernanceReadiness()
  // Given At Rest/In Transit UNKNOWN, Tenant Isolation PARTIAL, multiple
  // retention UNKNOWNs, and export entirely MISSING, the platform cannot
  // honestly score 80+ today.
  assert.notEqual(readiness.status, 'READY')
})

test('readiness: emits a VERIFY_TENANT_ISOLATION recommendation because Tenant Isolation is PARTIAL', () => {
  const readiness = evaluateInformationGovernanceReadiness()
  assert.ok(readiness.recommendations.some((r) => r.type === 'VERIFY_TENANT_ISOLATION'))
})

test('readiness: emits DEFINE_RETENTION_POLICY recommendations for MISSING/UNKNOWN retention categories', () => {
  const readiness = evaluateInformationGovernanceReadiness()
  assert.ok(readiness.recommendations.some((r) => r.type === 'DEFINE_RETENTION_POLICY'))
})

test('readiness: findings and recommendations are arrays of well-formed objects', () => {
  const readiness = evaluateInformationGovernanceReadiness()
  for (const finding of readiness.findings) {
    assert.ok(finding.id && finding.area && finding.severity && finding.description && finding.evidence)
  }
  for (const recommendation of readiness.recommendations) {
    assert.ok(recommendation.id && recommendation.type && recommendation.severity && recommendation.owner && recommendation.rationale && recommendation.recommendedAction)
  }
})

test('readiness: does not emit a privacy finding when all privacy answers are NO', () => {
  const readiness = evaluateInformationGovernanceReadiness()
  assert.equal(readiness.findings.some((f) => f.area === 'Privacy'), false)
})

// ─── Authority Model Wrapper ────────────────────────────────────────────────

test('authority model: includes all required sections', () => {
  const model = getInformationGovernanceAuthority()
  assert.ok(Array.isArray(model.dataInventory) && model.dataInventory.length > 0)
  assert.ok(Array.isArray(model.classificationRules) && model.classificationRules.length > 0)
  assert.ok(Array.isArray(model.retentionPolicies) && model.retentionPolicies.length === model.dataInventory.length)
  assert.ok(Array.isArray(model.accessGovernance) && model.accessGovernance.length === 5)
  assert.ok(Array.isArray(model.encryptionGovernance) && model.encryptionGovernance.length === 3)
  assert.ok(Array.isArray(model.exportGovernance) && model.exportGovernance.length === 4)
  assert.ok(Array.isArray(model.privacyPosture) && model.privacyPosture.length === 4)
  assert.ok(model.readiness)
})

test('authority model: data inventory covers the required categories from the spec', () => {
  const model = getInformationGovernanceAuthority()
  const names = model.dataInventory.map((item) => item.name)
  for (const expected of [
    'Connector Metadata', 'OAuth Tokens', 'Tenant Metadata', 'Technology Assets', 'Applications',
    'Users', 'Ownership Signals', 'Licences', 'Usage Signals', 'Exposure Findings', 'Recommendations',
    'Evidence Records', 'Outcome Records', 'Outcome Finance Records', 'Audit Records', 'Question Responses',
  ]) {
    assert.ok(names.includes(expected), `missing inventory category: ${expected}`)
  }
})

test('authority model: every data inventory record has the required base fields conceptually represented', () => {
  const model = getInformationGovernanceAuthority()
  for (const item of model.dataInventory) {
    assert.ok(item.name)
    assert.ok(item.classification)
    assert.ok(item.source)
  }
})
