import { Router } from 'express'
import { aiIntelligenceService, type AIAssetType } from '../lib/ai-economic-control/ai-intelligence'
import { aiConnectorDiscoveryService, type AIDiscoveryConnectorId } from '../lib/ai-economic-control/ai-discovery-connectors'

const router = Router()
function tenantIdFrom(req: any) { return String(req.tenantId ?? req.query.tenantId ?? 'default') }

router.get('/connectors', (_req, res) => res.json({ connectors: aiConnectorDiscoveryService.catalog() }))
router.get('/connectors/:id/capabilities', (req, res) => res.json(aiConnectorDiscoveryService.capabilities(req.params.id as AIDiscoveryConnectorId)))
router.post('/connectors/:id/discover', async (req, res) => { try { const tenantId = tenantIdFrom(req); const result = await aiConnectorDiscoveryService.discover(tenantId, { ...(req.body ?? {}), connectorId: req.params.id as AIDiscoveryConnectorId }); return res.status(result.status === 'FAILED' ? 400 : 202).json(result) } catch (error) { return res.status(500).json({ error: error instanceof Error ? error.message : 'AI_CONNECTOR_DISCOVERY_FAILED' }) } })

router.get('/assets', (req, res) => res.json({ tenantId: tenantIdFrom(req), assets: aiIntelligenceService.listAssets(tenantIdFrom(req), req.query.type as AIAssetType | undefined) }))
router.get('/assets/:id', (req, res) => { const asset = aiIntelligenceService.getAsset(tenantIdFrom(req), req.params.id); if (!asset) return res.status(404).json({ error: 'AI_ASSET_NOT_FOUND' }); return res.json(asset) })
router.post('/assets', (req, res) => { try { return res.status(201).json(aiIntelligenceService.createAsset(tenantIdFrom(req), req.body)) } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'AI_ASSET_CREATE_FAILED' }) } })
router.patch('/assets/:id', (req, res) => { try { const asset = aiIntelligenceService.updateAsset(tenantIdFrom(req), req.params.id, req.body); if (!asset) return res.status(404).json({ error: 'AI_ASSET_NOT_FOUND' }); return res.json(asset) } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'AI_ASSET_UPDATE_FAILED' }) } })
router.get('/utilisation', (req, res) => res.json(aiIntelligenceService.listUsage(tenantIdFrom(req))))
router.post('/utilisation/ingest', (req, res) => { try { return res.status(201).json(aiIntelligenceService.ingestUsage(tenantIdFrom(req), req.body)) } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'AI_USAGE_INGEST_FAILED' }) } })
router.get('/spend', (req, res) => res.json(aiIntelligenceService.listSpend(tenantIdFrom(req))))
router.post('/spend/ingest', (req, res) => { try { return res.status(201).json(aiIntelligenceService.ingestSpend(tenantIdFrom(req), req.body)) } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'AI_SPEND_INGEST_FAILED' }) } })
router.get('/governance/findings', (req, res) => res.json({ tenantId: tenantIdFrom(req), findings: aiIntelligenceService.findings(tenantIdFrom(req)) }))
router.get('/recommendations', (req, res) => res.json({ tenantId: tenantIdFrom(req), recommendations: aiIntelligenceService.recommendations(tenantIdFrom(req)) }))
router.get('/dashboard', (req, res) => res.json(aiIntelligenceService.dashboard(tenantIdFrom(req))))
router.get('/command-dashboard', (req, res) => res.json(aiIntelligenceService.commandDashboard(tenantIdFrom(req))))
router.get('/recommendations/:id/detail', (req, res) => { const detail = aiIntelligenceService.recommendationDetail(tenantIdFrom(req), req.params.id); if (!detail) return res.status(404).json({ error: 'AI_RECOMMENDATION_NOT_FOUND' }); return res.json(detail) })
router.get('/optimisation/playbooks', (req, res) => res.json({ tenantId: tenantIdFrom(req), playbooks: aiIntelligenceService.optimisationPlaybooks(tenantIdFrom(req)) }))
router.post('/optimisation/playbooks/:recommendationId/run', (req, res) => { const result = aiIntelligenceService.completeRecommendationAction(tenantIdFrom(req), req.params.recommendationId, String(req.body?.actor ?? 'ai-economic-operator')); if (!result) return res.status(404).json({ error: 'AI_RECOMMENDATION_NOT_FOUND' }); return res.json(result) })
router.get('/executive-proof-pack', (req, res) => res.json(aiIntelligenceService.executiveProofPack(tenantIdFrom(req))))
router.get('/technology-portfolio', (req, res) => res.json(aiIntelligenceService.technologyPortfolio(tenantIdFrom(req))))

export default router
