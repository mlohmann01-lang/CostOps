import type { Request, Response, NextFunction } from 'express'
import { recordAuditEvent } from '../lib/audit/audit-service.js'
import type { AuditEventType } from '@workspace/db'

// Map HTTP method + route pattern to audit event type
// Only POST/PUT/PATCH/DELETE are audited (GET requests are not state-changing)
export function auditMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      next()
      return
    }

    // Hook into response finish to capture outcome
    const originalEnd = res.end.bind(res)
    ;(res as unknown as Record<string, unknown>).end = function (...args: Parameters<typeof res.end>) {
      // Determine outcome from status code
      const outcome: 'SUCCESS' | 'FAILURE' | 'BLOCKED' =
        res.statusCode < 400 ? 'SUCCESS' : res.statusCode === 403 ? 'BLOCKED' : 'FAILURE'

      // Derive event type from route + outcome
      const eventType = deriveEventType(req, outcome)

      // Get auth context from request (set by auth middleware)
      const auth = (req as unknown as Record<string, unknown>)['__authContext'] as
        | { userId?: unknown; tenantId?: unknown; role?: unknown }
        | undefined ?? { userId: 'anonymous', tenantId: 'unknown', role: 'VIEWER' }

      // Fire and forget — don't await
      recordAuditEvent({
        tenantId: String(auth.tenantId ?? 'unknown'),
        actorId: String(auth.userId ?? 'anonymous'),
        actorRole: String(auth.role ?? 'VIEWER'),
        eventType,
        resourceType: deriveResourceType(req),
        resourceId: deriveResourceId(req),
        ipAddress: String(req.ip ?? (req.socket as { remoteAddress?: string } | null)?.remoteAddress ?? 'unknown'),
        userAgent: req.headers['user-agent'],
        requestId: String((req as unknown as Record<string, unknown>)['id'] ?? ''),
        payload: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
        },
        outcome,
      }).catch(() => {
        // audit failure must never propagate
      })

      return originalEnd(...args)
    }

    next()
  }
}

function deriveEventType(req: Request, outcome: 'SUCCESS' | 'FAILURE' | 'BLOCKED'): AuditEventType {
  const path = req.path.toLowerCase()
  if (outcome === 'BLOCKED') return 'PERMISSION_DENIED'
  if (path.includes('/approve')) return 'APPROVAL_GRANTED'
  if (path.includes('/reject')) return 'APPROVAL_REJECTED'
  if (path.includes('/approval')) return 'APPROVAL_REQUESTED'
  if (path.includes('/execute') || path.includes('/intent')) return 'EXECUTION_REQUESTED'
  if (path.includes('/verify')) return 'VERIFICATION_RUN'
  if (path.includes('/rollback')) return 'EXECUTION_ROLLBACK_REQUESTED'
  if (path.includes('/drift')) return 'DRIFT_DETECTED'
  return 'EXECUTION_REQUESTED'  // safe fallback
}

function deriveResourceType(req: Request): string {
  const path = req.path.toLowerCase()
  if (path.includes('/approval')) return 'approval_request'
  if (path.includes('/packs')) return 'pack'
  if (path.includes('/intent')) return 'execution'
  if (path.includes('/connectors')) return 'connector'
  return 'unknown'
}

function deriveResourceId(req: Request): string | undefined {
  // Extract from common param patterns: /:id, /:packId, /:executionId
  const params = req.params as Record<string, string>
  return params['id'] ?? params['packId'] ?? params['executionId'] ?? params['recommendationId'] ?? undefined
}
