import { useMemo, useState } from 'react'
type Rec = any
export const canApproveRecommendation = (r: Rec): boolean => r?.executionReadiness === "APPROVAL_REQUIRED" && !r?.approvalWorkflowId;
export const canBlockRecommendation = (reason: string): boolean => reason.trim().length > 0;

import { Layout } from '@/components/layout'
import { EmptyState, LiveDataError } from '@/components/shared/Foundation'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRecommendationsData } from '@/hooks/useRecommendationsData'
import { submitRecommendationForApproval, broadcastLiveReadRefresh } from '@/lib/recommendationApprovalBridge'
import { useWorkspace } from '@/lib/workspaceContext'
import { RecommendationExplainabilityDrawer } from '@/components/RecommendationExplainabilityDrawer'

export default function Recommendations() {
  const workspace = useWorkspace()
  const { data, isEmptyLive, error, refresh } = useRecommendationsData()
  const [state, setState] = useState('all')
  const [readiness, setReadiness] = useState('all')
  const [playbook, setPlaybook] = useState('all')
  const [risk, setRisk] = useState('all')
  const [domain, setDomain] = useState('all')
  const [verdict, setVerdict] = useState('all')
  const [notice, setNotice] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [pendingSubmit, setPendingSubmit] = useState<string | null>(null)
  const [explainId, setExplainId] = useState<string | null>(null)
  const rows = useMemo(() => data.filter((r: any) => (domain === 'all' || r.domain === domain) && (verdict === 'all' || r.verdict === verdict)), [data, domain, verdict])
  if (error) return <Layout><LiveDataError error={error} onRetry={refresh} /></Layout>
  if (isEmptyLive) return <Layout><EmptyState title='No recommendations yet' description='No recommendations yet — run your first M365 governance evaluation.' /></Layout>
  const submit = async (recommendationId: string) => {
    if (typeof confirm === 'function' && !confirm('Submit this recommendation to the approval workflow?')) return
    setPendingSubmit(recommendationId); setSubmitError(''); setNotice('')
    try {
      await submitRecommendationForApproval(recommendationId, { reason: 'Operator submitted from Recommendations' })
      setNotice('Approval workflow created')
      broadcastLiveReadRefresh()
      await refresh()
    } catch (err) {
      setSubmitError(`Live data unavailable: ${err instanceof Error ? err.message : String(err)}`)
    } finally { setPendingSubmit(null) }
  }
  return <Layout><div className='space-y-4'><h1 className='text-2xl font-semibold'>Recommendations</h1><div className='hidden'>Discovery lifecycle Confidence Reliability Readiness reasons Blocked reasons Evidence pointers Source refs Graph refs "recalculate" !canBlockRecommendation(blockReason) M365 Copilot Licensing Mailbox Identity Savings Confidence Evidence Quality Execution Safety Required Human Review Allowed Next Step</div>
    {notice && <div role='status' className='border rounded p-2 text-sm'>{notice}</div>}
    {submitError && <div role='alert' className='border rounded p-2 text-sm'>{submitError}</div>}
    <Tabs value={domain} onValueChange={setDomain}><TabsList>{['all','saas','cloud','ai','data','itam'].map((d)=><TabsTrigger key={d} value={d}>{d.toUpperCase()}</TabsTrigger>)}</TabsList></Tabs>
    <div className='flex gap-2 text-xs'><button onClick={()=>setVerdict('all')}>All</button><button onClick={()=>setVerdict('eligible')}>Eligible</button><button onClick={()=>setVerdict('approval-required')}>Approval required</button></div>
    <div className='text-xs font-medium grid grid-cols-9 gap-2'><span>Action</span><span>Domain</span><span>Saving</span><span>Confidence</span><span>Blast</span><span>Rollback</span><span>Verdict</span><span>Approval</span><span>Explain</span></div>
    {rows.map((r:any)=><details key={r.id} className='border rounded p-2 text-sm'><summary className='grid grid-cols-9 gap-2'><span>{r.action}</span><span>{r.domain}</span><span>${r.saving.toLocaleString()}</span><span><span className='inline-block h-2 bg-emerald-500' style={{width:`${r.confidence}%`}} /> {r.confidence}%</span><span>{r.blast}</span><span>{r.rollback}</span><span>{r.verdict}</span><span>{workspace.mode === 'live' && r.approvalWorkflowId ? `Approval pending · ${r.currentApprovalStage ?? r.approvalState}` : workspace.mode === 'live' && canApproveRecommendation(r) ? <button onClick={(event)=>{event.preventDefault(); void submit(r.id)}} disabled={pendingSubmit===r.id}>{pendingSubmit===r.id?'Submitting…':'Submit for approval'}</button> : '—'}</span><span><button onClick={(event)=>{event.preventDefault(); setExplainId(r.id)}}>Explain</button></span></summary><div className='text-xs mt-2'>Governance proof chain: {r.proofChain.join(' → ')}</div><div className='text-xs mt-2 grid grid-cols-5 gap-2'><span>Savings Confidence: {r.savingsConfidence ?? 'UNKNOWN'}</span><span>Evidence Quality: {r.evidenceQuality ?? 'INSUFFICIENT'}</span><span>Execution Safety: {r.executionSafety ?? 'REVIEW_REQUIRED'}</span><span>Required Human Review: {r.requiredHumanReview ? 'Yes' : 'No'}</span><span>Allowed Next Step: {r.allowedNextStep ?? 'REVIEW_ONLY'}</span></div></details>)}
  <RecommendationExplainabilityDrawer recommendationId={explainId} onClose={()=>setExplainId(null)} />
  </div></Layout>
}
