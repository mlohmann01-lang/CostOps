import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('VendorIntelligenceView renders VCDE v2 pipeline sections and actions', () => {
  const page = fs.readFileSync(new URL('../pages/VendorIntelligenceView.tsx', import.meta.url), 'utf8')
  for (const label of ['Signal Feed', 'Change Classification', 'Impact Assessment', 'Opportunity Pipeline', 'Ingest signal', 'Classify', 'Assess impact', 'Promote to Opportunity Factory']) assert.equal(page.includes(label), true)
})

test('vendor intelligence hook calls live APIs and does not fall back to demo on live error', () => {
  const hook = fs.readFileSync(new URL('../hooks/useVendorIntelligenceData.ts', import.meta.url), 'utf8')
  for (const route of ['/api/vendor-changes/signals', '/api/vendor-changes/pipeline/health', '/api/vendor-changes/signals/ingest', '/promote-to-opportunity']) assert.equal(hook.includes(route), true)
  assert.equal(hook.includes('setData(empty); setError(normalizeApiError(err)); return null'), true)
})

test('Runtime Health includes VCDE Pipeline component', () => {
  const runtime = fs.readFileSync(new URL('../pages/RuntimeHealthView.tsx', import.meta.url), 'utf8')
  const api = fs.readFileSync(new URL('../../../api-server/src/routes/runtime-observability.ts', import.meta.url), 'utf8')
  assert.equal(api.includes('VCDE Pipeline'), true)
  assert.equal(runtime.includes('runtime-component-grid'), true)
})
