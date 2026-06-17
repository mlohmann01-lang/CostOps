export type MicrosoftConnectorKey = "M365" | "ENTRA_ID";
export type MicrosoftAuthFlow = "AUTH_CODE" | "CLIENT_CREDENTIALS";
export type MicrosoftConnectionStatus = "PENDING" | "CONNECTED" | "EXPIRED" | "REVOKED" | "FAILED";

export interface MicrosoftOAuthConnection {
  id: string;
  tenantId: string;
  connectorKey: MicrosoftConnectorKey;
  microsoftTenantId?: string;
  credentialRef: string;
  authFlow: MicrosoftAuthFlow;
  grantedScopes: string[];
  status: MicrosoftConnectionStatus;
  connectedAt?: string;
  lastValidatedAt?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MicrosoftTokenSet { accessToken: string; refreshToken?: string; expiresAt: string; scopes: string[]; microsoftTenantId?: string; }
export interface StoredMicrosoftCredential { credentialRef: string; encryptedTokenPayload: string; connection: MicrosoftOAuthConnection; }
export type MicrosoftFailureCode = "MICROSOFT_AUTH_FAILED" | "MICROSOFT_TOKEN_EXPIRED" | "MICROSOFT_PERMISSION_MISSING" | "MICROSOFT_GRAPH_THROTTLED" | "MICROSOFT_GRAPH_UNAVAILABLE" | "MICROSOFT_REPORT_PARSE_FAILED" | "MICROSOFT_RECORD_VALIDATION_FAILED" | "MICROSOFT_SYNC_BLOCKED_BY_READINESS" | "MICROSOFT_COPILOT_NOT_AVAILABLE";
