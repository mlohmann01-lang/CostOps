export type ConnectorHealth = "HEALTHY" | "DEGRADED" | "FAILED";
export type FreshnessBand = "0_7" | "8_30" | "31_90" | "GT_90" | "UNKNOWN";

import type { ConnectorCapability, ConnectorEvidenceContract, ConnectorHealthContract, ConnectorId } from "./sdk";

export type NormalizedM365User = {
  tenantId: string;
  userPrincipalName: string;
  displayName?: string;
  accountEnabled: boolean;
  assignedLicenses: string[];
  lastLoginDaysAgo: number | null;
  sourceTimestamp: string;
  sourceSystem: "M365_GRAPH";
};

export type ConnectorMetadata = {
  tenantId: string;
  connector: "M365_GRAPH";
  connectorHealth: ConnectorHealth;
  lastSyncTime: string;
  dataFreshnessScore: number;
  freshnessBand: FreshnessBand;
  partialData: boolean;
  errorCode?: string;
  errorMessage?: string;
  requestId: string;
};

export type M365IngestionResult = {
  users: NormalizedM365User[];
  metadata: ConnectorMetadata;
  warnings: string[];
  ingestionRunId: string;
};


export type ConnectorAuthState = "READY" | "EXPIRED" | "MISSING" | "ERROR";

export type ConnectorRegistryRecord = {
  connector: ConnectorId;
  capabilities: ConnectorCapability[];
  authState: ConnectorAuthState;
  syncCron: string;
  enabled: boolean;
};

export type ConnectorSyncResult<TPayload> = {
  payload: TPayload;
  health: ConnectorHealthContract;
  evidence: ConnectorEvidenceContract;
};
