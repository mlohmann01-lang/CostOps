import { validateJwtToken } from "./jwt-validation";
export function buildEntraLoginUrl(state: string) { const base = "https://login.microsoftonline.com"; return `${base}/${process.env.ENTRA_TENANT_ID}/oauth2/v2.0/authorize?client_id=${process.env.ENTRA_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(process.env.ENTRA_REDIRECT_URI ?? "")}&scope=openid%20profile%20email&state=${state}`; }
export function exchangeCodeForClaims(code: string) { if (!code) throw new Error("CODE_REQUIRED"); return validateJwtToken("mock"); }
