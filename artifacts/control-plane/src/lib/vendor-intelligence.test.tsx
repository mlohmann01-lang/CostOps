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
  // Program 6A coverage audit: CommandView's old "Vendor Changes Requiring Review" /
  // "potentially affected spend" widget was removed when CommandView became the Executive
  // Command Center orchestrator. The underlying concept (detected vendor changes and their
  // affected spend) still exists and renders on its own owning page
  // (VendorIntelligenceView), under different copy ("Vendor Changes Detected" / "Affected
  // Spend"), so the coverage is relocated there instead of CommandView.
  // See PROGRAM_6A_COVERAGE_AUDIT.md.
  const vendorPage = fs.readFileSync(new URL('../pages/VendorIntelligenceView.tsx', import.meta.url), 'utf8')
  const runtime = fs.readFileSync(new URL('../pages/RuntimeHealthView.tsx', import.meta.url), 'utf8')
  assert.equal(vendorPage.includes('Vendor Changes Detected'), true)
  assert.equal(vendorPage.includes('Affected Spend'), true)
  assert.equal(runtime.includes('Vendor Intelligence Pipeline'), true)
  assert.equal(runtime.includes('vendor-intelligence-pipeline'), true)
})
