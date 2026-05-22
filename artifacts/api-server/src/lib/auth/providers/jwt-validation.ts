import { jwtVerify, createRemoteJWKSet, importSPKI } from 'jose'
import type { ProviderClaims } from './token-claims.js'
import { logger } from '../../logger.js'

// Three modes — selected by env vars at module load time:
// 1. JWKS_URI is set → fetch public keys from OIDC provider (RS256/ES256) — PRODUCTION
// 2. JWT_PUBLIC_KEY is set → use static PEM public key (RS256) — staging/CI
// 3. JWT_SECRET is set → use HMAC HS256 shared secret — dev/testing
// 4. None → dev-fallback mode: log WARNING, accept any token with mock claims
//    BLOCKED in production (NODE_ENV=production) — rejects all requests

type JwtMode = 'JWKS' | 'PUBLIC_KEY' | 'HMAC' | 'DEV_FALLBACK'

export type JwtValidationResult =
  | { ok: true; claims: ProviderClaims }
  | { ok: false; error: string }

function detectMode(): JwtMode {
  if (process.env.JWKS_URI) return 'JWKS'
  if (process.env.JWT_PUBLIC_KEY) return 'PUBLIC_KEY'
  if (process.env.JWT_SECRET) return 'HMAC'
  return 'DEV_FALLBACK'
}

// Module-level singletons — created once and reused across requests
const _mode: JwtMode = detectMode()

// Cached JWKS remote client (only initialized when JWKS mode is active)
let _jwksClient: ReturnType<typeof createRemoteJWKSet> | null = null
if (_mode === 'JWKS') {
  _jwksClient = createRemoteJWKSet(new URL(process.env.JWKS_URI!))
}

export function getJwtMode(): JwtMode {
  return _mode
}

function extractClaims(payload: Record<string, unknown>): ProviderClaims {
  const sub = typeof payload['sub'] === 'string' ? payload['sub'] : 'unknown'
  const email =
    typeof payload['email'] === 'string'
      ? payload['email']
      : typeof payload['preferred_username'] === 'string'
        ? payload['preferred_username']
        : undefined
  // Azure/Entra uses 'tid' for tenant ID; custom claim is 'costops_tenant_id'
  const tenantId =
    typeof payload['tid'] === 'string'
      ? payload['tid']
      : typeof payload['costops_tenant_id'] === 'string'
        ? payload['costops_tenant_id']
        : undefined
  // Azure uses 'groups' (group object IDs) or 'roles' array
  const groups: string[] = Array.isArray(payload['groups'])
    ? (payload['groups'] as string[])
    : Array.isArray(payload['roles'])
      ? (payload['roles'] as string[])
      : []
  const name = typeof payload['name'] === 'string' ? payload['name'] : undefined
  return { sub, email, tenantId, groups, name }
}

async function validateWithJwks(token: string): Promise<JwtValidationResult> {
  try {
    const { payload } = await jwtVerify(token, _jwksClient!)
    return { ok: true, claims: extractClaims(payload as Record<string, unknown>) }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    return { ok: false, error }
  }
}

async function validateWithPublicKey(token: string): Promise<JwtValidationResult> {
  try {
    const key = await importSPKI(process.env.JWT_PUBLIC_KEY!, 'RS256')
    const { payload } = await jwtVerify(token, key)
    return { ok: true, claims: extractClaims(payload as Record<string, unknown>) }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    return { ok: false, error }
  }
}

async function validateWithHmac(token: string): Promise<JwtValidationResult> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] })
    return { ok: true, claims: extractClaims(payload as Record<string, unknown>) }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    return { ok: false, error }
  }
}

function validateDevFallback(token: string): JwtValidationResult {
  if (process.env.NODE_ENV === 'production') {
    return { ok: false, error: 'JWT_VALIDATION_NOT_CONFIGURED' }
  }

  logger.warn('DEV_FALLBACK JWT mode active — tokens are NOT cryptographically verified. Do not use in production.')

  // Try to parse the token without verification
  const parts = token.split('.')
  if (parts.length === 3) {
    try {
      // Base64url decode the payload (second part)
      const payloadBase64 = parts[1]
      // Add padding if needed
      const padded = payloadBase64 + '='.repeat((4 - (payloadBase64.length % 4)) % 4)
      const decoded = Buffer.from(padded, 'base64url').toString('utf8')
      const payload = JSON.parse(decoded) as Record<string, unknown>
      return { ok: true, claims: extractClaims(payload) }
    } catch {
      // Fall through to mock claims if parsing fails
    }
  }

  // Not a valid JWT shape — return mock claims
  return {
    ok: true,
    claims: { sub: 'dev-user', tenantId: 'dev-tenant', groups: ['operator'] },
  }
}

export async function validateJwtToken(token: string): Promise<JwtValidationResult> {
  if (!token) {
    return { ok: false, error: 'TOKEN_REQUIRED' }
  }

  switch (_mode) {
    case 'JWKS':
      return validateWithJwks(token)
    case 'PUBLIC_KEY':
      return validateWithPublicKey(token)
    case 'HMAC':
      return validateWithHmac(token)
    case 'DEV_FALLBACK':
      return validateDevFallback(token)
  }
}
