import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { demoUtilizationIntelligence } from '../data/demo'
import { utilizationApiPaths } from '../hooks/useUtilizationIntelligenceData'

test('demo utilization dataset contains required waste examples', () => {
  assert.equal(demoUtilizationIntelligence.summary.assetsAnalysed, 4200)
  assert.equal(demoUtilizationIntelligence.summary.unusedValue, 164000)
  assert.equal(demoUtilizationIntelligence.summary.generatedOpportunities, 46)
  assert.ok(demoUtilizationIntelligence.records.some((record: any) => record.platform === 'COPILOT' && record.utilizationPercent === 26))
  assert.ok(demoUtilizationIntelligence.records.some((record: any) => record.platform === 'ADOBE' && record.utilizationBand === 'UNUSED'))
})

test('Utilization Intelligence page route and nav render', () => {
  const app = fs.readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
  const sidebar = fs.readFileSync(new URL('../components/layout/Sidebar.tsx', import.meta.url), 'utf8')
  assert.equal(app.includes('/utilization-intelligence'), true)
  assert.equal(sidebar.includes('Technology Portfolio'), true)
  assert.equal(sidebar.includes('Intelligence'), true)
})

test('Utilization Intelligence page renders summary and table columns', () => {
  const page = fs.readFileSync(new URL('../pages/UtilizationIntelligenceView.tsx', import.meta.url), 'utf8')
  for (const text of ['Assets Analysed', 'Unused Value', 'Low Utilization', 'Generated Opportunities', 'Platform', 'Assigned', 'Active', 'Waste Estimate', 'Opportunity']) assert.equal(page.includes(text), true)
})

test('live API wiring calls utilization APIs without demo fallback', () => {
  const hook = fs.readFileSync(new URL('../hooks/useUtilizationIntelligenceData.ts', import.meta.url), 'utf8')
  assert.deepEqual(utilizationApiPaths, ['/api/utilization', '/api/utilization/low', '/api/utilization/opportunities'])
  assert.equal(hook.includes("liveFetch<any>('/api/utilization')"), true)
  assert.equal(hook.includes("liveFetch<any>('/api/utilization/low')"), true)
  assert.equal(hook.includes("liveFetch<any>('/api/utilization/opportunities')"), true)
  assert.equal(hook.includes('catch (err)'), true)
})

test('Command and Runtime Health show utilization signals', () => {
  // Program 6A coverage audit: CommandView's old "Utilization Waste" / "utilization-waste-
  // narrative" widget was removed when CommandView became the Executive Command Center
  // orchestrator. The Utilization Waste table itself still exists and renders on its own
  // owning page (UtilizationIntelligenceView), so the coverage is relocated there instead of
  // CommandView. See PROGRAM_6A_COVERAGE_AUDIT.md.
  const utilizationPage = fs.readFileSync(new URL('../pages/UtilizationIntelligenceView.tsx', import.meta.url), 'utf8')
  const runtime = fs.readFileSync(new URL('../pages/RuntimeHealthView.tsx', import.meta.url), 'utf8')
  assert.equal(utilizationPage.includes('Utilization Waste'), true)
  assert.equal(runtime.includes('Utilization Intelligence Pipeline'), true)
  assert.equal(runtime.includes('utilization-intelligence-pipeline'), true)
})
