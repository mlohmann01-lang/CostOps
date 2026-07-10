import type { ProviderClaims } from "./token-claims.js";

export function buildEntraLoginUrl(state: string) {
  const base = "https://login.microsoftonline.com";
  return `${base}/${process.env.ENTRA_TENANT_ID}/oauth2/v2.0/authorize?client_id=${process.env.ENTRA_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(process.env.ENTRA_REDIRECT_URI ?? "")}&scope=openid%20profile%20email&state=${state}`;
}

// TODO: Exchange the authorization code for tokens via Entra's token endpoint and
// verify the returned id_token (JWKS) before trusting any claims from it.
//
// Until that real exchange is implemented, this function must NEVER hand back
// claims that look authentic — doing so previously routed through
// validateJwtToken("mock"), which returned unverified dev-fallback claims
// (sub: 'dev-user', groups: ['operator']) for ANY request whenever no
// JWKS_URI/JWT_PUBLIC_KEY/JWT_SECRET was configured, silently granting operator
// access to anyone who could reach /login/callback outside NODE_ENV=production.
//
// This stub instead fails closed in production/live mode, and is loud and
// explicit about being a placeholder everywhere else.
export async function exchangeCodeForClaims(code: string): Promise<ProviderClaims> {
  if (!code) throw new Error("CODE_REQUIRED");
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "ENTRA_TOKEN_EXCHANGE_NOT_IMPLEMENTED: real Microsoft Entra authorization-code exchange is not implemented. " +
      "Refusing to authenticate with unverified claims in production.",
    );
  }
  console.warn(
    "ENTRA_TOKEN_EXCHANGE_NOT_IMPLEMENTED: /login/callback is returning hardcoded development claims instead of " +
    "exchanging the authorization code with Entra. This path must never run with NODE_ENV=production.",
  );
  return { sub: "dev-entra-user", tenantId: "dev-tenant", groups: ["operator"] };
}
