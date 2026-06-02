import { Router } from 'express'
import { evidencePackService } from '../lib/evidence-pack/evidence-pack-service'
import type { EvidencePackScope } from '../lib/evidence-pack/evidence-pack-types'

const router = Router()
const tenant = (req: any) => String(req.tenantId ?? req.query.tenantId ?? req.body?.tenantId ?? 'default')

router.post('/generate', async (req, res) => {
  const pack = await evidencePackService.generate({ tenantId: tenant(req), scope: String(req.body?.scope ?? 'TENANT') as EvidencePackScope, targetId: req.body?.targetId ? String(req.body.targetId) : undefined, generatedBy: String((req as any).user?.sub ?? req.body?.generatedBy ?? 'operator') })
  return res.status(201).json(pack)
})
router.get('/', (req, res) => res.json({ evidencePacks: evidencePackService.list(tenant(req)) }))
router.get('/:id', (req, res) => { const pack = evidencePackService.get(tenant(req), req.params.id); return pack ? res.json(pack) : res.status(404).json({ error: 'EVIDENCE_PACK_NOT_FOUND' }) })
router.get('/:id/json', (req, res) => { try { return res.json(evidencePackService.json(tenant(req), req.params.id)) } catch { return res.status(404).json({ error: 'EVIDENCE_PACK_NOT_FOUND' }) } })
router.get('/:id/pdf', (req, res) => { try { const pdf = evidencePackService.pdf(tenant(req), req.params.id); res.setHeader('content-type', 'application/pdf'); res.setHeader('content-disposition', `attachment; filename="${req.params.id}.pdf"`); return res.send(pdf) } catch { return res.status(404).json({ error: 'EVIDENCE_PACK_NOT_FOUND' }) } })
router.get('/:id/audit', async (req, res) => { try { return res.json(await evidencePackService.audit(tenant(req), req.params.id)) } catch { return res.status(404).json({ error: 'EVIDENCE_PACK_NOT_FOUND' }) } })

export default router
