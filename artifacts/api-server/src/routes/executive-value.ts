import { Router } from 'express'
import { executiveValueService } from '../lib/executive-value/executive-value-service'

const router = Router()
const tenant = (req: any) => String(req.tenantId ?? req.query.tenantId ?? req.header('x-tenant-id') ?? 'default')

router.get('/summary', async (req, res) => res.json(await executiveValueService.getExecutiveValueSummary(tenant(req))))
router.get('/domains', async (req, res) => res.json({ domains: await executiveValueService.getExecutiveValueByDomain(tenant(req)) }))
router.get('/top-drivers', async (req, res) => res.json({ topDrivers: await executiveValueService.getTopValueDrivers(tenant(req), Number(req.query.limit ?? 5)) }))
router.get('/blockers', async (req, res) => res.json({ blockers: await executiveValueService.getExecutiveBlockers(tenant(req)) }))
router.post('/evidence-pack', async (req, res) => res.status(201).json(await executiveValueService.generateExecutiveEvidencePack(tenant(req), String((req as any).user?.sub ?? req.body?.generatedBy ?? 'operator'))))

export default router
