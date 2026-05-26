import type { CanonicalGraphEntityType, CanonicalRelationshipType, GraphEvidence } from "../operational-graph/types";
export type DiscoverySource = "M365"|"Entra"|"Flexera"|"ServiceNow"|"SaaSConnector"|"OAuthGrant"|"AIProvider"|"MCPRegistry"|"ExpensePlaceholder"|"BrowserTelemetryPlaceholder"|"EndpointTelemetryPlaceholder";
export type DiscoverySignal = { source: DiscoverySource; externalId: string; entityType: CanonicalGraphEntityType; displayName: string; confidence: number; observedAt: string; attributes?: Record<string, unknown>; relatedTo?: { canonicalKey: string; relationshipType: CanonicalRelationshipType; confidence: number }[] };
export type DiscoveryFinding = { tenantId: string; runId: string; signal: DiscoverySignal; evidence: GraphEvidence[]; conflicts: string[] };
