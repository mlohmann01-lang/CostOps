import type { Request, Response, NextFunction } from "express";
import { buildAuthContext } from "../lib/auth/auth-context";
export function authMiddleware(req: Request, res: Response, next: NextFunction) { try { (req as any).auth = buildAuthContext(req); next(); } catch { res.status(401).json({ error: "unauthorized" }); } }
