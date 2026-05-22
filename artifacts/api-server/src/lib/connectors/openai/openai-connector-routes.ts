/**
 * OpenAI Connector Routes (Part 7)
 *
 * 4 endpoints:
 * - GET /readiness: Check connector readiness
 * - POST /sync: Trigger sync job
 * - GET /jobs/:jobId: Get job status
 * - GET /telemetry/latest: Get latest synced telemetry
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { openaiCapabilityRegistry } from './openai-capability-registry.js';
import { openaiSyncJob } from './openai-sync-job.js';
import { logger } from '../../logger.js';

const router = Router();

// Middleware: verify tenant context (defensive guard for standalone mounting)
const requireTenant = (req: Request, res: Response, next: NextFunction): void => {
  const authContext = (req as { __authContext?: { tenantId?: string } }).__authContext;
  if (!authContext?.tenantId) {
    res.status(401).json({ error: 'TENANT_CONTEXT_REQUIRED' });
    return;
  }
  next();
};

/**
 * GET /readiness
 * Check OpenAI connector readiness (capabilities, health)
 */
router.get('/readiness', requireTenant, async (req: Request, res: Response) => {
  try {
    const authContext = (req as { __authContext?: { tenantId: string } }).__authContext!;
    const tenantId = authContext.tenantId;

    res.json({
      connector: 'OPENAI',
      tenantId,
      readiness: {
        connectorId: 'OPENAI',
        overallState: 'UNKNOWN',
        capabilityStatuses: openaiCapabilityRegistry.listCapabilities().map((cap) => ({
          capability: cap,
          state: 'UNKNOWN',
          lastCheckedAt: new Date().toISOString(),
        })),
        readinessScore: 0,
        lastAssessedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error({ error, component: 'openai-connector-routes' }, 'Error checking readiness');
    res.status(500).json({ error: 'READINESS_CHECK_FAILED' });
  }
});

/**
 * POST /sync
 * Trigger a read-only sync of OpenAI usage/cost data
 */
const SyncBodySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
});

router.post('/sync', requireTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = SyncBodySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'INVALID_REQUEST_BODY',
        details: validation.error.errors,
      });
      return;
    }

    const authContext = (req as { __authContext?: { tenantId: string } }).__authContext!;
    const tenantId = authContext.tenantId;
    const { startDate, endDate } = validation.data;
    const jobId = `openai-sync-${tenantId}-${Date.now()}`;
    const correlationId = (req as { id?: string }).id || 'unknown';

    // Trigger sync job (would be queued in real implementation)
    const result = await openaiSyncJob.execute({
      tenantId,
      startDate,
      endDate,
      jobId,
      correlationId,
    });

    res.status(202).json({
      jobId: result.jobId,
      status: result.status,
      tenantId: result.tenantId,
    });
  } catch (error) {
    logger.error({ error, component: 'openai-connector-routes' }, 'Error triggering sync');
    res.status(500).json({ error: 'SYNC_FAILED' });
  }
});

/**
 * GET /jobs/:jobId
 * Get status of a sync job
 */
router.get('/jobs/:jobId', requireTenant, async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    // In real implementation, would query job from database
    // For now, return placeholder
    res.json({
      jobId,
      status: 'UNKNOWN',
      message: 'Job status lookup not yet implemented',
    });
  } catch (error) {
    logger.error({ error, component: 'openai-connector-routes' }, 'Error getting job status');
    res.status(500).json({ error: 'JOB_STATUS_LOOKUP_FAILED' });
  }
});

/**
 * GET /telemetry/latest
 * Get latest synced OpenAI telemetry metadata
 */
router.get('/telemetry/latest', requireTenant, async (req: Request, res: Response) => {
  try {
    const authContext = (req as { __authContext?: { tenantId: string } }).__authContext!;
    const tenantId = authContext.tenantId;

    // In real implementation, would query from telemetry store
    res.json({
      tenantId,
      connector: 'OPENAI',
      telemetryAvailable: false,
      message: 'Telemetry storage not yet implemented',
    });
  } catch (error) {
    logger.error({ error, component: 'openai-connector-routes' }, 'Error getting telemetry');
    res.status(500).json({ error: 'TELEMETRY_LOOKUP_FAILED' });
  }
});

export default router;
