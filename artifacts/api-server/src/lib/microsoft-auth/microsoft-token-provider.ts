import { MicrosoftOAuthService } from "./microsoft-oauth-service";
export const createMicrosoftTokenProvider = (service: MicrosoftOAuthService) => async (request: { tenantId: string; credentialRef: string }) => service.getAccessTokenForTenant(request);
