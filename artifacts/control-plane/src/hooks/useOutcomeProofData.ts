import { useWorkspace } from '../lib/workspaceContext'
import { useDemoRuntimeStore } from '../lib/demoRuntimeStore'
import { emptyOutcomes, normalizeOutcomes } from '../lib/liveNormalizers'
import { useLiveResource } from './useLiveResource'

export function useOutcomeProofData(): any {
  const workspace = useWorkspace()
  const demo = useDemoRuntimeStore()
  const live = useLiveResource({ path: ['/api/outcomes/proof', '/api/outcomes/proof/summary'], enabled: workspace.mode === 'live', initialData: emptyOutcomes, normalizer: normalizeOutcomes, isEmpty: (data) => data.ledger.length === 0 && data.stats.length === 0 })
  if (workspace.mode === 'demo') {
    return { isEmptyLive: false, data: normalizeOutcomes({ proofs: demo.outcomes.ledger, summary: { projectedMonthlySavings: demo.outcomes.stats[0], verifiedMonthlySavings: demo.outcomes.stats[1], savingsVarianceMonthly: demo.outcomes.stats[2], verificationBacklogCount: demo.outcomes.stats[3], verificationFailedCount: demo.outcomes.stats[4], driftedOutcomeCount: demo.outcomes.stats[5] } }), loading: false, error: null, refresh: () => Promise.resolve(demo.outcomes) }
  }
  return { isEmptyLive: !workspace.dataReady || live.isEmpty, data: live.data, loading: live.loading, error: live.error, refresh: live.refresh }
}
