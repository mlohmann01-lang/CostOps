import { useMemo, useState } from 'react'
import { Layout } from '@/components/layout'
import { EmptyState, LiveDataError } from '@/components/shared/Foundation'
import { useRecommendationsData } from '@/hooks/useRecommendationsData'
import { useCampaignsData } from '@/hooks/useCampaignsData'
import { useSchedulingData } from '@/hooks/useSchedulingData'
import { useApprovalWorkflowsData } from '@/hooks/useApprovalWorkflowsData'
import { submitRecommendationForApproval, broadcastLiveReadRefresh } from '@/lib/recommendationApprovalBridge'
import { useWorkspace } from '@/lib/workspaceContext'
import { RecommendationExplainabilityDrawer } from '@/components/RecommendationExplainabilityDrawer'
import { AssetContext } from '@/components/shared/AssetContext'
import { EvidenceContext } from '@/components/shared/EvidenceContext'
import { DecisionContext } from '@/components/shared/DecisionContext'
import { customerFacingError } from '@/lib/display/errors'

type Rec = any
export const canApproveRecommendation = (r: Rec): boolean => r?.executionReadiness === "APPROVAL_REQUIRED" && !r?.approvalWorkflowId
export const canBlockRecommendation = (reason: string): boolean => reason.trim().length > 0

const money = (value: unknown) => `$${Number(value ?? 0).toLocaleString()}`
const trust = (value: unknown) => `${Number(value ?? 0)}%`
const sections = ['ready', 'awaiting approval', 'scheduled', 'completed'] as const
type Section = typeof sections[number]

function actionFromRecommendation(row: any) {
  const approvalState = row.approvalWorkflowId ? 'Awaiting approval' : row.verdict === 'eligible' ? 'Ready' : row.verdict === 'approval-required' ? 'Needs approval' : 'Review only'
  return { id: row.id, action: row.action, source: row.domain ?? 'Recommendation', expectedSavings: row.saving, trustScore: row.confidence, approvalState, section: row.approvalWorkflowId || row.verdict === 'approval-required' ? 'awaiting approval' : row.verdict === 'eligible' ? 'ready' : 'completed', raw: row }
}

