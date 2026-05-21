// Unique recommendation identifier for cross-referencing telemetry, proof, and audit
type RecommendationId = string  // format: `rec-${packId}-${tenantId}-${timestamp}`

// Affected resource reference (the thing being optimized)
type AffectedResource = {
  resourceType: 'VENDOR_SEAT' | 'MODEL' | 'AGENT' | 'WORKFLOW' | 'CONTEXT_WINDOW' | 'EMBEDDING_INDEX' | 'VENDOR_CONTRACT'
  resourceId: string           // e.g. 'openai', 'cursor:seat:user@example.com', 'agent-xyz'
  resourceName: string
  vendorId: string | null
}

// Affected workflow reference
type AffectedWorkflow = {
  workflowId: string
  workflowName: string
  averageMonthlyCostUSD: number
  triggerCount: number          // times triggered per month
}

// Telemetry basis — which telemetry snapshot supports this recommendation
type TelemetryBasis = {
  snapshotId: string
  periodStartAt: string
  periodEndAt: string
  overallTrustScore: number
  isMockData: boolean
}

// Canonical metadata attached to every AI recommendation
type AIRecommendationMetadata = {
  recommendationId: RecommendationId
  packId: string
  tenantId: string
  generatedAt: string
  affectedResources: AffectedResource[]
  affectedWorkflows: AffectedWorkflow[]
  telemetryBasis: TelemetryBasis | null
  estimatedMonthlySavingsUSD: number
  estimatedAnnualSavingsUSD: number
  confidenceScore: number       // 0–1
  confidenceLabel: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT'
  proofGraphId: string | null   // links to AIProofGraph
  simulationId: string | null   // links to AISimulationResult
  verificationStrategy: string | null  // e.g. 'TOKEN_REDUCTION_VERIFICATION'
  expiresAt: string             // recommendations expire after 30 days
}

// Build a recommendation ID
// format: `rec-${packId}-${tenantId}-${Date.now()}`
function buildRecommendationId(packId: string, tenantId: string): RecommendationId {
  return `rec-${packId}-${tenantId}-${Date.now()}`
}

function resolveConfidenceLabel(
  confidenceScore: number,
): AIRecommendationMetadata['confidenceLabel'] {
  if (confidenceScore >= 0.85) return 'HIGH'
  if (confidenceScore >= 0.70) return 'MEDIUM'
  if (confidenceScore >= 0.50) return 'LOW'
  return 'INSUFFICIENT'
}

// Build a metadata object with defaults
function buildRecommendationMetadata(
  packId: string,
  tenantId: string,
  estimatedMonthlySavingsUSD: number,
  confidenceScore: number,
  options?: {
    affectedResources?: AffectedResource[]
    affectedWorkflows?: AffectedWorkflow[]
    telemetryBasis?: TelemetryBasis
    verificationStrategy?: string
  },
): AIRecommendationMetadata {
  const recommendationId = buildRecommendationId(packId, tenantId)
  return {
    recommendationId,
    packId,
    tenantId,
    generatedAt: new Date().toISOString(),
    affectedResources: options?.affectedResources ?? [],
    affectedWorkflows: options?.affectedWorkflows ?? [],
    telemetryBasis: options?.telemetryBasis ?? null,
    estimatedMonthlySavingsUSD,
    estimatedAnnualSavingsUSD: estimatedMonthlySavingsUSD * 12,
    confidenceScore,
    confidenceLabel: resolveConfidenceLabel(confidenceScore),
    proofGraphId: `proof-${recommendationId}-${tenantId}`,
    simulationId: null,
    verificationStrategy: options?.verificationStrategy ?? null,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }
}

// Build a mock metadata object for tests
function buildMockRecommendationMetadata(
  packId: string,
  tenantId: string,
): AIRecommendationMetadata {
  return buildRecommendationMetadata(
    packId,
    tenantId,
    1500,
    0.85,
    {
      affectedResources: [
        {
          resourceType: 'MODEL',
          resourceId: 'gpt-4o',
          resourceName: 'GPT-4o',
          vendorId: 'openai',
        },
      ],
      affectedWorkflows: [],
      telemetryBasis: {
        snapshotId: `mock-snapshot-TOKEN_GOVERNANCE-${tenantId}`,
        periodStartAt: '2026-05-01T00:00:00Z',
        periodEndAt: '2026-05-21T00:00:00Z',
        overallTrustScore: 0.9,
        isMockData: true,
      },
      verificationStrategy: 'TOKEN_REDUCTION_VERIFICATION',
    },
  )
}

export type {
  RecommendationId,
  AffectedResource,
  AffectedWorkflow,
  TelemetryBasis,
  AIRecommendationMetadata,
}
export {
  buildRecommendationId,
  buildRecommendationMetadata,
  buildMockRecommendationMetadata,
}
