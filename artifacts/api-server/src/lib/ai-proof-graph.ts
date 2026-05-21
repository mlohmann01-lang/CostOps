// Proof node types for the AI economic governance layer
type AIProofNodeType =
  | 'TELEMETRY'         // raw/normalized usage data
  | 'COST'              // computed cost attribution
  | 'PRICING'           // pricing catalog entry used
  | 'USAGE_PATTERN'     // detected usage patterns
  | 'TRUST_SCORE'       // telemetry trust assessment
  | 'SIMULATION'        // simulation before/after state
  | 'VERIFICATION'      // post-execution verification result
  | 'DRIFT'             // drift detection result
  | 'ROI'               // ROI measurement
  | 'VENDOR_OVERLAP'    // vendor seat overlap finding

type AIProofNode = {
  nodeId: string                  // unique within the proof graph
  nodeType: AIProofNodeType
  tenantId: string
  recommendationId: string | null // null for non-recommendation proof nodes
  payload: Record<string, unknown>
  createdAt: string
  trustScore: number              // 0–1
  isMockData: boolean
}

type AIProofEdge = {
  fromNodeId: string
  toNodeId: string
  edgeType: 'SUPPORTS' | 'DERIVED_FROM' | 'CONTRADICTS' | 'VERIFIES' | 'SIMULATES'
}

type AIProofGraph = {
  graphId: string
  tenantId: string
  recommendationId: string | null
  nodes: AIProofNode[]
  edges: AIProofEdge[]
  overallTrustScore: number       // min trust score across all nodes
  isMockData: boolean             // true if any node has isMockData=true
  createdAt: string
}

// Build a proof node
function buildProofNode(
  nodeType: AIProofNodeType,
  tenantId: string,
  payload: Record<string, unknown>,
  recommendationId: string | null,
  trustScore: number,
  isMockData: boolean,
): AIProofNode {
  return {
    nodeId: `${nodeType}-${tenantId}-${Date.now()}`,
    nodeType,
    tenantId,
    recommendationId,
    payload,
    createdAt: new Date().toISOString(),
    trustScore,
    isMockData,
  }
}

// Build a minimal proof graph for a recommendation
function buildRecommendationProofGraph(
  tenantId: string,
  recommendationId: string,
  nodes: AIProofNode[],
  edges: AIProofEdge[],
): AIProofGraph {
  return {
    graphId: `proof-${recommendationId}-${tenantId}`,
    tenantId,
    recommendationId,
    nodes,
    edges,
    overallTrustScore: Math.min(...nodes.map((n) => n.trustScore)),
    isMockData: nodes.some((n) => n.isMockData),
    createdAt: new Date().toISOString(),
  }
}

// Build a mock proof graph for testing (telemetry + cost + pricing nodes)
function buildMockProofGraph(tenantId: string, recommendationId: string): AIProofGraph {
  const telemetryNode = buildProofNode(
    'TELEMETRY',
    tenantId,
    { source: 'mock', description: 'Raw usage telemetry data' },
    recommendationId,
    0.9,
    true,
  )
  const pricingNode = buildProofNode(
    'PRICING',
    tenantId,
    { source: 'mock', description: 'Pricing catalog entry used for cost computation' },
    recommendationId,
    0.95,
    true,
  )
  const costNode = buildProofNode(
    'COST',
    tenantId,
    { source: 'mock', description: 'Computed cost attribution' },
    recommendationId,
    0.85,
    true,
  )

  const edges: AIProofEdge[] = [
    {
      fromNodeId: costNode.nodeId,
      toNodeId: telemetryNode.nodeId,
      edgeType: 'DERIVED_FROM',
    },
    {
      fromNodeId: costNode.nodeId,
      toNodeId: pricingNode.nodeId,
      edgeType: 'DERIVED_FROM',
    },
  ]

  return buildRecommendationProofGraph(
    tenantId,
    recommendationId,
    [telemetryNode, costNode, pricingNode],
    edges,
  )
}

export type { AIProofNodeType, AIProofNode, AIProofEdge, AIProofGraph }
export { buildProofNode, buildRecommendationProofGraph, buildMockProofGraph }
