import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyVendorSignal } from '../lib/vcde/vendor-change-classifier'

const signal = (title: string, rawText = title) => ({ signalId: `sig-${title}`, tenantId: 'tenant-vcde-classify', vendor: 'AWS' as const, sourceType: 'MANUAL' as const, sourceUrl: 'manual://test', title, rawText, detectedAt: '2026-06-01T00:00:00.000Z', hash: title.replace(/\W/g, ''), signalState: 'NEW' as const })

test('deterministically classifies vendor signal categories and reasons', () => {
  assert.equal(classifyVendorSignal(signal('price increase for compute')).category, 'PRICE_CHANGE')
  assert.equal(classifyVendorSignal(signal('legacy SKU retirement end of support')).category, 'RETIREMENT')
  assert.equal(classifyVendorSignal(signal('new bundle packaging update')).category, 'BUNDLE_CHANGE')
  assert.equal(classifyVendorSignal(signal('licensing terms update')).category, 'LICENSING_CHANGE')
  assert.equal(classifyVendorSignal(signal('savings plan discount update')).category, 'COMMITMENT_CHANGE')
  const result = classifyVendorSignal(signal('savings plan discount update'))
  assert.equal(result.classifierConfidence, 'MEDIUM')
  assert.ok(result.classificationReasons.length > 0)
})
