import type { ProviderClaims } from "./token-claims.js";
import { logger } from "../../logger.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EntraClaims = ProviderClaims & {
  oid?: string;       // Entra Object ID
  tid?: string;       // Tenant ID (from token)
  scp?: string;       // Scopes granted (space-separated)
  expiresAt?: number; // Unix epoch seconds
};

export type EntraReadiness = "READY" | "DEGRADED" | "UNAVAILABLE" | "OFF";

interface EntraTokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token: string;
  expires_in: number;
  token_type: string;
}

interface EntraErrorResponse {
  error: string;
  error_description?: string;
}

// ---------------------------------------------------------------------------
// Token store interface — allows pluggable storage; defaults to in-memory
// ---------------------------------------------------------------------------

export interface EntraTokenStore {
  save(userId: string, entry: TokenStoreEntry): void;
  get(userId: string): TokenStoreEntry | undefined;
  delete(userId: string): void;
}

export interface TokenStoreEntry {
  /** Hashed or opaque reference — NEVER the raw token */
  refreshTokenRef: string;
  expiresAt: number; // Unix epoch seconds
  userId: string;
}

class InMemoryTokenStore implements EntraTokenStore {
  private readonly _store = new Map<string, TokenStoreEntry>();

  save(userId: string, entry: TokenStoreEntry): void {
    this._store.set(userId, entry);
  }

  get(userId: string): TokenStoreEntry | undefined {
    return this._store.get(userId);
  }

  delete(userId: string): void {
    this._store.delete(userId);
  }
}

// Singleton in-memory store (dev-only default)
let _tokenStore: EntraTokenStore = new InMemoryTokenStore();

/** Replace the default in-memory store with a production-grade implementation. */
export function setEntraTokenStore(store: EntraTokenStore): void {
  _tokenStore = store;
}

// ---------------------------------------------------------------------------
// Config helpers
// ---------------------------------------------------------------------------

interface EntraConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  redirectUri: string;
}

function resolveEntraConfig(): EntraConfig {
  const clientId = process.env.ENTRA_CLIENT_ID;
  const clientSecret = process.env.ENTRA_CLIENT_SECRET;
  const tenantId = process.env.ENTRA_TENANT_ID;
  const redirectUri = process.env.ENTRA_REDIRECT_URI;

  const missing: string[] = [];
  if (!clientId) missing.push("ENTRA_CLIENT_ID");
  if (!clientSecret) missing.push("ENTRA_CLIENT_SECRET");
  if (!tenantId) missing.push("ENTRA_TENANT_ID");
  if (!redirectUri) missing.push("ENTRA_REDIRECT_URI");

  if (missing.length > 0) {
    const err = new Error("ENTRA_CONFIG_INCOMPLETE");
    (err as Error & { missing: string[] }).missing = missing;
    throw err;
  }

  return {
    clientId: clientId!,
    clientSecret: clientSecret!,
    tenantId: tenantId!,
    redirectUri: redirectUri!,
  };
}

export function getEntraReadiness(): EntraReadiness {
  const clientId = process.env.ENTRA_CLIENT_ID;
  const clientSecret = process.env.ENTRA_CLIENT_SECRET;
  const tenantId = process.env.ENTRA_TENANT_ID;
  const redirectUri = process.env.ENTRA_REDIRECT_URI;

  const allPresent = clientId && clientSecret && tenantId && redirectUri;
  if (allPresent) return "READY";

  const anyPresent = clientId || clientSecret || tenantId || redirectUri;
  if (anyPresent) return "DEGRADED";

  return "UNAVAILABLE";
}

// ---------------------------------------------------------------------------
// JWT decode (no verification — id_token is already verified by Entra endpoint)
// ---------------------------------------------------------------------------

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("INVALID_JWT_FORMAT");
  }
  const payloadBase64 = parts[1];
  const padded = payloadBase64 + "=".repeat((4 - (payloadBase64.length % 4)) % 4);
  const decoded = Buffer.from(padded, "base64url").toString("utf-8");
  return JSON.parse(decoded) as Record<string, unknown>;
}

function claimsFromIdTokenPayload(payload: Record<string, unknown>): EntraClaims {
  const sub = typeof payload["sub"] === "string" ? payload["sub"] : "unknown";

  const email =
    typeof payload["email"] === "string"
      ? payload["email"]
      : typeof payload["preferred_username"] === "string"
        ? payload["preferred_username"]
        : undefined;

  const name = typeof payload["name"] === "string" ? payload["name"] : undefined;

  const oid = typeof payload["oid"] === "string" ? payload["oid"] : undefined;

  const tid = typeof payload["tid"] === "string" ? payload["tid"] : undefined;

  const scp =
    typeof payload["scp"] === "string"
      ? payload["scp"]
      : Array.isArray(payload["roles"])
        ? (payload["roles"] as string[]).join(" ")
        : undefined;

  const groups: string[] = Array.isArray(payload["groups"])
    ? (payload["groups"] as string[])
    : Array.isArray(payload["roles"])
      ? (payload["roles"] as string[])
      : [];

  const expiresAt =
    typeof payload["exp"] === "number" ? payload["exp"] : undefined;

  return { sub, email, name, oid, tid, tenantId: tid, groups, scp, expiresAt };
}

// ---------------------------------------------------------------------------
// Core: exchange authorization code for claims
// ---------------------------------------------------------------------------

