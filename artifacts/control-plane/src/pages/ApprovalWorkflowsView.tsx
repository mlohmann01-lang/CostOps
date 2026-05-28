import { Layout } from '@/components/layout'
import { useApprovalWorkflowsData } from '@/hooks/useApprovalWorkflowsData'

export default function ApprovalWorkflowsView() {
  const { data, isEmptyLive } = useApprovalWorkflowsData()
  if (isEmptyLive) return <Layout><div className='p-6 text-sm text-muted-foreground'>Live approvals will appear when governance queues are available.</div></Layout>
  return <Layout><div className='space-y-4'><h1 className='text-2xl font-semibold'>Approval Workflows</h1><div className='text-sm'>Pending {data.summary.pending} · Approved today {data.summary.approvedToday} · Escalated {data.summary.escalated}</div>
    <h2 className='font-medium'>Pending approvals</h2>{data.pending.map((p:any)=><div key={p.id} className='border rounded p-2 text-sm'>{p.item} · stage {p.stage} · approver {p.approver} · {p.sla} · [Simulate Approve] [Simulate Reject]</div>)}
    <h2 className='font-medium'>History</h2>{data.history.map((h:any)=><div key={h.id} className='border rounded p-2 text-sm'>{h.item} · {h.result} · {h.approver}</div>)}
  </div></Layout>
}
