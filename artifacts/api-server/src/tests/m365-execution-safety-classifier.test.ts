import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyM365ExecutionSafety } from '../lib/playbooks/m365/m365-execution-safety-classifier'
import { seedM365PlaybookSnapshot } from './m365-playbook-fixture'
import { m365SnapshotRepository } from '../lib/connectors/m365/m365-snapshot-repository'
import type { M365TrustReport, TrustDimension } from '../lib/connectors/m365/m365-types'

const dim = (band: TrustDimension['band']): TrustDimension => ({ band, score: band === 'TRUSTED' ? 92 : band === 'HIGH' ? 80 : 60, reasons: [band] })
const trust = (band: TrustDimension['band']): M365TrustReport => ({ tenantId: 't', globalTrustBand: band, globalTrustScore: band === 'HIGH' ? 82 : 60, identityTrust: dim(band), licenseTrust: dim(band), usageTrust: dim(band), activityTrust: dim(band), mailboxTrust: dim(band), executionSafetyTrust: dim(band), blockers: [], warnings: [], recommendations: [], generatedAt: new Date().toISOString() })

test('inactive user can become ready only with high trust and low false-positive risk', () => {
  const { tenantId } = seedM365PlaybookSnapshot('tenant-classifier-ready')
  const snapshot = m365SnapshotRepository.getLatest(tenantId)!
  snapshot.licenseAssignments.push({ id: 'la-ready', tenantId, userId: 'u-inactive', skuId: 'sku-e5', skuPartNumber: 'SPE_E5', assignmentType: 'DIRECT', sourceSnapshotId: snapshot.snapshot.snapshotId })
  const base = { playbookId: 'm365-inactive-user-reclaim', entityId: 'u-inactive', entityType: 'USER', projectedMonthlySavings: 57, savingsConfidence: 'HIGH' as const, evidenceQuality: 'STRONG' as const, evidenceReasons: ['strong'], evidence: ['user:u-inactive', 'lastSignIn:2026-01-01T00:00:00Z', 'protectedSignalsEvaluated:clear', 'license:SPE_E5'], costEstimates: [{ skuId: 'sku-e5', skuPartNumber: 'SPE_E5', monthlyUnitCost: 57, annualUnitCost: 684, currency: 'USD', source: 'CONTRACT' as const, confidence: 'HIGH' as const, reasons: ['contract'] }] }
  const ready = classifyM365ExecutionSafety(base, { snapshot, trust: trust('HIGH') })
  assert.equal(ready.productionReadiness, 'READY_FOR_APPROVAL')
  assert.equal(ready.allowedNextStep, 'SUBMIT_FOR_APPROVAL')
  const investigate = classifyM365ExecutionSafety(base, { snapshot, trust: trust('INVESTIGATE') })
  assert.notEqual(investigate.productionReadiness, 'READY_FOR_APPROVAL')
})
