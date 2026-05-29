import { Layout } from '@/components/layout'
import { LiveDataError } from '@/components/shared/Foundation'
import { useCampaignsData } from '@/hooks/useCampaignsData'

export default function CampaignsView() {
  const { data, isEmptyLive, error, refresh } = useCampaignsData()
  if (error) return <Layout><LiveDataError error={error} onRetry={refresh} /></Layout>
  if (isEmptyLive) return <Layout><div className='p-6 text-sm text-muted-foreground'>Live campaigns will appear when orchestration data is ready.</div></Layout>
  const projected = data.reduce((a:any,c:any)=>a+c.projectedSavings,0)
  return <Layout><div className='space-y-4'><h1 className='text-2xl font-semibold'>Campaigns</h1><div className='text-sm'>4 campaigns · Projected savings ${projected.toLocaleString()}</div>
    {data.map((c:any)=><div key={c.id} className='border rounded p-3 text-sm'><div className='font-semibold'>{c.name}</div><div>Projected savings ${c.projectedSavings.toLocaleString()}</div><div className='h-2 bg-muted rounded'><div className='h-2 bg-blue-500 rounded' style={{width:`${c.progress}%`}} /></div><div>Approvals: pending {c.approvals.pending} · approved {c.approvals.approved} · blocked {c.approvals.blocked}</div><div className='text-xs'>[View] [Request Approval]</div></div>)}
  </div></Layout>
}
