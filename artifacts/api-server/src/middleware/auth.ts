import type { Request, Response, NextFunction } from "express";
import { buildAuthContextSync } from "../lib/auth/auth-context.js";

// Legacy synchronous auth middleware — kept for backward compatibility.
// Prefer using authMiddleware() from auth-middleware.ts for new code.
// This middleware only works correctly when authMiddleware() has already run
// and populated req.__authContext upstream.
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    (req as any).auth = buildAuthContextSync(req);
    next();
  } catch {
    res.status(401).json({ error: "unauthorized" });
  }
}
