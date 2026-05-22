import type { Request, Response, NextFunction } from 'express'
import { buildAuthContext } from '../lib/auth/auth-context.js'

// Async middleware that validates JWT and attaches AuthContext to the request.
// Mount this EARLY in app.ts before all route handlers.
// After this middleware runs, req.__authContext is populated.
export function authMiddleware() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = await buildAuthContext(req)
      ;(req as any).__authContext = ctx
      next()
    } catch (e) {
      next(e)
    }
  }
}
