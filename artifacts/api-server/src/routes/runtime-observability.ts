import { Router } from 'express'
import { checkM365LiveReadiness } from '../lib/connectors/m365-live-readiness'
import { monitoredOutcomeService } from '../lib/drift/monitored-outcome-service'
import { getRuntimeHealth } from '../lib/observability/runtime-health'
import { outcomeProjectionService } from '../lib/outcomes/outcome-projection-service'

const router = Router()
const tenant = (req: any) => String(req.tenantId ?? req.query.tenantId ?? req.header('x-tenant-id') ?? 'default')
const activeDrift = (tenantId: string) => monitoredOutcomeService.list(tenantId).filter((outcome) => outcome.monitoringState === 'DRIFT_DETECTED').length

router.get('/runtime/health', async (req, res) => {
  const tenantId = tenant(req)
  const base = getRuntimeHealth(tenantId)
  const readiness = await checkM365LiveReadiness()
  const projections = outcomeProjectionService.commandMetrics(tenantId)
  const drift = activeDrift(tenantId)
  return res.json({
    ...base,
    connectors: [
      { id: 'm365', name: 'Microsoft 365', health: readiness.state, status: readiness.state, detail: readiness.error ?? readiness.missingScopes.join(',') },
      ...base.connectors.filter((connector: any) => String(connector.name).toLowerCase() !== 'm365'),
    ],
    components: [
      { id: 'verification-runtime', name: 'Verification Runtime', status: 'READY', wording: `Verified Savings: ${projections.totalVerifiedSavings}`, detail: `Pending Verification: ${projections.pendingVerificationCount}` },
      { id: 'drift-runtime', name: 'Drift Runtime', status: drift ? 'DEGRADED' : 'READY', wording: `Active Drift: ${drift}`, detail: 'Monitored outcomes drive drift exposure' },
      { id: 'scheduler-runtime', name: 'Scheduler Runtime', status: 'READY', wording: 'Scheduler Runtime READY', detail: 'Execution-request backed schedules' },
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
