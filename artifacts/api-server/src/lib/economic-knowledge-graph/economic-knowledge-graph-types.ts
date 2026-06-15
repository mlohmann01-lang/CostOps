import type { PersistedRecord } from "../persistence/persistence-provider";

export enum EconomicGraphNodeType {
  TENANT = "TENANT",
  VENDOR = "VENDOR",
  PRODUCT = "PRODUCT",
  APPLICATION = "APPLICATION",
  AI_MODEL = "AI_MODEL",
  AI_AGENT = "AI_AGENT",
  AI_WORKFLOW = "AI_WORKFLOW",
  MCP_SERVER = "MCP_SERVER",
  TOOL = "TOOL",
  USER = "USER",
  MANAGER = "MANAGER",
  DEPARTMENT = "DEPARTMENT",
  COST_CENTRE = "COST_CENTRE",
  EXECUTIVE_OWNER = "EXECUTIVE_OWNER",
  CONTRACT = "CONTRACT",
  ENTITLEMENT = "ENTITLEMENT",
  RENEWAL = "RENEWAL",
  INVOICE = "INVOICE",
  PURCHASE_ORDER = "PURCHASE_ORDER",
  USAGE_SIGNAL = "USAGE_SIGNAL",
  RECOMMENDATION = "RECOMMENDATION",
  APPROVAL = "APPROVAL",
  GOVERNED_ACTION = "GOVERNED_ACTION",
  EXECUTION = "EXECUTION",
  EVIDENCE_PACK = "EVIDENCE_PACK",
  OUTCOME_EVENT = "OUTCOME_EVENT",
  RISK = "RISK",
}

export enum EconomicGraphEdgeType {
  OWNS = "OWNS",
  MANAGES = "MANAGES",
  FUNDS = "FUNDS",
  ASSIGNED_TO = "ASSIGNED_TO",
  USES = "USES",
  CONSUMES = "CONSUMES",
  GOVERNED_BY = "GOVERNED_BY",
  HAS_ENTITLEMENT = "HAS_ENTITLEMENT",
  HAS_CONTRACT = "HAS_CONTRACT",
  HAS_RENEWAL = "HAS_RENEWAL",
  PAID_BY = "PAID_BY",
  TARGETS = "TARGETS",
  REQUIRES_APPROVAL = "REQUIRES_APPROVAL",
  APPROVES = "APPROVES",
  EXECUTES = "EXECUTES",
  VERIFIES = "VERIFIES",
  SUPPORTED_BY_EVIDENCE = "SUPPORTED_BY_EVIDENCE",
  BLOCKS_SAVINGS = "BLOCKS_SAVINGS",
  CREATES_LEVERAGE = "CREATES_LEVERAGE",
  HAS_RISK = "HAS_RISK",
  BELONGS_TO = "BELONGS_TO",
  DERIVED_FROM = "DERIVED_FROM",
}

export interface EconomicGraphNode extends PersistedRecord {
  id: string;
  tenantId: string;
  type: EconomicGraphNodeType;
  source: string;
  sourceEntityId?: string;
  canonicalEntityId?: string;
  displayName: string;
  properties: Record<string, unknown>;
  /** Must be 0.0–1.0 */
  confidence: number;
  evidenceRefs: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EconomicGraphEdge extends PersistedRecord {
  id: string;
  tenantId: string;
  fromNodeId: string;
  toNodeId: string;
  type: EconomicGraphEdgeType;
  source: string;
  /** Must be 0.0–1.0 */
  confidence: number;
  evidenceRefs: string[];
  validFrom?: string;
  validTo?: string;
  properties: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type GraphNodeFilters = Partial<Pick<EconomicGraphNode, "type" | "source" | "sourceEntityId">>;
export type GraphEdgeFilters = { type?: EconomicGraphEdgeType; fromNodeId?: string; toNodeId?: string; source?: string };
export type NeighborDirection = "OUTBOUND" | "INBOUND" | "BOTH";
