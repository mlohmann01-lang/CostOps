import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { NAV_GROUPS } from '../components/layout/Sidebar'
import { demoOutcomeProtectionData, demoProtectedOutcomes, outcomeProtectionApiPaths, summarizeOutcomeProtection, buildDemoOutcomeDetail, type ProtectedOutcomeDetail } from '../hooks/useOutcomeProtectionData'

const read = (path: string) => fs.readFileSync(new URL(path, import.meta.url), 'utf8')

test('Outcome Protection route exists', () => {
  const app = read('../App.tsx')
  assert.equal(app.includes("import OutcomeProtectionView from './pages/OutcomeProtectionView'"), true)
  assert.equal(app.includes('<Route path="/outcome-protection" component={OutcomeProtectionRoute} />'), true)
})

test('Navigation entry exists under Operations', () => {
  const operations = NAV_GROUPS.find((group) => group.label === 'Operations')
  assert.equal(operations?.items.some((item) => item.label === 'Outcome Protection' && item.href === '/outcome-protection'), true)
})

test('Summary cards render', () => {
  const page = read('../pages/OutcomeProtectionView.tsx')
  for (const label of ['Protected Outcomes', 'Retained Outcomes', 'At-Risk Outcomes', 'Drifted Outcomes', 'Open Remediations', 'Retention Rate', 'Protected Annual Value', 'Retained Annual Value', 'Drifted Annual Value']) assert.equal(page.includes(label), true)
  assert.equal(page.includes("data-testid='outcome-protection-summary'"), true)
})

test('Value funnel renders', () => {
  const page = read('../pages/OutcomeProtectionView.tsx')
  for (const label of ['Protected Value Funnel', 'Verified Value', 'Protected Value', 'Retained Value', 'Drifted Value', 'Recovered Value']) assert.equal(page.includes(label), true)
})

test('Protected outcomes table renders', () => {
  const page = read('../pages/OutcomeProtectionView.tsx')
  assert.equal(page.includes("data-testid='protected-outcomes-table'"), true)
  for (const label of ['Protection Start', 'Open Findings']) assert.equal(page.includes(label) || page.includes(label.replace(' ', '')), true)
})

test('Drift findings render', () => {
  const page = read('../pages/OutcomeProtectionView.tsx')
  assert.equal(page.includes('Open Drift Findings'), true)
  assert.equal(page.includes('VALUE_LEAKAGE'), false) // values are data-driven, not hard-coded labels
  assert.equal(demoOutcomeProtectionData.dashboard.openDriftFindings.some((f) => f.driftType === 'VALUE_LEAKAGE'), true)
})

test('Remediation queue renders', () => {
  const page = read('../pages/OutcomeProtectionView.tsx')
  assert.equal(page.includes('Remediation Queue'), true)
  assert.equal(page.includes('CREATE_NEW_GOVERNED_ACTION'), true)
})

test('Upcoming retention checks render', () => {
  const page = read('../pages/OutcomeProtectionView.tsx')
  assert.equal(page.includes('Upcoming Retention Checks'), true)
  assert.equal(page.includes("data-testid='upcoming-retention-checks'"), true)
})

test('Detail drawer renders', () => {
  const page = read('../pages/OutcomeProtectionView.tsx')
  for (const label of ['Protected Outcome Detail Drawer', 'Outcome Summary', 'Policies', 'Drift Findings', 'Retention History', 'Evidence Count', 'Evidence IDs']) assert.equal(page.includes(label) || (label === 'Outcome Summary' && page.includes('Protected Outcome Detail Drawer')), true)
})

test('Executive narrative renders', () => {
  const page = read('../pages/OutcomeProtectionView.tsx')
  assert.equal(page.includes('Executive Narrative'), true)
  assert.equal(page.includes('Certen is currently protecting'), true)
})

test('Demo fallback works', () => {
  const hook = read('../hooks/useOutcomeProtectionData.ts')
  assert.deepEqual(outcomeProtectionApiPaths, ['/api/outcome-protection/dashboard', '/api/outcome-protection/outcomes'])
  assert.equal(hook.includes("liveFetch<OutcomeProtectionDashboard>('/api/outcome-protection/dashboard')"), true)
  assert.equal(hook.includes("liveFetch<ProtectedOutcome[]>('/api/outcome-protection/outcomes')"), true)
  assert.equal(demoOutcomeProtectionData.isDemo, true)
  const statuses = new Set(demoProtectedOutcomes.map((outcome) => outcome.status))
  for (const status of ['PROTECTED', 'AT_RISK', 'DRIFTED', 'REMEDIATION_OPEN', 'RESOLVED']) assert.equal(statuses.has(status as any), true)
  assert.equal(summarizeOutcomeProtection(demoProtectedOutcomes).protectedOutcomes >= 5, true)
})

test('Cross-links exist', () => {
  const page = read('../pages/OutcomeProtectionView.tsx')
  for (const label of ['Open Governed Action', 'Open Outcome', 'Open Evidence', 'Open Action Center', 'Open Executive Value']) assert.equal(page.includes(label), true)
})

test('No LeftShield labels', () => {
  const page = read('../pages/OutcomeProtectionView.tsx')
  const hook = read('../hooks/useOutcomeProtectionData.ts')
  assert.equal(page.includes('LeftShield'), false)
  assert.equal(hook.includes('LeftShield'), false)
})

test('No Agent Security Analytics labels', () => {
  const page = read('../pages/OutcomeProtectionView.tsx')
  const hook = read('../hooks/useOutcomeProtectionData.ts')
  assert.equal(page.includes('Agent Security Analytics'), false)
  assert.equal(hook.includes('Agent Security Analytics'), false)
})

test('demo mode returns DEMO dataState for outcome detail', () => {
  const detail: ProtectedOutcomeDetail = buildDemoOutcomeDetail('po-protected')
  assert.equal(detail.dataState, 'DEMO')
})

test('fetchOutcomeDetail does not fall back to demo data on NOT_CONNECTED or error', () => {
  const hook = read('../hooks/useOutcomeProtectionData.ts')
  assert.equal(hook.includes("if (!workspace.dataReady) return unavailableOutcomeDetail(id, data.outcomes.find((o) => o.id === id), 'NOT_CONNECTED')"), true)
  assert.equal(hook.includes("return unavailableOutcomeDetail(id, data.outcomes.find((o) => o.id === id), 'NO_DATA', normalizeApiError(error).message)"), true)
  assert.equal(hook.includes("dataState: detail?.outcome ? 'LIVE' : 'NO_DATA'"), true)
  const fnMatch = hook.match(/const fetchOutcomeDetail = useCallback\([\s\S]*?\}, \[data\.isDemo, data\.outcomes, workspace\.mode, workspace\.dataReady\]\)/)
  assert.ok(fnMatch, 'fetchOutcomeDetail must have the expected dependency array')
  const catchOnly = fnMatch![0].slice(fnMatch![0].indexOf('} catch (error) {'))
  assert.equal(catchOnly.includes('buildDemoOutcomeDetail'), false, 'catch block must never return demo data')
})

test('outcome detail drawer surfaces dataState for non-LIVE non-DEMO states', () => {
  const page = read('../pages/OutcomeProtectionView.tsx')
  assert.equal(page.includes("data-testid='outcome-detail-data-state'"), true)
  assert.equal(page.includes("detail.dataState !== 'LIVE' && detail.dataState !== 'DEMO'"), true)
})
