/**
 * /packs routes — Economic Operations Pack Factory API
 *
 * Exposes the pack registry and runtime for command center, UX, and operator workflows.
 * All AI governance packs, M365 packs, and future domain packs are accessible here.
 *
 * Routes:
 *   GET  /packs                           — list all registered packs
 *   GET  /packs/:packId                   — get pack metadata
 *   GET  /packs/domain/:domain            — list packs for a domain
 *   POST /packs/:packId/recommendations   — run recommendations for a pack
 *   POST /packs/:packId/simulation        — run simulation for a pack
 *   GET  /packs/:packId/readiness         — check execution readiness
 *   POST /packs/:packId/verify            — run verification
 *   POST /packs/:packId/drift             — run drift detection
 *   GET  /packs/ai/domains               — list AI governance domains
 */

import type { RequestHandler } from 'express'
import { Router } from 'express'
import { globalPackRuntime } from '../lib/economic-operations-pack-runtime.js'
import { globalPackRegistry } from '../lib/economic-operations-pack-registry.js'
import { AI_ECONOMIC_OPERATIONS_REGISTRY, listDomainsByPriority } from '../lib/ai-economic-operations-registry.js'
import { requireTenantContext } from '../middleware/security-guards.js'
import { extractOperatorActor } from '../middleware/economic-operations-rbac-middleware.js'

const r = Router()

// Apply tenant context guard to all pack routes
r.use(requireTenantContext())

// GET /packs — list all registered packs with UX metadata
r.get('/', (req, res) => {
  const actor = extractOperatorActor(req)
  const packs = globalPackRegistry.list()
  res.json({
    packs: packs.map((pack) => ({
      id: pack.packId,
      name: pack.definition.name,
      domain: pack.definition.domain,
      category: pack.definition.category,
      version: pack.definition.version,
      riskProfile: pack.definition.riskProfile,
      blastRadiusClassification: pack.definition.blastRadiusClassification,
      supportsSimulation: pack.definition.supportsSimulation,
      supportsVerification: pack.definition.supportsVerification,
      supportsDriftDetection: pack.definition.supportsDriftDetection,
      supportsRollback: pack.definition.supportsRollback,
      minimumTenantMode: pack.definition.minimumTenantMode,
      ux: pack.getUXMetadata(),
    })),
    total: packs.length,
    tenantId: actor.tenantId,
  })
})

// GET /packs/ai/domains — list AI governance domains in priority order
r.get('/ai/domains', (_req, res) => {
  res.json({
    domains: listDomainsByPriority(),
    registry: AI_ECONOMIC_OPERATIONS_REGISTRY,
  })
})

// GET /packs/domain/:domain — packs filtered by domain
r.get('/domain/:domain', ((req, res) => {
  const domain = String(req.params['domain'])
  const packs = globalPackRuntime.listPacksForDomain(domain)
  res.json({
    domain,
    packs: packs.map((p) => ({
      id: p.packId,
      name: p.definition.name,
      category: p.definition.category,
      ux: p.getUXMetadata(),
    })),
    total: packs.length,
  })
}) as RequestHandler)

// GET /packs/:packId — pack detail with full definition metadata
r.get('/:packId', ((req, res) => {
  const packId = String(req.params['packId'])
  const pack = globalPackRegistry.get(packId)
  if (!pack) {
    res.status(404).json({ error: 'PACK_NOT_FOUND', packId })
    return
  }
  res.json({
    id: pack.packId,
    definition: {
      id: pack.definition.id,
      name: pack.definition.name,
      version: pack.definition.version,
      domain: pack.definition.domain,
      category: pack.definition.category,
      description: pack.definition.description,
      riskProfile: pack.definition.riskProfile,
      blastRadiusClassification: pack.definition.blastRadiusClassification,
      minimumTenantMode: pack.definition.minimumTenantMode,
      supportedExecutionModes: pack.definition.supportedExecutionModes,
      defaultApprovalPolicy: pack.definition.defaultApprovalPolicy,
      supportsRollback: pack.definition.supportsRollback,
      supportsVerification: pack.definition.supportsVerification,
      supportsDriftDetection: pack.definition.supportsDriftDetection,
      supportsSimulation: pack.definition.supportsSimulation,
    },
    ux: pack.getUXMetadata(),
  })
}) as RequestHandler)

