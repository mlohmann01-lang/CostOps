import { useCallback, useEffect, useMemo, useState } from 'react'
import { demoM365GoLiveChecklist, demoM365Onboarding } from '../data/demo'
import { liveFetch, normalizeApiError } from '../lib/liveApi'
import { useWorkspace } from '../lib/workspaceContext'

type PilotMode = 'READ_ONLY' | 'DRY_RUN' | 'CONTROLLED_EXECUTION'

export function useM365OnboardingData() {
  const workspace = useWorkspace()
  const [onboarding, setOnboarding] = useState<any>(demoM365Onboarding)
  const [checklist, setChecklist] = useState<any>(demoM365GoLiveChecklist)
  const [summary, setSummary] = useState<any>({ status: demoM365Onboarding.status, checklist: demoM365GoLiveChecklist.summary })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    if (workspace.mode === 'demo') {
      setOnboarding(demoM365Onboarding); setChecklist(demoM365GoLiveChecklist); setSummary({ status: demoM365Onboarding.status, checklist: demoM365GoLiveChecklist.summary }); setError(null); return demoM365Onboarding
    }
    setLoading(true)
    try {
      const [nextOnboarding, nextChecklist, nextSummary] = await Promise.all([liveFetch('/api/onboarding/m365'), liveFetch('/api/onboarding/m365/go-live-checklist'), liveFetch('/api/onboarding/m365/summary')])
      setOnboarding(nextOnboarding); setChecklist(nextChecklist); setSummary(nextSummary); setError(null); return nextOnboarding
    } catch (err) {
      const next = normalizeApiError(err); setError(next); throw next
    } finally { setLoading(false) }
  }, [workspace.mode])

  useEffect(() => { void refresh().catch(() => undefined) }, [refresh])

  const post = useCallback(async (path: string, body?: any) => {
    if (workspace.mode === 'demo') return refresh()
    setLoading(true)
    try { const payload = await liveFetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); setOnboarding(payload); await refresh(); return payload } catch (err) { const next = normalizeApiError(err); setError(next); throw next } finally { setLoading(false) }
  }, [workspace.mode, refresh])

  return useMemo(() => ({ onboarding, checklist, summary, loading, error, refresh, start: () => post('/api/onboarding/m365/start'), runReadiness: () => post('/api/onboarding/m365/readiness-check'), runDiscovery: () => post('/api/onboarding/m365/discovery'), runTrust: () => post('/api/onboarding/m365/trust-assessment'), runOpportunities: () => post('/api/onboarding/m365/opportunity-assessment'), setPilotMode: (mode: PilotMode) => post('/api/onboarding/m365/pilot-mode', { mode }) }), [onboarding, checklist, summary, loading, error, refresh, post])
}
