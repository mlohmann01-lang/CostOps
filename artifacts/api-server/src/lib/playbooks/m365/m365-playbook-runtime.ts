import { platformEventService } from '../../events/platform-event-service'
import { m365SnapshotRepository } from '../../connectors/m365/m365-snapshot-repository'
import { buildDefaultM365PlaybookRegistry, type M365PlaybookRegistry } from './m365-playbook-registry'
import type { M365ConfidenceBand, M365PlaybookResult, M365PlaybookRunSummary } from './m365-playbook-types'

const summaries = new Map<string, M365PlaybookRunSummary>()
function bandFromScores(bands: M365ConfidenceBand[]): M365ConfidenceBand { return bands.includes('LOW') ? 'LOW' : bands.includes('MEDIUM') ? 'MEDIUM' : 'HIGH' }

export async function runPlaybook(tenantId: string, snapshotId: string, playbookId: string, input?: { registry?: M365PlaybookRegistry }): Promise<M365PlaybookResult> {
  const registry = input?.registry ?? buildDefaultM365PlaybookRegistry()
  const playbook = registry.get(playbookId)
  if (!playbook) throw new Error('M365_PLAYBOOK_NOT_FOUND')
  try {
    const candidates = await playbook.evaluate(tenantId, snapshotId)
    return { tenantId, snapshotId, playbookId, candidates, projectedMonthlySavings: candidates.reduce((sum, c) => sum + c.projectedMonthlySavings, 0), projectedAnnualSavings: candidates.reduce((sum, c) => sum + c.projectedAnnualSavings, 0), confidence: bandFromScores(candidates.map((c) => c.confidenceBand)), evidenceCount: candidates.reduce((sum, c) => sum + c.evidence.length, 0), errors: [] }
  } catch (error) {
    return { tenantId, snapshotId, playbookId, candidates: [], projectedMonthlySavings: 0, projectedAnnualSavings: 0, confidence: 'LOW', evidenceCount: 0, errors: [error instanceof Error ? error.message : String(error)] }
  }
}

export async function runAllPlaybooks(tenantId: string, input?: { snapshotId?: string; registry?: M365PlaybookRegistry; opportunitiesGenerated?: number }) {
  const latest = m365SnapshotRepository.getLatest(tenantId)
  const snapshotId = input?.snapshotId ?? latest?.snapshot.snapshotId
  if (!snapshotId) throw new Error('M365_SNAPSHOT_NOT_FOUND')
  const registry = input?.registry ?? buildDefaultM365PlaybookRegistry()
  const results = await Promise.all(registry.list().map((playbook) => runPlaybook(tenantId, snapshotId, playbook.playbookId, { registry })))
  const candidates = results.flatMap((result) => result.candidates)
  const productionReadinessCounts = { readyForApproval: candidates.filter((c) => c.productionReadiness === 'READY_FOR_APPROVAL').length, needsHardening: candidates.filter((c) => c.productionReadiness === 'NEEDS_HARDENING').length, notReady: candidates.filter((c) => c.productionReadiness === 'NOT_READY').length }
  const summary: M365PlaybookRunSummary = { tenantId, snapshotId, playbooksRun: results.length, candidates: candidates.length, projectedMonthlySavings: candidates.reduce((sum, c) => sum + c.projectedMonthlySavings, 0), projectedAnnualSavings: candidates.reduce((sum, c) => sum + c.projectedAnnualSavings, 0), confidence: bandFromScores(candidates.map((c) => c.confidenceBand)), evidenceCount: candidates.reduce((sum, c) => sum + c.evidence.length, 0), errors: results.flatMap((r) => r.errors), opportunitiesGenerated: input?.opportunitiesGenerated ?? 0, productionReadinessCounts, completedAt: new Date().toISOString() }
  summaries.set(tenantId, summary)
  void platformEventService.recordOpportunityEvent(tenantId, 'M365_PLAYBOOKS_EVALUATED', { entityType: 'M365_SNAPSHOT', entityId: snapshotId, title: 'M365 playbooks evaluated', sourceSystem: 'm365-playbook-runtime', metadata: { playbooksRun: summary.playbooksRun, candidates: summary.candidates, projectedMonthlySavings: summary.projectedMonthlySavings } }).catch(() => undefined)
  return { tenantId, snapshotId, results, candidates, summary }
}

export function runPlaybookForSnapshot(tenantId: string, snapshotId: string, playbookId: string) { return runPlaybook(tenantId, snapshotId, playbookId) }
export function getM365PlaybookHealth(tenantId: string) { const summary = summaries.get(tenantId); if (!summary) return { state: 'STALE', playbooksRun: 0, candidates: 0, opportunitiesGenerated: 0, projectedMonthlySavings: 0, errors: 0, lastRunAt: null }; return { state: summary.errors.length ? 'DEGRADED' : 'HEALTHY', playbooksRun: summary.playbooksRun, candidates: summary.candidates, opportunitiesGenerated: summary.opportunitiesGenerated, projectedMonthlySavings: summary.projectedMonthlySavings, errors: summary.errors.length, productionReadinessCounts: summary.productionReadinessCounts, lastRunAt: summary.completedAt } }
export function recordM365OpportunitiesGenerated(tenantId: string, count: number) { const current = summaries.get(tenantId); if (current) summaries.set(tenantId, { ...current, opportunitiesGenerated: count }) }
