import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { NAV_GROUPS } from '../components/layout/Sidebar'
import { approvalCenterApiPaths, demoApprovalCenterData, demoApprovalRequests, summarizeApprovals, buildDemoApprovalDetail, type ApprovalRequestDetail } from '../hooks/useApprovalCenterData'
import { approvalCenterTabs } from '../pages/ApprovalCenter'

const read = (path: string) => fs.readFileSync(new URL(path, import.meta.url), 'utf8')

test('Approval Center route exists', () => {
  const app = read('../App.tsx')
  assert.equal(app.includes("import ApprovalCenter from './pages/ApprovalCenter'"), true)
  assert.equal(app.includes('function ApprovalCenterRoute()'), true)
  assert.equal(app.includes('<Route path="/approvals" component={ApprovalCenterRoute} />'), true)
})

test('Approval Center navigation entry exists', () => {
  const autoExecution = NAV_GROUPS.find((group) => group.label === 'Auto Execution')
  assert.equal(autoExecution?.items.some((item) => item.label === 'Approval Center' && item.href === '/approvals'), true)
})

test('dashboard cards render', () => {
  const page = read('../pages/ApprovalCenter.tsx')
  for (const label of ['Pending', 'Approved', 'Rejected', 'Expired', 'Awaiting Executive', 'Awaiting CAB', 'Monthly Value Awaiting Approval', 'Annual Value Awaiting Approval']) assert.equal(page.includes(label), true)
  assert.equal(page.includes("data-testid='approval-summary'"), true)
})

test('approval tabs render', () => {
  const labels = approvalCenterTabs.map((tab) => tab.label)
  for (const label of ['Pending', 'Awaiting My Approval', 'CAB', 'Executive', 'Approved', 'Rejected', 'Expired']) assert.equal(labels.includes(label), true)
})

test('request detail renders', () => {
  const page = read('../pages/ApprovalCenter.tsx')
  for (const label of ['Approval Request Detail', 'Action', 'Title', 'Domain', 'Value', 'Risk', 'Blast Radius', 'Rollback']) assert.equal(page.includes(label), true)
})

test('Trust Authority section renders', () => {
  const page = read('../pages/ApprovalCenter.tsx')
  for (const label of ['Trust Authority', 'Verdict', 'Confidence', 'Blockers', 'Missing Evidence']) assert.equal(page.includes(label), true)
})

test('Evidence section renders', () => {
  const page = read('../pages/ApprovalCenter.tsx')
  assert.equal(page.includes("data-testid='approval-evidence-section'"), true)
  for (const label of ['Evidence Count', 'Evidence IDs']) assert.equal(page.includes(label), true)
})

test('Approval actions render', () => {
  const page = read('../pages/ApprovalCenter.tsx')
  assert.equal(page.includes("data-testid='approval-actions'"), true)
  for (const label of ['Approve', 'Reject', 'Cancel']) assert.equal(page.includes(label), true)
})

test('demo mode disables approval', () => {
  const page = read('../pages/ApprovalCenter.tsx')
  assert.equal(page.includes('Demo Mode · Approval actions disabled'), true)
  assert.equal(page.includes('disabled={isDemo}'), true)
})

test('narrative renders', () => {
  const page = read('../pages/ApprovalCenter.tsx')
  assert.equal(page.includes('Approval Dashboard Narrative'), true)
  assert.equal(page.includes('actions are awaiting approval'), true)
})

test('hook uses approval authority APIs and demo fallback', () => {
  const hook = read('../hooks/useApprovalCenterData.ts')
  assert.deepEqual(approvalCenterApiPaths, ['/api/approval-authority/dashboard', '/api/approval-authority/requests/:id'])
  assert.equal(hook.includes("liveFetch<ApprovalDashboard>('/api/approval-authority/dashboard')"), true)
  assert.equal(hook.includes("`/api/approval-authority/requests/${id}`"), true)
  assert.equal(hook.includes("`/api/approval-authority/requests/${id}/${decision}`"), true)
  assert.equal(demoApprovalCenterData.isDemo, true)
  assert.equal(summarizeApprovals(demoApprovalRequests).pending >= 3, true)
})

test('No LeftShield labels', () => {
  const page = read('../pages/ApprovalCenter.tsx')
  const hook = read('../hooks/useApprovalCenterData.ts')
  assert.equal(page.includes('LeftShield'), false)
  assert.equal(hook.includes('LeftShield'), false)
})

test('No Agent Security Analytics labels', () => {
  const page = read('../pages/ApprovalCenter.tsx')
  const hook = read('../hooks/useApprovalCenterData.ts')
  assert.equal(page.includes('Agent Security Analytics'), false)
  assert.equal(hook.includes('Agent Security Analytics'), false)
})

test('demo mode returns DEMO dataState for approval detail', () => {
  const detail: ApprovalRequestDetail = buildDemoApprovalDetail('appr-standard')
  assert.equal(detail.dataState, 'DEMO')
})

test('fetchApprovalDetail does not fall back to demo data on NOT_CONNECTED or error', () => {
  const hook = read('../hooks/useApprovalCenterData.ts')
  // The detail-fetch function must check dataReady and tag NOT_CONNECTED before any live fetch attempt.
  assert.equal(hook.includes("if (!workspace.dataReady) return unavailableApprovalDetail(id, data.requests.find((r) => r.id === id), 'NOT_CONNECTED')"), true)
  // Error path must use unavailableApprovalDetail with NO_DATA + the real error message, never demo data.
  assert.equal(hook.includes("return unavailableApprovalDetail(id, data.requests.find((r) => r.id === id), 'NO_DATA', normalizeApiError(error).message)"), true)
  // Successful live fetch must be explicitly tagged LIVE/NO_DATA, not assumed to be demo-shaped.
  assert.equal(hook.includes("dataState: detail?.request ? 'LIVE' : 'NO_DATA'"), true)
  // buildDemoApprovalDetail must only be reachable from the explicit demo-mode branch.
  const fnMatch = hook.match(/const fetchApprovalDetail = useCallback\([\s\S]*?\}, \[data\.isDemo, data\.requests, workspace\.mode, workspace\.dataReady\]\)/)
  assert.ok(fnMatch, 'fetchApprovalDetail must have the expected dependency array')
  const catchOnly = fnMatch![0].slice(fnMatch![0].indexOf('} catch (error) {'))
  assert.equal(catchOnly.includes('buildDemoApprovalDetail'), false, 'catch block must never return demo data')
})

test('approval request detail surfaces dataState for non-LIVE non-DEMO states', () => {
  const page = read('../pages/ApprovalCenter.tsx')
  assert.equal(page.includes("data-testid='approval-detail-data-state'"), true)
  assert.equal(page.includes("detail.dataState !== 'LIVE' && detail.dataState !== 'DEMO'"), true)
})