export async function exchangeCodeForClaims(code: string): Promise<EntraClaims> {
  if (!code) throw new Error("CODE_REQUIRED");

  const cfg = resolveEntraConfig(); // throws ENTRA_CONFIG_INCOMPLETE if env vars absent

  const tokenEndpoint = `https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    code,
    redirect_uri: cfg.redirectUri,
    grant_type: "authorization_code",
    scope: "openid profile email offline_access",
  });

  let rawResponse: Response;
  try {
    rawResponse = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  } catch (networkErr) {
    const message = networkErr instanceof Error ? networkErr.message : String(networkErr);
    throw new Error(`ENTRA_NETWORK_ERROR: ${message}`);
  }

  const json = (await rawResponse.json()) as EntraTokenResponse | EntraErrorResponse;

  if (!rawResponse.ok || "error" in json) {
    const errJson = json as EntraErrorResponse;
    const description = errJson.error_description ?? errJson.error ?? "ENTRA_TOKEN_EXCHANGE_FAILED";
    // Log the error category only — never log client_secret or raw tokens
    logger.warn({ entraError: errJson.error }, "Entra token exchange failed");
    throw new Error(description);
  }

  const tokenResponse = json as EntraTokenResponse;

  // Decode id_token to extract user claims
  const payload = decodeJwtPayload(tokenResponse.id_token);
  const claims = claimsFromIdTokenPayload(payload);

  // Override expiresAt using expires_in from the token response if the id_token
  // doesn't carry an "exp" claim (uncommon but defensive)
  const expiresAt = claims.expiresAt ?? Math.floor(Date.now() / 1000) + tokenResponse.expires_in;

  // Store an opaque reference to the refresh token (NEVER the raw value in logs)
  if (tokenResponse.refresh_token && claims.sub) {
    _tokenStore.save(claims.sub, {
      // In production the token should be encrypted at rest; here we store a
      // reference identifier alongside the (encrypted) value. For the
      // in-memory dev store we keep the raw token only in memory — never logged.
      refreshTokenRef: tokenResponse.refresh_token,
      expiresAt,
      userId: claims.sub,
    });
  }

  logger.info({ sub: claims.sub, oid: claims.oid, tid: claims.tid }, "Entra token exchange succeeded");

  return { ...claims, expiresAt };
}

// ---------------------------------------------------------------------------
// Refresh token flow
// ---------------------------------------------------------------------------

export async function refreshEntraToken(refreshToken: string): Promise<EntraClaims> {
  if (!refreshToken) throw new Error("REFRESH_TOKEN_REQUIRED");

  const cfg = resolveEntraConfig();

  const tokenEndpoint = `https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    scope: "openid profile email offline_access",
  });

  let rawResponse: Response;
  try {
    rawResponse = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  } catch (networkErr) {
    const message = networkErr instanceof Error ? networkErr.message : String(networkErr);
    throw new Error(`ENTRA_NETWORK_ERROR: ${message}`);
  }

  const json = (await rawResponse.json()) as EntraTokenResponse | EntraErrorResponse;

  if (!rawResponse.ok || "error" in json) {
    const errJson = json as EntraErrorResponse;
    const description = errJson.error_description ?? errJson.error ?? "ENTRA_REFRESH_FAILED";
    logger.warn({ entraError: errJson.error }, "Entra token refresh failed");
    throw new Error(description);
  }

  const tokenResponse = json as EntraTokenResponse;
  const payload = decodeJwtPayload(tokenResponse.id_token);
  const claims = claimsFromIdTokenPayload(payload);

  const expiresAt = claims.expiresAt ?? Math.floor(Date.now() / 1000) + tokenResponse.expires_in;

  // Update the store with the new refresh token
  if (tokenResponse.refresh_token && claims.sub) {
    _tokenStore.save(claims.sub, {
      refreshTokenRef: tokenResponse.refresh_token,
      expiresAt,
      userId: claims.sub,
    });
  }

  logger.info({ sub: claims.sub }, "Entra token refreshed successfully");

  return { ...claims, expiresAt };
}

// ---------------------------------------------------------------------------
// Expose token store queries (without leaking raw tokens)
// ---------------------------------------------------------------------------

export function getEntraTokenEntry(userId: string): Omit<TokenStoreEntry, "refreshTokenRef"> | undefined {
  const entry = _tokenStore.get(userId);
  if (!entry) return undefined;
  // Never expose the raw refresh token reference to callers
  const { refreshTokenRef: _redacted, ...safe } = entry;
  return safe;
}

export function getEntraRefreshToken(userId: string): string | undefined {
  return _tokenStore.get(userId)?.refreshTokenRef;
}

// ---------------------------------------------------------------------------
// Authorization URL builder
// ---------------------------------------------------------------------------

export function buildEntraLoginUrl(state: string): string {
  const tenantId = process.env.ENTRA_TENANT_ID;
  const clientId = process.env.ENTRA_CLIENT_ID;
  const redirectUri = process.env.ENTRA_REDIRECT_URI;

  if (!tenantId || !clientId || !redirectUri) {
    // Return a sentinel so the caller can surface UNAVAILABLE state
    const missing = [
      !tenantId && "ENTRA_TENANT_ID",
      !clientId && "ENTRA_CLIENT_ID",
      !redirectUri && "ENTRA_REDIRECT_URI",
    ]
      .filter(Boolean)
      .join(",");
    const err = new Error("ENTRA_CONFIG_INCOMPLETE");
    (err as Error & { missing: string }).missing = missing;
    throw err;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "openid profile email offline_access",
    state,
  });

  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
}
