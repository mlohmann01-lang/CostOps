import { Router } from "express";
import { randomBytes } from "node:crypto";
import { authProviderRegistry } from "../lib/auth/providers/auth-provider-registry.js";
import { issueSessionToken, hashSessionToken } from "../lib/auth/providers/session-manager.js";
import { mapClaimsToRole } from "../lib/auth/providers/token-claims.js";
import {
  buildEntraLoginUrl,
  exchangeCodeForClaims,
  refreshEntraToken,
  getEntraReadiness,
  getEntraTokenEntry,
  getEntraRefreshToken,
} from "../lib/auth/providers/microsoft-entra.js";

const router = Router();

// ---------------------------------------------------------------------------
// Legacy routes (keep for backward compat)
// ---------------------------------------------------------------------------

router.get('/login', (req, res) => {
  res.json({
    provider: 'MICROSOFT_ENTRA',
    loginUrl: authProviderRegistry.MICROSOFT_ENTRA.loginUrl(String(req.query.state ?? 'state')),
  });
});

router.get('/callback', async (req, res, next) => {
  try {
    const claims = await authProviderRegistry.MICROSOFT_ENTRA.exchangeCodeForClaims(
      String(req.query.code ?? ''),
    );
    const token = issueSessionToken();
    res.json({
      sessionToken: token,
      sessionTokenHash: hashSessionToken(token),
      claims,
      mappedRole: mapClaimsToRole(claims.groups),
    });
  } catch (e) {
    next(e);
  }
});

router.post('/logout', (_req, res) => res.json({ revoked: true }));

router.get('/me', (req, res) => res.json((req as { auth?: unknown }).auth ?? null));

// ---------------------------------------------------------------------------
// M365 / Entra connector-scoped auth routes
// ---------------------------------------------------------------------------

// CSRF state store (in-memory, short-lived)
const _csrfStates = new Map<string, number>(); // state -> expiry (epoch ms)
const CSRF_TTL_MS = 10 * 60 * 1000; // 10 minutes

function generateCsrfState(): string {
  const state = randomBytes(24).toString("hex");
  _csrfStates.set(state, Date.now() + CSRF_TTL_MS);
  return state;
}

function validateAndConsumeCsrfState(state: string): boolean {
  const expiry = _csrfStates.get(state);
  if (expiry === undefined) return false;
  _csrfStates.delete(state);
  return Date.now() < expiry;
}

/**
 * GET /connectors/m365/auth/start
 * Returns the Entra authorization URL for the frontend to redirect to.
 * The frontend is responsible for the redirect (not this server).
 */
router.get("/connectors/m365/auth/start", (req, res) => {
  const readiness = getEntraReadiness();
  if (readiness === "UNAVAILABLE" || readiness === "DEGRADED") {
    return res.status(503).json({
      error: "ENTRA_CONFIG_INCOMPLETE",
      readiness,
      message: "Required Entra environment variables are not configured",
    });
  }

  try {
    const state = generateCsrfState();
    const authUrl = buildEntraLoginUrl(state);
    return res.json({ authUrl, state });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ENTRA_START_FAILED";
    return res.status(503).json({ error: message });
  }
});

/**
 * GET /connectors/m365/auth/callback
 * Receives the authorization code from Entra, validates CSRF state,
 * exchanges the code for tokens, and returns session info.
 * NEVER returns raw access_token or refresh_token.
 */
router.get("/connectors/m365/auth/callback", async (req, res, next) => {
  try {
    const code = String(req.query.code ?? "");
    const state = String(req.query.state ?? "");
    const errorParam = req.query.error as string | undefined;

    // Handle Entra-side errors forwarded as query params
    if (errorParam) {
      const errorDescription = req.query.error_description as string | undefined;
      return res.status(400).json({
        error: errorParam,
        message: errorDescription ?? "Entra authorization failed",
      });
    }

    if (!code) {
      return res.status(400).json({ error: "CODE_REQUIRED" });
    }

    // Validate CSRF state
    if (!state || !validateAndConsumeCsrfState(state)) {
      return res.status(400).json({ error: "INVALID_STATE", message: "CSRF state mismatch or expired" });
    }

    const claims = await exchangeCodeForClaims(code);
    const sessionToken = issueSessionToken();

    // Return session info and user claims — NEVER the raw access_token or refresh_token
    return res.json({
      ok: true,
      sessionToken,
      sessionTokenHash: hashSessionToken(sessionToken),
      user: {
        sub: claims.sub,
        email: claims.email,
        name: claims.name,
        oid: claims.oid,
        tid: claims.tid,
        groups: claims.groups,
        scp: claims.scp,
        expiresAt: claims.expiresAt,
      },
      mappedRole: mapClaimsToRole(claims.groups),
    });
  } catch (err) {
    return void next(err);
  }
});

/**
 * GET /connectors/m365/auth/status
 * Returns Entra configuration readiness and token expiry for a given user.
 */
router.get("/connectors/m365/auth/status", (req, res) => {
  const readiness = getEntraReadiness();
  const userId = String(req.query.userId ?? "");

  let tokenInfo: { expiresAt?: number; userId?: string } | null = null;
  if (userId) {
    const entry = getEntraTokenEntry(userId);
    if (entry) {
      tokenInfo = { expiresAt: entry.expiresAt, userId: entry.userId };
    }
  }

  return res.json({
    readiness,
    configured: readiness === "READY",
    tokenInfo,
  });
});

/**
 * POST /connectors/m365/auth/refresh
 * Refreshes the Entra token for the authenticated user.
 * Expects JSON body: { userId: string }
 * Returns refreshed claims — NEVER the raw tokens.
 */
router.post("/connectors/m365/auth/refresh", async (req, res, next) => {
  try {
    const body = req.body as { userId?: string };
    const userId = body?.userId;

    if (!userId) {
      return res.status(400).json({ error: "USER_ID_REQUIRED" });
    }

    const refreshToken = getEntraRefreshToken(userId);
    if (!refreshToken) {
      return res.status(401).json({
        error: "NO_REFRESH_TOKEN",
        message: "No refresh token found for this user; re-authentication required",
      });
    }

    const claims = await refreshEntraToken(refreshToken);

    return res.json({
      ok: true,
      user: {
        sub: claims.sub,
        email: claims.email,
        name: claims.name,
        oid: claims.oid,
        tid: claims.tid,
        groups: claims.groups,
        scp: claims.scp,
        expiresAt: claims.expiresAt,
      },
      mappedRole: mapClaimsToRole(claims.groups),
    });
  } catch (err) {
    return void next(err);
  }
});

export default router;
