/**
 * AI Cost Confidence
 *
 * Computes a confidence score for a cost estimate based on data completeness
 * and attribution quality. The score is a weighted sum of boolean and
 * continuous factors, mapped to a labelled confidence tier.
 */

// Confidence score for a cost estimate, based on data completeness
type CostConfidenceFactors = {
  hasModelPricing: boolean // pricing record found for the model
  hasUserId: boolean // user attribution available
  hasWorkflowId: boolean // workflow attribution available
  hasFreshTelemetry: boolean // telemetry is less than 4 hours old
  hasSufficientVolume: boolean // >= 100 events in the period
  attributionCompleteness: number // 0–1: fraction of records with non-null userId
}

type CostConfidenceResult = {
  confidenceScore: number // 0–1
  confidenceLabel: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT'
  factors: CostConfidenceFactors
  caveats: string[]
}

function computeCostConfidence(factors: CostConfidenceFactors): CostConfidenceResult {
  let score = 0.5

  if (factors.hasModelPricing) {
    score += 0.15
  }
  if (factors.hasUserId) {
    score += 0.10
  }
  if (factors.hasWorkflowId) {
    score += 0.05
  }
  if (factors.hasFreshTelemetry) {
    score += 0.10
  }
  if (factors.hasSufficientVolume) {
    score += 0.05
  }
  // Clamp attributionCompleteness to [0, 1] defensively
  const completeness = Math.min(1, Math.max(0, factors.attributionCompleteness))
  score += 0.05 * completeness

  // Clamp final score to [0, 1]
  const confidenceScore = Math.min(1, Math.max(0, score))

  // Determine label
  let confidenceLabel: CostConfidenceResult['confidenceLabel']
  if (confidenceScore >= 0.85) {
    confidenceLabel = 'HIGH'
  } else if (confidenceScore >= 0.70) {
    confidenceLabel = 'MEDIUM'
  } else if (confidenceScore >= 0.50) {
    confidenceLabel = 'LOW'
  } else {
    confidenceLabel = 'INSUFFICIENT'
  }

  // Build caveats for each false boolean factor
  const caveats: string[] = []

  if (!factors.hasModelPricing) {
    caveats.push(
      'No pricing record found for this model; cost estimates are approximated or unavailable.',
    )
  }
  if (!factors.hasUserId) {
    caveats.push(
      'User attribution is unavailable; costs cannot be attributed to individual users.',
    )
  }
  if (!factors.hasWorkflowId) {
    caveats.push(
      'Workflow attribution is unavailable; costs cannot be linked to specific workflows.',
    )
  }
  if (!factors.hasFreshTelemetry) {
    caveats.push(
      'Telemetry data is more than 4 hours old; real-time accuracy may be reduced.',
    )
  }
  if (!factors.hasSufficientVolume) {
    caveats.push(
      'Fewer than 100 events in the period; statistical reliability of estimates is limited.',
    )
  }

  return {
    confidenceScore,
    confidenceLabel,
    factors,
    caveats,
  }
}

export type { CostConfidenceFactors, CostConfidenceResult }
export { computeCostConfidence }
