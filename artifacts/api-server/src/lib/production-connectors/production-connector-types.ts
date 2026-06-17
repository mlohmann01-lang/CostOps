export type ProductionConnectorFamily = "M365" | "ENTRA_ID" | "FLEXERA" | "ERP" | "SERVICENOW";
export type ProductionConnectorMode = "DRY_RUN" | "VALIDATE" | "SYNC";
export type ProductionConnectorStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "BLOCKED";
export type CapabilityStatus = "READY" | "PARTIAL" | "BLOCKED" | "NOT_CONFIGURED";
export type EndpointStatus = "AVAILABLE" | "UNAVAILABLE" | "UNKNOWN" | "NOT_APPLICABLE";
export type ConnectorTokenProvider = (request: { tenantId: string; connectorKey: string; credentialRef: string; scopes: string[] }) => Promise<string>;

export interface ProductionConnectorRun { id: string; tenantId: string; connectorKey: string; connectorFamily: ProductionConnectorFamily; mode: ProductionConnectorMode; status: ProductionConnectorStatus; startedAt?: string; completedAt?: string; recordsDiscovered: number; recordsNormalised: number; recordsRejected: number; authorityWrites: number; graphWrites: number; evidenceRefs: string[]; failureReason?: string; source: string; createdAt: string; updatedAt: string; }
export interface ProductionConnectorCapabilityResult { tenantId: string; connectorKey: string; connectorFamily: string; status: CapabilityStatus; availableCapabilities: string[]; missingCapabilities: string[]; requiredPermissions: string[]; grantedPermissions?: string[]; endpointStatus: Array<{ endpoint: string; status: EndpointStatus; reason?: string }>; evidenceRefs: string[]; createdAt: string; }
export interface ProductionConnectorNormalisationResult { connectorKey: string; outputContract: string; status: "PASS" | "WARN" | "FAIL"; rawRecordId?: string; normalised?: Record<string, unknown>; errors: Array<{ code: string; message: string; path?: string }>; evidenceRefs: string[]; }
export interface AuthorityWritePlan { tenantId: string; connectorKey: string; mode: ProductionConnectorMode; writes: Array<{ authority: "COMMERCIAL" | "FINANCIAL_TRUTH" | "OWNERSHIP" | "OUTCOME_FINANCE" | "GRAPH" | "EVIDENCE"; operation: "UPSERT" | "APPEND" | "SKIP"; targetType: string; targetId: string; payload: Record<string, unknown>; evidenceRefs: string[] }>; safeToApply: boolean; blockers: string[]; }
export interface ProductionConnectorContext { tenantId: string; connectorKey: string; mode?: ProductionConnectorMode; credentialRef?: string; authorised?: boolean; liveTenantReady?: boolean; source?: string; tokenProvider?: ConnectorTokenProvider; config?: Record<string, unknown>; client?: unknown; }
export interface RawProductionRecord { id: string; kind: string; payload: Record<string, unknown>; sourceEndpoint?: string; }
export interface RawFetchResult { status: "READY" | "BLOCKED" | "NOT_AVAILABLE"; reason?: string; records: RawProductionRecord[]; endpointStatus?: ProductionConnectorCapabilityResult["endpointStatus"]; }
export interface ProductionGraphResult { connectorKey: string; nodes: Array<{ type: string; id: string; properties: Record<string, unknown> }>; edges: Array<{ type: string; from: string; to: string; properties?: Record<string, unknown> }>; evidenceRefs: string[]; }
export interface ProductionEvidenceResult { connectorKey: string; evidenceRefs: string[]; summary: Record<string, unknown>; }
export interface ProductionConnector { connectorKey: string; connectorFamily: ProductionConnectorFamily; adapterConnectorKey: string; requiredPermissions: string[]; discoverCapabilities(context: ProductionConnectorContext): Promise<ProductionConnectorCapabilityResult>; fetchRawRecords(context: ProductionConnectorContext): Promise<RawFetchResult>; normalise(record: RawProductionRecord): ProductionConnectorNormalisationResult; buildEvidence(records: ProductionConnectorNormalisationResult[], context: ProductionConnectorContext, eventType: string): ProductionEvidenceResult; mapToGraph(records: ProductionConnectorNormalisationResult[]): ProductionGraphResult; }
export const PRODUCTION_CONNECTOR_RUNS = "PRODUCTION_CONNECTOR_RUNS";
export const PRODUCTION_CONNECTOR_CAPABILITIES = "PRODUCTION_CONNECTOR_CAPABILITIES";
export const PRODUCTION_CONNECTOR_RAW_SNAPSHOTS = "PRODUCTION_CONNECTOR_RAW_SNAPSHOTS";
export const PRODUCTION_CONNECTOR_NORMALISATION_RESULTS = "PRODUCTION_CONNECTOR_NORMALISATION_RESULTS";
export const PRODUCTION_CONNECTOR_WRITE_PLANS = "PRODUCTION_CONNECTOR_WRITE_PLANS";
export const PRODUCTION_CONNECTOR_EVIDENCE = "PRODUCTION_CONNECTOR_EVIDENCE";
