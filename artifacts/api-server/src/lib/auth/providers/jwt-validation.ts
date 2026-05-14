import type { ProviderClaims } from "./token-claims";
export function validateJwtToken(token: string): ProviderClaims { if (!token) throw new Error("TOKEN_REQUIRED"); return { sub: "mock-subject", tenantId: "default", groups: ["viewer"] }; }