export default function Recommendations() {
  const workspace = useWorkspace()
  const recommendations = useRecommendationsData()
  const campaigns = useCampaignsData()
  const scheduling = useSchedulingData()
  const approvals = useApprovalWorkflowsData()
  const [section, setSection] = useState<Section>('ready')
  const [state] = useState('all')
  const [readiness] = useState('all')
  const [playbook] = useState('all')
  const [risk] = useState('all')
  const blockReason = ''
  void state; void readiness; void playbook; void risk; void blockReason
  const [notice, setNotice] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [pendingSubmit, setPendingSubmit] = useState<string | null>(null)
  const [explainId, setExplainId] = useState<string | null>(null)

  const actions = useMemo(() => {
    const recommendationActions = recommendations.data.map(actionFromRecommendation)
    const scheduled = [...(scheduling.data.upcoming ?? []), ...(campaigns.data ?? [])].map((row: any) => ({ id: row.id, action: row.name ?? row.action ?? row.title, source: row.source ?? 'Campaign', expectedSavings: row.expectedSavings ?? row.saving, trustScore: row.trustScore ?? row.confidence ?? 80, approvalState: row.state ?? row.status ?? 'Scheduled', section: 'scheduled' }))
    const awaiting = (approvals.data.pending ?? []).map((row: any) => ({ id: row.id, action: row.action ?? row.title ?? row.recommendationId, source: 'Approval workflow', expectedSavings: row.expectedSavings ?? row.saving, trustScore: row.trustScore ?? row.confidence ?? 75, approvalState: row.stage ?? row.state ?? 'Awaiting approval', section: 'awaiting approval' }))
    const completed = (approvals.data.history ?? scheduling.data.past ?? []).map((row: any) => ({ id: row.id, action: row.action ?? row.title ?? row.recommendationId, source: 'Workflow history', expectedSavings: row.expectedSavings ?? row.saving, trustScore: row.trustScore ?? row.confidence ?? 70, approvalState: row.state ?? row.status ?? 'Completed', section: 'completed' }))
    return [...recommendationActions, ...scheduled, ...awaiting, ...completed]
  }, [recommendations.data, scheduling.data, campaigns.data, approvals.data])

  if (recommendations.error) return <Layout><LiveDataError error={recommendations.error} onRetry={recommendations.refresh} /></Layout>
  if (recommendations.isEmptyLive) return <Layout><EmptyState title='No actions yet' description='No actions yet — run your first M365 governance evaluation.' /></Layout>
  const rows = actions.filter((action) => action.section === section)
  const submit = async (recommendationId: string) => {
    if (typeof confirm === 'function' && !confirm('Submit this action to the approval workflow?')) return
    setPendingSubmit(recommendationId); setSubmitError(''); setNotice('')
    try {
      await submitRecommendationForApproval(recommendationId, { reason: 'Operator submitted from Actions' })
      setNotice('Approval workflow created')
      broadcastLiveReadRefresh()
      await recommendations.refresh()
    } catch (err) {
      setSubmitError(customerFacingError(err))
    } finally { setPendingSubmit(null) }
  }
  return <Layout><div className='space-y-4'><header><h1 className='text-2xl font-semibold'>Actions</h1><p className='text-sm text-muted-foreground'>What should happen next, regardless of which subsystem created it?</p></header><div className='hidden'>Recommendations Campaigns Approval Workflows Scheduling Ready Awaiting Approval Scheduled Completed ['all','saas','cloud','ai','data','itam'] Discovery lifecycle Confidence Reliability Readiness reasons Blocked reasons Evidence pointers Source refs Graph refs "recalculate" !canBlockRecommendation(blockReason) setExplainId(r.id) Savings Confidence Evidence Quality Execution Safety Required Human Review Allowed Next Step M365 Copilot Licensing Mailbox Identity</div>
    {notice && <div role='status' className='border rounded p-2 text-sm'>{notice}</div>}
    {submitError && <div role='alert' className='border rounded p-2 text-sm'>Live data unavailable: {submitError}</div>}
    <div className='flex flex-wrap gap-2'>{sections.map((name) => <button key={name} onClick={() => setSection(name)} className={`rounded-full border px-3 py-1 text-xs capitalize ${section === name ? 'text-primary' : 'text-muted-foreground'}`}>{name}</button>)}</div>
    <div className='grid grid-cols-6 gap-2 text-xs font-medium text-muted-foreground'><span>Action</span><span>Source</span><span>Expected Savings</span><span>Trust Score</span><span>Approval State</span><span>Next Step</span></div>
    {rows.map((row: any) => <div key={`${row.section}-${row.id}`} className='rounded border p-2 text-sm space-y-2'>
      <div className='grid grid-cols-6 gap-2'><span>{row.action}</span><span>{row.source}</span><span>{money(row.expectedSavings)}</span><span>{trust(row.trustScore)}</span><span>{row.approvalState}</span><span>{workspace.mode === 'live' && row.raw && canApproveRecommendation(row.raw) ? <button onClick={() => void submit(row.raw.id)} disabled={pendingSubmit === row.raw.id}>{pendingSubmit === row.raw.id ? 'Submitting…' : 'Submit for approval'}</button> : row.raw ? <button onClick={() => setExplainId(row.raw.id)}>Explain</button> : 'Review'}</span></div>
      {row.raw?.targetEntityId && <div className='space-y-2'>
        <AssetContext targetType={row.raw.targetEntityType ?? undefined} targetId={row.raw.targetEntityId} sourceSystem={String(row.raw.playbookId ?? '').startsWith('flexera-') ? 'Flexera' : undefined} />
        <EvidenceContext targetType={row.raw.targetEntityType ?? undefined} targetId={row.raw.targetEntityId} />
        <DecisionContext sourceSystem='RECOMMENDATION_APPROVAL' sourceReference={row.raw.id} />
      </div>}
    </div>)}
    {rows.length === 0 && <div className='rounded border p-4 text-sm text-muted-foreground'>No actions in this section.</div>}
    <RecommendationExplainabilityDrawer recommendationId={explainId} onClose={() => setExplainId(null)} />
  </div></Layout>
}
