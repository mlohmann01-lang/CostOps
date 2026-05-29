import { Layout } from '@/components/layout'
import { LiveDataError } from '@/components/shared/Foundation'
import { useSchedulingData } from '@/hooks/useSchedulingData'

export default function SchedulingView() {
  const { data, isEmptyLive, error, refresh } = useSchedulingData()
  if (error) return <Layout><LiveDataError error={error} onRetry={refresh} /></Layout>
  if (isEmptyLive) return <Layout><div className='p-6 text-sm text-muted-foreground'>Live scheduling windows appear when runtime dependencies are connected.</div></Layout>
  return <Layout><div className='space-y-4'><h1 className='text-2xl font-semibold'>Scheduling</h1><div className='text-sm'>Upcoming {data.summary.upcoming} · Past {data.summary.completed}</div>
  <h2 className='font-medium'>Upcoming windows</h2>{data.upcoming.map((w:any)=><div key={w.id} className='border rounded p-2 text-sm'>{w.name} · readiness {w.readiness} · rollback {w.rollback} · risk {w.risk} · deps {w.dependencies} · [Simulate] [Open Runbook]</div>)}
  <h2 className='font-medium'>Past windows</h2>{data.past.map((w:any)=><div key={w.id} className='border rounded p-2 text-sm'>{w.name} · readiness {w.readiness} · rollback {w.rollback} · risk {w.risk} · deps {w.dependencies}</div>)}
  </div></Layout>
}
