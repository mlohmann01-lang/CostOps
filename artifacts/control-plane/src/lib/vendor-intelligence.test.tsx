import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { demoVendorIntelligence } from '../data/demo'
import { vendorChangeApiPaths } from '../hooks/useVendorIntelligenceData'

test('demo dataset has realistic vendor changes', () => {
  assert.equal(demoVendorIntelligence.summary.vendorChangesDetected, 12)
  assert.equal(demoVendorIntelligence.summary.highImpact, 3)
  assert.ok(demoVendorIntelligence.changes.some((change: any) => change.vendor === 'MICROSOFT' && change.title.includes('Copilot')))
  assert.ok(demoVendorIntelligence.changes.some((change: any) => change.vendor === 'AWS'))
  assert.ok(demoVendorIntelligence.changes.some((change: any) => change.vendor === 'SNOWFLAKE'))
})

test('Vendor Intelligence route and nav render', () => {
  const app = fs.readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
  const sidebar = fs.readFileSync(new URL('../components/layout/Sidebar.tsx', import.meta.url), 'utf8')
  assert.equal(app.includes('/vendor-intelligence'), true)
  assert.equal(sidebar.includes('Technology Portfolio'), true)
  assert.equal(sidebar.includes('Intelligence'), true)
})

test('Vendor Intelligence page renders summary and change feed', () => {
  const page = fs.readFileSync(new URL('../pages/VendorIntelligenceView.tsx', import.meta.url), 'utf8')
  assert.equal(page.includes('Vendor Changes Detected'), true)
  assert.equal(page.includes('High Impact'), true)
  assert.equal(page.includes('Affected Spend'), true)
  assert.equal(page.includes('Generated Opportunities'), true)
  assert.equal(page.includes('Change Feed'), true)
})

test('live API wiring uses vendor change APIs and no demo fallback', () => {
  const hook = fs.readFileSync(new URL('../hooks/useVendorIntelligenceData.ts', import.meta.url), 'utf8')
  assert.deepEqual(vendorChangeApiPaths, ['/api/vendor-changes', '/api/vendor-changes/high-impact'])
  assert.equal(hook.includes('/api/vendor-changes'), true)
  assert.equal(hook.includes('/assess'), true)
  assert.equal(hook.includes('/generate-opportunities'), true)
  assert.equal(hook.includes("workspace.mode === 'demo'"), true)
  assert.equal(hook.includes('catch (err)'), true)
})

test('Command and Runtime Health integrate vendor signals', () => {
  const command = fs.readFileSync(new URL('../pages/CommandView.tsx', import.meta.url), 'utf8')
  const runtime = fs.readFileSync(new URL('../pages/RuntimeHealthView.tsx', import.meta.url), 'utf8')
  assert.equal(command.includes('Vendor Changes Requiring Review'), true)
  assert.equal(command.includes('potentially affected spend'), true)
  assert.equal(runtime.includes('Vendor Intelligence Pipeline'), true)
  assert.equal(runtime.includes('vendor-intelligence-pipeline'), true)
})
