export const CONNECTOR_CAPABILITIES = [
  "AUTH",
  "READ_USERS",
  "READ_LICENSES",
  "READ_CONTRACTS",
  "READ_COSTS",
  "READ_ACTIVITY",
  "EXECUTE_ACTIONS",
] as const;

export type ConnectorCapability = (typeof CONNECTOR_CAPABILITIES)[number];

export const CONNECTOR_IDS = ["M365_GRAPH", "FLEXERA", "SERVICENOW", "AWS", "AZURE", "SALESFORCE"] as const;
export type ConnectorId = (typeof CONNECTOR_IDS)[number];

export type ConnectorHealthContract = {
  status: "HEALTHY" | "DEGRADED" | "FAILED";
  lastSyncTime: string;
  dataFreshnessScore: number;
  freshnessBand: "0_7" | "8_30" | "31_90" | "GT_90" | "UNKNOWN";
  partialData: boolean;
  errorCode?: string;
  errorMessage?: string;
};

export type ConnectorEvidenceContract = {
  requestId: string;
  sourceTimestamp: string;
  warnings: string[];
};

export interface BaseSyncJob<TData> {
  run(tenantId: string): Promise<TData>;
}

export interface BaseConnector<TData> {
  id: ConnectorId;
  capabilities: readonly ConnectorCapability[];
  runSync: BaseSyncJob<TData>["run"];
}

export class ConnectorRegistry {
  private readonly connectors = new Map<ConnectorId, BaseConnector<unknown>>();

  register<TData>(connector: BaseConnector<TData>) {
    this.connectors.set(connector.id, connector as BaseConnector<unknown>);
  }

  get(id: ConnectorId) {
    return this.connectors.get(id);
  }

  list() {
    return [...this.connectors.values()];
  }
}
