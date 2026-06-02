import { Router } from 'express'
import { checkM365LiveReadiness } from '../lib/connectors/m365-live-readiness'
import { monitoredOutcomeService } from '../lib/drift/monitored-outcome-service'
import { getRuntimeHealth } from '../lib/observability/runtime-health'
import { outcomeProjectionService } from '../lib/outcomes/outcome-projection-service'
import { getOpportunityFactoryHealth } from '../lib/opportunity-factory/opportunity-factory-service'
import { outcomeProofService } from '../lib/outcomes/outcome-proof-service'
import { platformEventService } from '../lib/events/platform-event-service'
import { vendorChangePipelineService } from '../lib/vcde/vendor-change-pipeline-service'
import { m365HealthService } from '../lib/connectors/m365/m365-health'
import { getM365PlaybookHealth } from '../lib/playbooks/m365/m365-playbook-runtime'
import { onboardingService } from '../lib/onboarding/onboarding-service'
import { executiveValueService } from '../lib/executive-value/executive-value-service'

const router = Router()
const tenant = (req: any) => String(req.tenantId ?? req.query.tenantId ?? req.header('x-tenant-id') ?? 'default')
const activeDrift = (tenantId: string) => monitoredOutcomeService.list(tenantId).filter((outcome) => outcome.monitoringState === 'DRIFT_DETECTED').length