// POST /packs/:packId/recommendations — run pack recommendations for tenant
r.post('/:packId/recommendations', (async (req, res) => {
  const packId = String(req.params['packId'])
  const actor = extractOperatorActor(req)
  const context = typeof req.body === 'object' && req.body !== null
    ? (req.body as Record<string, unknown>)
    : {}

  if (!globalPackRegistry.has(packId)) {
    res.status(404).json({ error: 'PACK_NOT_FOUND', packId })
    return
  }

  try {
    const results = await globalPackRuntime.generateRecommendations(packId, actor.tenantId, context)
    res.json({
      packId,
      tenantId: actor.tenantId,
      recommendations: results,
      count: results.length,
      generatedAt: new Date().toISOString(),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    res.status(500).json({ error: 'RECOMMENDATION_FAILED', packId, message: msg })
  }
}) as RequestHandler)

// POST /packs/:packId/simulation — run simulation
r.post('/:packId/simulation', (async (req, res) => {
  const packId = String(req.params['packId'])
  const actor = extractOperatorActor(req)
  const body = typeof req.body === 'object' && req.body !== null
    ? (req.body as Record<string, unknown>)
    : {}
  const executionId = typeof body['executionId'] === 'string' ? body['executionId'] : 'sim-' + Date.now()

  if (!globalPackRegistry.has(packId)) {
    res.status(404).json({ error: 'PACK_NOT_FOUND', packId })
    return
  }

  try {
    const result = await globalPackRuntime.runSimulation(packId, actor.tenantId, executionId, body['evidence'] ?? {})
    res.json({
      packId,
      tenantId: actor.tenantId,
      executionId,
      simulation: result,
      simulatedAt: new Date().toISOString(),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    res.status(500).json({ error: 'SIMULATION_FAILED', packId, message: msg })
  }
}) as RequestHandler)

// GET /packs/:packId/readiness — check readiness for a specific execution
r.get('/:packId/readiness', (async (req, res) => {
  const packId = String(req.params['packId'])
  const actor = extractOperatorActor(req)
  const executionId = typeof req.query['executionId'] === 'string'
    ? req.query['executionId']
    : 'unknown'

  if (!globalPackRegistry.has(packId)) {
    res.status(404).json({ error: 'PACK_NOT_FOUND', packId })
    return
  }

  try {
    const result = await globalPackRuntime.evaluateReadiness(packId, actor.tenantId, executionId)
    res.json({
      packId,
      tenantId: actor.tenantId,
      executionId,
      ...result,
      checkedAt: new Date().toISOString(),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    res.status(500).json({ error: 'READINESS_CHECK_FAILED', packId, message: msg })
  }
}) as RequestHandler)

// POST /packs/:packId/drift — run drift detection
r.post('/:packId/drift', (async (req, res) => {
  const packId = String(req.params['packId'])
  const actor = extractOperatorActor(req)
  const body = typeof req.body === 'object' && req.body !== null
    ? (req.body as Record<string, unknown>)
    : {}
  const executionId = typeof body['executionId'] === 'string' ? body['executionId'] : 'drift-check'

  if (!globalPackRegistry.has(packId)) {
    res.status(404).json({ error: 'PACK_NOT_FOUND', packId })
    return
  }

  try {
    const results = await globalPackRuntime.detectDrift(packId, actor.tenantId, executionId)
    const triggered = results.filter((r) => r.triggered)
    res.json({
      packId,
      tenantId: actor.tenantId,
      executionId,
      driftDetected: triggered.length > 0,
      triggeredRules: triggered,
      allRules: results,
      checkedAt: new Date().toISOString(),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    res.status(500).json({ error: 'DRIFT_CHECK_FAILED', packId, message: msg })
  }
}) as RequestHandler)

export default r
