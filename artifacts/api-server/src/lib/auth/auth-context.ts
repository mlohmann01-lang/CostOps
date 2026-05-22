import type { Request } from 'express'
import { validateJwtToken } from './providers/jwt-validation.js'
import { mapClaimsToRole } from './providers/token-claims.js'
import { logger } from '../logger.js'

export type AuthRole = "PLATFORM_ADMIN" | "TENANT_ADMIN" | "APPROVER" | "OPERATOR" | "VIEWER"
export type AuthContext = {
  userId: string
  tenantId: string
  role: AuthRole
  platformAdminOverride: boolean
  authenticated: boolean      // true only when JWT was cryptographically verified
}

const UNAUTHENTICATED_CONTEXT: AuthContext = {
  userId: 'anonymous',
  tenantId: 'unknown',
  role: 'VIEWER',
  platformAdminOverride: false,
  authenticated: false,
}

export async function buildAuthContext(req: Request): Promise<AuthContext> {
  // Extract Bearer token from Authorization header
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return { ...UNAUTHENTICATED_CONTEXT }
  }

  const result = await validateJwtToken(token)

  if (!result.ok) {
    logger.warn({ error: result.error }, 'JWT validation failed')
    return { ...UNAUTHENTICATED_CONTEXT }
  }

  const { claims } = result
  const role = mapClaimsToRole(claims.groups ?? [])

  return {
    userId: claims.sub,
    tenantId: claims.tenantId ?? 'unknown',
    role,
    platformAdminOverride: role === 'PLATFORM_ADMIN',
    authenticated: true,
  }
}

/**
 * Synchronous transitional function for middleware that can't be async yet.
 * Reads from req.__authContext if it was set by a prior async auth middleware.
 * Otherwise returns unauthenticated context with a warning log.
 *
 * IMPORTANT: This only works correctly when authMiddleware() has already run
 * and populated req.__authContext. Mount authMiddleware() early in app.ts.
 */
export function buildAuthContextSync(req: Request): AuthContext {
  const cached = (req as any).__authContext as AuthContext | undefined
  if (cached) {
    return cached
  }

  logger.warn(
    'buildAuthContextSync called without prior authMiddleware — returning unauthenticated context. ' +
    'Ensure authMiddleware() is mounted before route handlers.',
  )
  return { ...UNAUTHENTICATED_CONTEXT }
}

export function requireAuth(req: Request): AuthContext {
  const ctx = buildAuthContextSync(req)
  if (!ctx.authenticated) throw new Error('AUTH_REQUIRED')
  return ctx
}
