/**
 * In-memory sliding-window rate limiter.
 *
 * LIMITATION: State is local to the process. In a multi-instance deployment
 * this does NOT share state across replicas. Replace the `_store` Map with a
 * Redis-backed equivalent (e.g. ioredis + Lua scripts) before horizontal
 * scaling.
 */
import type { Request, Response, NextFunction, RequestHandler } from 'express';

export type RateLimitConfig = {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests allowed within the window */
  maxRequests: number;
  /**
   * Custom key extractor. Defaults to the client IP address.
   * Receives the raw Express Request and must return a stable string key.
   */
  keyGenerator?: (req: Request) => string;
  /** Message sent in the 429 response body */
  message?: string;
};

type WindowEntry = { count: number; windowStart: number };

// In-memory store: key → sliding-window counter entry.
// Not shared across processes — see module-level limitation note above.
const _store = new Map<string, WindowEntry>();

// Remove entries whose window has fully expired to prevent unbounded growth.
// The timer is unref'd so it does not prevent the Node.js process from exiting.
const _cleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of _store) {
    if (now - entry.windowStart > 300_000 /* 5 min max window */) {
      _store.delete(key);
    }
  }
}, 5 * 60 * 1000 /* 5 minutes */);
_cleanup.unref();

function defaultKeyGenerator(req: Request): string {
  // Honour standard proxy headers when the server sits behind a reverse proxy.
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.socket.remoteAddress ?? 'unknown';
}

export function rateLimitMiddleware(config: RateLimitConfig): RequestHandler {
  const { windowMs, maxRequests, message } = config;
  const keyGenerator = config.keyGenerator ?? defaultKeyGenerator;
  const responseMessage = message ?? 'Too Many Requests';

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();

    const entry = _store.get(key);

    if (!entry || now - entry.windowStart >= windowMs) {
      // Start a fresh window
      _store.set(key, { count: 1, windowStart: now });
      next();
      return;
    }

    entry.count += 1;

    if (entry.count > maxRequests) {
      const windowEnd = entry.windowStart + windowMs;
      const retryAfterSec = Math.ceil((windowEnd - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({ error: responseMessage, retryAfter: retryAfterSec });
      return;
    }

    next();
  };
}

// ---------------------------------------------------------------------------
// Preset configurations
// ---------------------------------------------------------------------------

/** Default limit applied globally to all API routes (200 req/min per IP). */
export const DEFAULT_API_LIMIT: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 200,
};

/** Stricter limit for approval endpoints (20 req/min per IP). */
export const APPROVAL_LIMIT: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 20,
};

/** Limit for recommendation-generation endpoints (60 req/min per IP). */
export const RECOMMENDATION_LIMIT: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 60,
};
