import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatEvidenceExportRemediation } from '../pages/LiveTenantReadinessView'

test('singular count uses "requires" (not the broken "require" form)', () => {
  const result = formatEvidenceExportRemediation(1)
  assert.equal(result, '1 evidence export requires remediation')
  assert.equal(result.includes('export require '), false)
})

test('plural count uses "exports require"', () => {
  const result = formatEvidenceExportRemediation(2)
  assert.match(result, /exports require/)
  assert.equal(result, '2 evidence exports require remediation')
})

test('zero count preserves the existing approved wording', () => {
  const result = formatEvidenceExportRemediation(0)
  assert.equal(result, '0 evidence exports require remediation')
})