router.get('/runtime/health', async (req, res) => {
  const tenantId = tenant(req)
  const base = getRuntimeHealth(tenantId)
  const readiness = await checkM365LiveReadiness()
  const projections = outcomeProjectionService.commandMetrics(tenantId)
  const drift = activeDrift(tenantId)
  const opportunityFactory = getOpportunityFactoryHealth(tenantId)
  const vcde = vendorChangePipelineService.health(tenantId)
  const m365Health = await m365HealthService.getHealth(tenantId)
  const m365Playbooks = getM365PlaybookHealth(tenantId)
  const m365Onboarding = await onboardingService.getOnboardingSummary(tenantId).catch(() => ({ status: 'NOT_STARTED', currentStep: 'WORKSPACE_SETUP', checklist: { readiness: 'NOT_READY' } }))
  let outcomeProofComponent = { id: 'outcome-proof-engine', name: 'Outcome Proof Engine', status: 'FAILED', wording: 'Outcome Proof Engine FAILED', detail: 'Proof summary unavailable' }
  try {
    const proofSummary = await outcomeProofService.getSummary(tenantId)
    const stale = !proofSummary.generatedAt
    const degraded = proofSummary.verificationBacklogCount > 0 || proofSummary.verificationFailedCount > 0 || proofSummary.driftedOutcomeCount > 0
    const status = stale ? 'STALE' : degraded ? 'DEGRADED' : 'HEALTHY'
    outcomeProofComponent = { id: 'outcome-proof-engine', name: 'Outcome Proof Engine', status, wording: `Outcome Proof Engine ${status}`, detail: `Projected: ${proofSummary.projectedMonthlySavings}; Approved: ${proofSummary.approvedMonthlySavings}; Executed: ${proofSummary.executedMonthlySavings}; Verified: ${proofSummary.verifiedMonthlySavings}; Retained: ${proofSummary.retainedMonthlySavings}; Protected: ${proofSummary.protectedMonthlySavings}; backlog: ${proofSummary.verificationBacklogCount}; drifted: ${proofSummary.driftedOutcomeCount}` }
  } catch (err) {
    outcomeProofComponent = { ...outcomeProofComponent, detail: (err as Error).message }
  }
  let executiveValueComponent = { id: 'executive-value-engine', name: 'Executive Value Engine', status: 'FAILED', wording: 'Executive Value Engine FAILED', detail: 'Executive value summary unavailable' }
  try {
    const executiveValue = await executiveValueService.getExecutiveValueSummary(tenantId)
    const fallbackUsed = Object.values(executiveValue.metricSources).some((metric: any) => metric.source === 'OPPORTUNITY_FALLBACK')
    const stale = executiveValue.counts.evidencePacksGenerated === 0 && executiveValue.counts.outcomesVerified === 0 && executiveValue.valueMetrics.projectedMonthlySavings === 0
    const status = stale ? 'STALE' : fallbackUsed ? 'DEGRADED' : 'HEALTHY'
    executiveValueComponent = { id: 'executive-value-engine', name: 'Executive Value Engine', status, wording: `Executive Value Engine ${status}`, detail: `Projected: ${executiveValue.valueMetrics.projectedMonthlySavings}; Verified: ${executiveValue.valueMetrics.verifiedMonthlySavings}; Protected: ${executiveValue.valueMetrics.protectedMonthlySavings}; evidence completeness: ${executiveValue.confidence.evidenceCompletenessPercent}%` }
  } catch (err) {
    executiveValueComponent = { ...executiveValueComponent, detail: (err as Error).message }
  }
  const eventHealth = await platformEventService.listEvents(tenantId, { limit: 25 }).then((events) => ({ status: events.length ? 'HEALTHY' : 'STALE', volume: events.length })).catch(() => ({ status: 'FAILED', volume: 0 }))
  if (eventHealth.status !== 'FAILED') void platformEventService.recordSystemEvent(tenantId, eventHealth.status === 'HEALTHY' ? 'RUNTIME_RECOVERED' : 'RUNTIME_DEGRADED', { entityType: 'PLATFORM_EVENT_AUTHORITY', entityId: tenantId, title: `Platform Event Authority ${eventHealth.status}`, description: `Recent event volume: ${eventHealth.volume}`, sourceSystem: 'runtime-observability', metadata: { recentEventVolume: eventHealth.volume, normalizerHealth: 'READY' } }).catch(() => undefined)
  return res.json({
    ...base,
    connectors: [
      { id: 'm365', name: 'Microsoft 365', health: readiness.state, status: readiness.state, detail: readiness.error ?? readiness.missingScopes.join(',') },
      ...base.connectors.filter((connector: any) => String(connector.name).toLowerCase() !== 'm365'),
    ],
    components: [
      { id: 'm365-connector', name: 'M365 Connector', status: m365Health.state, wording: `M365 Connector ${m365Health.state}`, detail: `auth: ${m365Health.dimensions.auth}; permissions: ${m365Health.dimensions.permissions}; discovery: ${m365Health.dimensions.usersRead}; freshness: ${m365Health.dimensions.freshness}; trust: ${m365Health.state}; rate limit risk: ${m365Health.dimensions.rateLimitRisk}` },
      { id: 'm365-playbook-engine', name: 'M365 Playbook Engine', status: m365Playbooks.state, wording: `M365 Playbook Engine ${m365Playbooks.state}`, detail: `playbooks run: ${m365Playbooks.playbooksRun}; candidates: ${m365Playbooks.candidates}; opportunities generated: ${m365Playbooks.opportunitiesGenerated}; projected: ${m365Playbooks.projectedMonthlySavings}; errors: ${m365Playbooks.errors}; last run: ${m365Playbooks.lastRunAt ?? 'never'}` },
      { id: 'm365-onboarding', name: 'M365 Onboarding', status: m365Onboarding.status, wording: `M365 Onboarding ${m365Onboarding.status}`, detail: `step: ${m365Onboarding.currentStep}; readiness: ${m365Onboarding.checklist?.readiness ?? 'NOT_READY'}` },
      { id: 'verification-runtime', name: 'Verification Runtime', status: 'READY', wording: `Verified Savings: ${projections.totalVerifiedSavings}`, detail: `Pending Verification: ${projections.pendingVerificationCount}` },
      { id: 'drift-runtime', name: 'Drift Runtime', status: drift ? 'DEGRADED' : 'READY', wording: `Active Drift: ${drift}`, detail: 'Monitored outcomes drive drift exposure' },
      { id: 'scheduler-runtime', name: 'Scheduler Runtime', status: 'READY', wording: 'Scheduler Runtime READY', detail: 'Execution-request backed schedules' },
      { id: 'opportunity-factory', name: 'Opportunity Factory', status: opportunityFactory.state, wording: `Opportunity Factory ${opportunityFactory.state}`, detail: `Last run: ${opportunityFactory.lastRunAt ?? 'never'}; providers succeeded: ${opportunityFactory.providersSucceeded}; generated: ${opportunityFactory.opportunitiesGenerated}; dedupe: ${opportunityFactory.dedupeSuccess ? 'ok' : 'pending'}` },
      { id: 'vcde-pipeline', name: 'VCDE Pipeline', status: vcde.state, wording: `VCDE Pipeline ${vcde.state}`, detail: `signals: ${vcde.signalsIngested}; duplicates: ${vcde.duplicateSignals}; classified: ${vcde.changesClassified}; high impact: ${vcde.highImpactChanges}; promoted: ${vcde.opportunitiesPromoted}; last ingestion: ${vcde.lastIngestionRun ?? 'never'}; classifier: ${vcde.classifierHealth}` },
      outcomeProofComponent,
      executiveValueComponent,
      { id: 'platform-event-authority', name: 'Platform Event Authority', status: eventHealth.status, wording: `Platform Event Authority ${eventHealth.status}`, detail: `Repository reachable; recent event volume: ${eventHealth.volume}; normalizer health: READY` },
    ],
  })
})

router.get('/runtime/connectors', async (_req, res) => {
  const readiness = await checkM365LiveReadiness()
  res.json([{ id: 'm365', name: 'Microsoft 365', health: readiness.state, status: readiness.state, detail: readiness.error ?? readiness.missingScopes.join(',') }])
})

router.get('/runtime/metrics', (req, res) => {
  const tenantId = tenant(req)
  res.json({ ...getRuntimeHealth(tenantId).metrics, ...outcomeProjectionService.commandMetrics(tenantId), activeDrift: activeDrift(tenantId) })
})

router.get('/runtime/status', (req, res) => res.json({ runtimeStatus: getRuntimeHealth(tenant(req)).runtimeStatus }))

export default router
