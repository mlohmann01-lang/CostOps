import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';

export default function ApprovalWorkflowsView() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(()=>{ (async()=>{ const data=await fetch('/api/approval-workflows').then((r)=>r.json()).catch(()=>[]); setRows(Array.isArray(data)?data:[]); })(); },[]);
  return <Layout><div className='space-y-3'><h1 className='text-2xl font-semibold'>Approval Workflows</h1>{rows.map((w)=><div key={w.workflowId} className='border rounded p-3 text-sm'><div className='font-semibold'>{w.workflowName}</div><div>Target: {w.targetType} · {w.targetId}</div><div>Current stage: {w.currentStage+1}/{w.approvalStages?.length ?? 0}</div><div>State: {w.approvalState}</div><div>{w.approvalState==='ESCALATED'?'Escalated due to timeout':''}</div><div>{(w.approvalStages?.[w.currentStage]?.requiredRoles ?? []).includes('SECURITY')?'Security approval required':''}</div><div>{(w.approvalStages?.[w.currentStage]?.requiredRoles ?? []).includes('CAB')?'Awaiting CAB approval':''}</div><div>{w.delegatedApprovalAllowed?'Delegated approval active':''}</div><div>{w.separationOfDutiesRequired?'Separation-of-duties enforced':''}</div><div>Expiry: {w.approvalExpiryAt}</div></div>)}</div></Layout>;
}
