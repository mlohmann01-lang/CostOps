import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  getDemoRuntimeState,
  resetDemoRuntimeStore,
  simulateApprove,
  simulateConnectorRetry,
  simulateExecution,
  simulateResolveDrift,
} from './demoRuntimeStore'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

test('approve action moves item into execution queue', () => {
  resetDemoRuntimeStore()
  simulateApprove('2')
  const state = getDemoRuntimeState()
  assert.equal(state.actions.find((action) => action.id === '2')?.verdict, 'approved')
  assert.equal(state.approvals.pending.some((item: any) => item.actionId === '2'), false)
  assert.equal(state.execution.awaiting.some((item: any) => item.actionId === '2'), true)
})

test('approval appends evidence event', () => {
  resetDemoRuntimeStore()
  simulateApprove('2')
  const titles = getDemoRuntimeState().evidenceAudit.timeline.map((event) => event.title)
  assert.equal(titles.includes('Approval granted'), true)
})

test('execution simulation moves awaiting to completed', async () => {
  resetDemoRuntimeStore()
  const executionId = getDemoRuntimeState().execution.awaiting[0].id
  simulateExecution(executionId)
  assert.equal(getDemoRuntimeState().executingIds[executionId], 'QUEUED_FOR_EXECUTION')
  await wait(1400)
  const state = getDemoRuntimeState()
  assert.equal(state.execution.awaiting.some((item) => item.id === executionId), false)
  assert.equal(state.execution.completed.some((item) => item.id === `completed-${executionId}`), true)
})

test('execution appends outcome and evidence events', async () => {
  resetDemoRuntimeStore()
  const execution = getDemoRuntimeState().execution.awaiting[0]
  simulateExecution(execution.id)
  await wait(1400)
  const state = getDemoRuntimeState()
  assert.equal(state.outcomes.ledger.some((item) => item.action === execution.action && item.state === 'Verified'), true)
  const titles = state.evidenceAudit.timeline.map((event) => event.title)
  assert.equal(titles.includes('Execution simulated'), true)
  assert.equal(titles.includes('Outcome verified'), true)
})

test('drift resolution updates alert and summary', () => {
  resetDemoRuntimeStore()
  simulateResolveDrift('d1')
  const state = getDemoRuntimeState()
  const alert = state.drift.find((item) => item.id === 'd1')
  assert.equal(alert?.status, 'Resolved')
  assert.equal(alert?.atRisk, 0)
  assert.match(state.posture.find((item) => item.id === 'drift')?.value ?? '', /active drift/)
})

test('connector retry updates activity stream', async () => {
  resetDemoRuntimeStore()
  simulateConnectorRetry('m365')
  assert.equal(getDemoRuntimeState().connectorOps.connectors.find((connector) => connector.id === 'm365')?.status, 'testing')
  await wait(1200)
  const state = getDemoRuntimeState()
  assert.equal(state.activity.some((event) => event.message.includes('Connector retry completed for M365')), true)
})

test('Command activity stream renders', () => {
  resetDemoRuntimeStore()
  const source = fs.readFileSync(new URL('../pages/CommandView.tsx', import.meta.url), 'utf8')
  // Overview/Command page now surfaces runtime activity through the "What Changed" section,
  // sourced from useRuntimeEvents, rather than a dedicated 'command-live-activity' widget.
  assert.equal(source.includes("data-testid='what-changed'"), true)
  assert.equal(source.includes('useRuntimeEvents'), true)
  assert.equal(getDemoRuntimeState().activity.some((event) => event.message === 'Snowflake auto-suspend verified'), true)
})

test('no live API calls in demo mode hooks', () => {
  const hookFiles = [
    '../hooks/useCommandData.ts', '../hooks/useRecommendationsData.ts', '../hooks/useApprovalWorkflowsData.ts', '../hooks/useExecutionData.ts', '../hooks/useCampaignsData.ts',
    // useOutcomesData.ts is now a thin delegate to useOutcomeProofData.ts, which holds the actual demo/live branching.
    '../hooks/useGovernanceData.ts', '../hooks/useEvidenceAuditData.ts', '../hooks/useOutcomeProofData.ts', '../hooks/useDriftData.ts', '../hooks/useRuntimeHealthData.ts', '../hooks/useConnectorOpsData.ts',
  ]
  for (const rel of hookFiles) {
    const body = fs.readFileSync(new URL(rel, import.meta.url), 'utf8')
    assert.equal(body.includes('fetch('), false, rel)
    assert.equal(body.includes("workspace.mode === 'demo'") || body.includes("w.mode==='demo'"), true, rel)
  }
})

test('live mode remains empty-state/API driven', () => {
  // CommandView (now the Overview/Executive Brief page) sources its data from
  // useExecutiveValueData/useExecutivePrioritiesData/useRuntimeEvents, not useCommandData;
  // it surfaces empty states per section rather than a single 'No actions identified yet' message.
  const commandView = fs.readFileSync(new URL('../pages/CommandView.tsx', import.meta.url), 'utf8')
  assert.equal(commandView.includes('No executive priorities available.'), true)
  assert.equal(commandView.includes('No significant changes in the last 24 hours.'), true)
  assert.equal(commandView.includes('DataStateBanner'), true)
})
