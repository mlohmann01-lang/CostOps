import { Router } from 'express'
import { connectorRegistry } from '../lib/connectors/sdk/connectorRegistry'
import { runConnectorLifecycle } from '../lib/connectors/sdk/connectorLifecycle'
import { registerMockConnector } from '../lib/connectors/sdk/mockConnector'
import { CONNECTOR_PROVIDERS, type ConnectorContext, type ConnectorMode, type ConnectorProvider } from '../lib/connectors/sdk/connectorTypes'

registerMockConnector()

const router = Router()
const modes: ConnectorMode[] = ['READ_ONLY', 'RECOMMEND_ONLY', 'APPROVAL_REQUIRED', 'AUTO_EXECUTE_SAFE', 'GOVERNANCE_ENFORCED']
const isProvider = (value: string): value is ConnectorProvider => CONNECTOR_PROVIDERS.includes(value as ConnectorProvider)
const isMode = (value: string): value is ConnectorMode => modes.includes(value as ConnectorMode)
const tenant = (req: any) => String(req.tenantId ?? req.query.tenantId ?? req.body?.tenantId ?? req.header('x-tenant-id') ?? 'default')
const actor = (req: any) => req.body?.actorId ? String(req.body.actorId) : req.query.actorId ? String(req.query.actorId) : req.header('x-actor-id') ? String(req.header('x-actor-id')) : undefined

function provider(req: any, res: any): ConnectorProvider | null {
  const value = String(req.params.provider ?? '').toUpperCase()
  if (!isProvider(value)) { res.status(400).json({ error: 'INVALID_CONNECTOR_PROVIDER', provider: value, supportedProviders: CONNECTOR_PROVIDERS }); return null }
  try { connectorRegistry.get(value); return value } catch (error) { res.status(404).json({ error: error instanceof Error ? error.message : `Connector not registered: ${value}` }); return null }
}

function context(req: any, requireActor = false): ConnectorContext | null {
  const actorId = actor(req)
  if (requireActor && !actorId) return null
  const requestedMode = String(req.body?.mode ?? req.query.mode ?? 'APPROVAL_REQUIRED').toUpperCase()
  return { tenantId: tenant(req), actorId, mode: isMode(requestedMode) ? requestedMode : 'APPROVAL_REQUIRED', correlationId: req.body?.correlationId ? String(req.body.correlationId) : req.header('x-correlation-id') ? String(req.header('x-correlation-id')) : undefined }
}

router.get('/providers', (_req, res) => res.json({ providers: connectorRegistry.list() }))

router.get('/:provider/readiness', async (req, res) => {
  const p = provider(req, res); if (!p) return
  return res.json(await connectorRegistry.get(p).checkReadiness(context(req) as ConnectorContext))
})

router.post('/:provider/lifecycle', async (req, res) => {
  const p = provider(req, res); if (!p) return
  return res.json(await runConnectorLifecycle(p, context(req) as ConnectorContext))
})

router.post('/:provider/dry-run', async (req, res) => {
  const p = provider(req, res); if (!p) return
  const ctx = context(req, true); if (!ctx) return res.status(400).json({ error: 'ACTOR_ID_REQUIRED' })
  return res.json(await connectorRegistry.get(p).dryRunAction(ctx, req.body?.action ?? {}))
})

router.post('/:provider/execute', async (req, res) => {
  const p = provider(req, res); if (!p) return
  const ctx = context(req, true); if (!ctx) return res.status(400).json({ error: 'ACTOR_ID_REQUIRED' })
  if (p !== 'MOCK' && ctx.mode !== 'AUTO_EXECUTE_SAFE' && ctx.mode !== 'GOVERNANCE_ENFORCED') return res.status(403).json({ error: 'CONNECTOR_EXECUTION_NOT_PERMITTED', mode: ctx.mode, provider: p })
  return res.json(await connectorRegistry.get(p).executeAction(ctx, req.body?.action ?? {}))
})

router.get('/:provider/verify/:actionId', async (req, res) => {
  const p = provider(req, res); if (!p) return
  return res.json(await connectorRegistry.get(p).verifyAction(context(req) as ConnectorContext, String(req.params.actionId)))
})

router.get('/:provider/evidence', async (req, res) => {
  const p = provider(req, res); if (!p) return
  const actionId = req.query.actionId ? String(req.query.actionId) : undefined
  return res.json(await connectorRegistry.get(p).captureEvidence(context(req) as ConnectorContext, actionId))
})

export default router
