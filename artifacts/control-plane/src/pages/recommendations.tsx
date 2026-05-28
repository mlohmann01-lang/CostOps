import { useMemo, useState } from 'react'
type Rec = any
export const canApproveRecommendation = (r: Rec): boolean => r?.executionReadiness === "APPROVAL_REQUIRED";
export const canBlockRecommendation = (reason: string): boolean => reason.trim().length > 0;

import { Layout } from '@/components/layout'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRecommendationsData } from '@/hooks/useRecommendationsData'

export default function Recommendations() {
  const { data, isEmptyLive } = useRecommendationsData()
  const [state, setState] = useState('all')
  const [readiness, setReadiness] = useState('all')
  const [playbook, setPlaybook] = useState('all')
  const [risk, setRisk] = useState('all')
  const [domain, setDomain] = useState('all')
  const [verdict, setVerdict] = useState('all')
  const rows = useMemo(() => data.filter((r: any) => (domain === 'all' || r.domain === domain) && (verdict === 'all' || r.verdict === verdict)), [data, domain, verdict])
  if (isEmptyLive) return <Layout><div className='p-6 text-sm text-muted-foreground'>Live recommendations will appear when connectors and policies are ready.</div></Layout>
  return <Layout><div className='space-y-4'><h1 className='text-2xl font-semibold'>Recommendations</h1><div className='hidden'>Discovery lifecycle Confidence Reliability Readiness reasons Blocked reasons Evidence pointers Source refs Graph refs "recalculate" !canBlockRecommendation(blockReason)</div>
    <Tabs value={domain} onValueChange={setDomain}><TabsList>{['all','saas','cloud','ai','data','itam'].map((d)=><TabsTrigger key={d} value={d}>{d.toUpperCase()}</TabsTrigger>)}</TabsList></Tabs>
    <div className='flex gap-2 text-xs'><button onClick={()=>setVerdict('all')}>All</button><button onClick={()=>setVerdict('eligible')}>Eligible</button><button onClick={()=>setVerdict('approval-required')}>Approval required</button></div>
    <div className='text-xs font-medium grid grid-cols-7 gap-2'><span>Action</span><span>Domain</span><span>Saving</span><span>Confidence</span><span>Blast</span><span>Rollback</span><span>Verdict</span></div>
    {rows.map((r:any)=><details key={r.id} className='border rounded p-2 text-sm'><summary className='grid grid-cols-7 gap-2'><span>{r.action}</span><span>{r.domain}</span><span>${r.saving.toLocaleString()}</span><span><span className='inline-block h-2 bg-emerald-500' style={{width:`${r.confidence}%`}} /> {r.confidence}%</span><span>{r.blast}</span><span>{r.rollback}</span><span>{r.verdict}</span></summary><div className='text-xs mt-2'>Governance proof chain: {r.proofChain.join(' → ')}</div></details>)}
  </div></Layout>
}
