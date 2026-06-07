import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { buildPilotWorkspaceData } from '../hooks/usePilotWorkspaceData'
import { NAV_GROUPS } from '../components/layout/Sidebar'

const read = (path: string) => fs.readFileSync(new URL(path, import.meta.url), 'utf8')

test('Overview renders board-ready cockpit sections and KPI row', () => {
  const page = read('../pages/PilotWorkspace.tsx')
  for (const snippet of ['Overview', 'Projected Value', 'Verified Value', 'Ready Actions', 'Data Trust', 'What Needs Attention', 'Tenant Status', 'Value Funnel', 'Proof Readiness', 'View Executive Risk', 'View Executive Value', 'Open Actions', 'Open Evidence']) assert.equal(page.includes(snippet), true)
  assert.equal(page.includes("data-testid='overview-kpis'"), true)
  assert.equal(page.includes('Workspace Control Center'), false)
})

test('Overview route and sidebar link are wired', () => {
  const app = read('../App.tsx')
  assert.equal(app.includes("import PilotWorkspace from './pages/PilotWorkspace'"), true)
  assert.equal(app.includes('/pilot-workspace'), true)
  const labels = NAV_GROUPS.flatMap((group) => group.items.map((item) => `${item.label}:${item.href}`)).join(' | ')
  assert.match(labels, /Overview:\/workspace/)
})

test('Open Actions render from blocked and incomplete state', () => {
  const data = buildPilotWorkspaceData({
    workspace: { tenantName: 'Customer pilot', mode: 'demo' },
    runtime: { environment: 'DEMO' },
    onboarding: { onboarding: { status: 'NOT_STARTED', discovery: { status: 'PENDING' }, updatedAt: '2026-06-02T00:00:00.000Z' }, checklist: {} },
    connectors: { data: [{ id: 'm365', health: 'UNAVAILABLE' }] },
    trust: { data: { summary: { globalTrustBand: 'BLOCKED', globalTrustLabel: 'Trust blocker open' } } },
    recommendations: { data: [{ id: 'rec-1', verdict: 'approval-required', saving: 1000 }] },
    outcomes: { data: { proofSummary: { projectedMonthlySavings: 1000, verifiedMonthlySavings: 0, verificationBacklogCount: 1 } } },
    execution: { data: { awaiting: [{ id: 'exec-1', status: 'PENDING_APPROVAL' }] } },
    evidence: { data: { packs: [] } },
    executive: { summary: { valueMetrics: {}, confidence: {}, narrative: {} } },
  })
  const labels = data.openActions.map((item) => item.label)
  for (const expected of ['Connect tenant', 'Validate permissions', 'Run discovery', 'Review trust blockers', 'Approve dry runs', 'Generate evidence pack', 'Prepare executive review']) assert.equal(labels.includes(expected), true)
  assert.equal(data.overallReadiness, 'Blocked')
})

test('Overview survives missing data sources without crashing', () => {
  const data = buildPilotWorkspaceData({ workspace: { tenantName: 'Missing sources' }, runtime: { environment: 'LIVE' } })
  assert.equal(data.tenant.name, 'Missing sources')
  assert.equal(data.kpis.projectedAnnualValue, 0)
  assert.equal(data.kpis.verifiedAnnualValue, 0)
  assert.equal(data.openActions.length > 0, true)
  assert.equal(data.evidenceProof.packs.length, 0)
})
