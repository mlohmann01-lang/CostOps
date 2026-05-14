import { buildEntraLoginUrl, exchangeCodeForClaims } from "./microsoft-entra";
export const authProviderRegistry = { MICROSOFT_ENTRA: { loginUrl: buildEntraLoginUrl, exchangeCodeForClaims } };
