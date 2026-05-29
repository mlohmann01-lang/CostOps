import { Layout } from '@/components/layout'
import { LiveDataError } from '@/components/shared/Foundation'
import { useApprovalWorkflowsData } from '@/hooks/useApprovalWorkflowsData'
import { simulateApprove, simulateRejectApproval } from '@/lib/demoRuntimeStore'
import { useWorkspace } from '@/lib/workspaceContext'
import { liveFetch } from '@/lib/liveApi'
import { broadcastLiveReadRefresh } from '@/lib/recommendationApprovalBridge'
import { useState } from 'react'

export default function ApprovalWorkflowsView() {
  const workspace = useWorkspace()
  const [notice, setNotice] = useState('')
  const [liveError, setLiveError] = useState('')
  const { data, isEmptyLive, error, refresh } = useApprovalWorkflowsData()
  if (error) return <Layout><LiveDataError error={error} onRetry={refresh} /></Layout>
  if (isEmptyLive) return <Layout><div className='p-6 text-sm text-muted-foreground'>Live approvals will appear when governance queues are available.</div></Layout>
  const approveLive = async (workflowId: string, stage = '', approver = 'OWNER') => {
    setNotice(''); setLiveError('')
    try {
      await liveFetch(`/api/approval-workflows/${encodeURIComponent(workflowId)}/approve`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ actorId: `operator-${String(stage).toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'approval'}`, actorRoles: String(approver).split(',').map((role) => role.trim()).filter(Boolean) }) })
      setNotice('Approval granted')
      broadcastLiveReadRefresh()
      await refresh()
    } catch (err) { setLiveError(`Live data unavailable: ${err instanceof Error ? err.message : String(err)}`) }
  }
  return <Layout><div className='space-y-4'><h1 className='text-2xl font-semibold'>Approval Workflows</h1>{notice && <div role='status'>{notice}</div>}{liveError && <div role='alert'>{liveError}</div>}<div className='text-sm'>Pending {data.summary.pending} · Approved today {data.summary.approvedToday} · Escalated {data.summary.escalated}</div>
    <h2 className='font-medium'>Pending approvals</h2>{data.pending.map((p:any)=><div key={p.id} className='border rounded p-2 text-sm'>{p.item} · stage {p.stage} · approver {p.approver} · {p.sla} · {workspace.mode === 'demo' ? <><button onClick={() => simulateApprove(p.actionId ?? p.item)}>Simulate approval</button> <button onClick={() => simulateRejectApproval(p.actionId ?? p.item)}>Reject</button></> : <button onClick={() => approveLive(p.id, p.stage, p.approver)}>Approve</button>}</div>)}
    <h2 className='font-medium'>History</h2>{data.history.map((h:any)=><div key={h.id} className='border rounded p-2 text-sm'>{h.item} · {h.result} · {h.approver}</div>)}
  </div></Layout>
}
