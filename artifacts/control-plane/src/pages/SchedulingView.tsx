import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';

export default function SchedulingView() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(()=>{ (async()=>{ const data = await fetch('/api/schedules').then((r)=>r.json()).catch(()=>[]); setRows(Array.isArray(data)?data:[]); })(); },[]);
  return <Layout><div className='space-y-3'><h1 className='text-2xl font-semibold'>Scheduling Governance</h1>{rows.map((s)=><div key={s.scheduleId} className='border rounded p-3 text-sm'><div className='font-semibold'>{s.scheduleName}</div><div>Window: {s.changeWindowType} · {s.scheduledStart} → {s.scheduledEnd} ({s.timezone})</div><div>Scheduled risk level: {s.riskLevel}</div><div>Rollback coverage: {Math.round(Number(s.rollbackCoverage ?? 0))}% {Number(s.rollbackCoverage ?? 0)<100?'(Rollback coverage incomplete)':''}</div><div>Governance complexity: {Math.round(Number(s.governanceComplexity ?? 0))}</div><div>Approval readiness: {s.approvalReadiness}</div><div>State: {s.scheduleState}</div></div>)}</div></Layout>;
}
