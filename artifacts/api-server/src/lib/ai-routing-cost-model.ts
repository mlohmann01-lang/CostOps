/**
 * AI Routing Cost Model
 *
 * Provides task-complexity classification and routing decision logic used by the
 * AI governance layer to route LLM calls to the most cost-efficient model while
 * preserving output quality.
 */

import { getModelPricing, computeTokenCost, computeMonthlyCostProjection } from './ai-token-pricing-catalog'
import {
  ModelComplexityBand,
  AI_MODEL_CAPABILITY_MATRIX,
  isModelSuitableForComplexity,
  suggestDowngrade,
  computeDowngradeSavings,
} from './ai-model-capability-matrix'

// ---------------------------------------------------------------------------
// Re-export shared type so consumers only need one import
// ---------------------------------------------------------------------------

export type { ModelComplexityBand }

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RoutingDecision = {
  taskId: string
  classifiedComplexity: ModelComplexityBand
  currentModel: string
  currentVendor: string
  recommendedModel: string
  recommendedVendor: string
  currentMonthlyCost: number
  projectedMonthlyCost: number
  projectedSavings: number
  savingsConfidence: number    // 0.0 – 1.0
  qualityRisk: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'
  rationale: string
}

export type TaskComplexitySignals = {
  promptLength: number         // tokens
  toolCallCount: number
  outputLength: number         // tokens
  retryCount: number
  averageLatencyMs: number
  isReasoningEnabled: boolean
  hasMultipleSteps: boolean
}

export type RoutingAggregation = {
  totalCurrentCost: number
  totalProjectedCost: number
  totalSavings: number
  totalSavingsPct: number
  highConfidenceDecisions: RoutingDecision[]
}

// ---------------------------------------------------------------------------
// Complexity classification
// ---------------------------------------------------------------------------

/**
 * Classify a task into a ModelComplexityBand based on observable signals.
 *
 * The heuristic weights each signal on a 0-100 scale and maps the composite
 * score to a band.  All thresholds are intentionally conservative: when signals
 * are ambiguous, the function promotes to the next higher band.
 */
export function classifyTaskComplexity(signals: TaskComplexitySignals): ModelComplexityBand {
  let score = 0

  // ---- Prompt length --------------------------------------------------------
  // TRIVIAL ≤ 200 tokens; EXPERT ≥ 4 000 tokens
  if (signals.promptLength <= 200) {
    score += 0
  } else if (signals.promptLength <= 600) {
    score += 10
  } else if (signals.promptLength <= 1_500) {
    score += 20
  } else if (signals.promptLength <= 4_000) {
    score += 35
  } else {
    score += 50
  }

  // ---- Output length --------------------------------------------------------
  if (signals.outputLength <= 100) {
    score += 0
  } else if (signals.outputLength <= 400) {
    score += 5
  } else if (signals.outputLength <= 1_000) {
    score += 10
  } else if (signals.outputLength <= 3_000) {
    score += 20
  } else {
    score += 30
  }

  // ---- Tool calls -----------------------------------------------------------
  if (signals.toolCallCount === 0) {
    score += 0
  } else if (signals.toolCallCount <= 2) {
    score += 5
  } else if (signals.toolCallCount <= 5) {
    score += 12
  } else {
    score += 20
  }

  // ---- Retries signal quality problems or ambiguity -------------------------
  score += Math.min(signals.retryCount * 5, 20)

  // ---- Latency (as a proxy for model effort already observed) ---------------
  if (signals.averageLatencyMs > 8_000) {
    score += 15
  } else if (signals.averageLatencyMs > 3_000) {
    score += 8
  }

  // ---- Flags ----------------------------------------------------------------
  if (signals.isReasoningEnabled) score += 20
  if (signals.hasMultipleSteps) score += 10

  // ---- Map score → band -----------------------------------------------------
  // Score range: 0 – 165
  if (score <= 10) return 'TRIVIAL'
  if (score <= 30) return 'SIMPLE'
  if (score <= 60) return 'MODERATE'
  if (score <= 100) return 'COMPLEX'
  return 'EXPERT'
}

// ---------------------------------------------------------------------------
// Routing decision engine
// ---------------------------------------------------------------------------

/**
 * Compute a routing recommendation for a single task type.
 *
 * The function classifies complexity, checks whether the current model is
 * over-qualified, and if so, finds a cheaper downgrade candidate.
 *
 * @param taskId              Opaque identifier for the calling task / workflow.
 * @param signals             Observable signals describing the task.
 * @param currentModel        Model currently used for this task.
 * @param currentVendor       Vendor of the current model.
 * @param monthlyCallVolume   Expected number of calls per month for this task.
 */
export function computeRoutingDecision(
  taskId: string,
  signals: TaskComplexitySignals,
  currentModel: string,
  currentVendor: string,
  monthlyCallVolume: number,
): RoutingDecision {
  const complexity = classifyTaskComplexity(signals)

  // Typical tokens per call derived from the signals
  const avgInputTokens = signals.promptLength
  const avgOutputTokens = signals.outputLength

  // Monthly token totals
  const monthlyInput = avgInputTokens * monthlyCallVolume
  const monthlyOutput = avgOutputTokens * monthlyCallVolume

  // Current monthly cost
  const currentPricing = getModelPricing(currentVendor, currentModel)
  const currentMonthlyCost = currentPricing
    ? computeTokenCost(currentPricing, monthlyInput, monthlyOutput)
    : 0

  // Check whether the current model is over-qualified for the classified complexity
  const isOverQualified = !isModelSuitableForComplexity(currentModel, complexity)
  const downgradeCandidate = suggestDowngrade(currentModel, complexity)

  if (!isOverQualified || !downgradeCandidate) {
    // No change recommended
    return {
      taskId,
      classifiedComplexity: complexity,
      currentModel,
      currentVendor,
      recommendedModel: currentModel,
      recommendedVendor: currentVendor,
      currentMonthlyCost,
      projectedMonthlyCost: currentMonthlyCost,
      projectedSavings: 0,
      savingsConfidence: 1.0,
      qualityRisk: 'NONE',
      rationale: isOverQualified
        ? `No suitable downgrade found for complexity ${complexity}; keeping ${currentModel}.`
        : `Current model ${currentModel} is appropriate for complexity ${complexity}; no change recommended.`,
    }
  }

  // Compute projected savings
  const rawSavings = computeDowngradeSavings(currentModel, downgradeCandidate.modelId, {
    input: monthlyInput,
    output: monthlyOutput,
  })

  const downgradePricing = getModelPricing(downgradeCandidate.vendor, downgradeCandidate.modelId)
  const projectedMonthlyCost = downgradePricing
    ? computeTokenCost(downgradePricing, monthlyInput, monthlyOutput)
    : currentMonthlyCost - rawSavings

  // Assess quality risk
  const qualityRisk = _assessQualityRisk(currentModel, downgradeCandidate.modelId, complexity)

  // Savings confidence accounts for quality risk and retry risk
  const confidencePenalty =
    qualityRisk === 'HIGH' ? 0.5
    : qualityRisk === 'MEDIUM' ? 0.2
    : qualityRisk === 'LOW' ? 0.1
    : 0

  const retryRiskPenalty = Math.min(signals.retryCount * 0.05, 0.25)
  const savingsConfidence = Math.max(0, 1.0 - confidencePenalty - retryRiskPenalty)

  const rationale =
    `Task complexity classified as ${complexity}. ` +
    `Current model ${currentModel} supports bands above ${complexity}. ` +
    `${downgradeCandidate.modelId} is suitable for ${complexity} tasks ` +
    `and projects ${((rawSavings / (currentMonthlyCost || 1)) * 100).toFixed(1)}% cost reduction ` +
    `(USD ${rawSavings.toFixed(2)}/month). Quality risk: ${qualityRisk}.`

  return {
    taskId,
    classifiedComplexity: complexity,
    currentModel,
    currentVendor,
    recommendedModel: downgradeCandidate.modelId,
    recommendedVendor: downgradeCandidate.vendor,
    currentMonthlyCost,
    projectedMonthlyCost,
    projectedSavings: rawSavings,
    savingsConfidence,
    qualityRisk,
    rationale,
  }
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

/**
 * Aggregate a set of routing decisions into a portfolio-level cost summary.
 *
 * High-confidence decisions are those with savingsConfidence >= 0.75 AND
 * qualityRisk of NONE or LOW.
 */
export function aggregateRoutingDecisions(decisions: RoutingDecision[]): RoutingAggregation {
  const totalCurrentCost = decisions.reduce((sum, d) => sum + d.currentMonthlyCost, 0)
  const totalProjectedCost = decisions.reduce((sum, d) => sum + d.projectedMonthlyCost, 0)
  const totalSavings = Math.max(0, totalCurrentCost - totalProjectedCost)
  const totalSavingsPct = totalCurrentCost > 0
    ? (totalSavings / totalCurrentCost) * 100
    : 0

  const highConfidenceDecisions = decisions.filter(
    (d) =>
      d.savingsConfidence >= 0.75 &&
      (d.qualityRisk === 'NONE' || d.qualityRisk === 'LOW') &&
      d.projectedSavings > 0,
  )

  return {
    totalCurrentCost,
    totalProjectedCost,
    totalSavings,
    totalSavingsPct,
    highConfidenceDecisions,
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Estimate the quality risk when downgrading from one model to another for a
 * given complexity band.
 *
 * Risk levels:
 *  - NONE   – candidate is well-suited; bands fully overlap
 *  - LOW    – candidate handles the band but has lower capability scores
 *  - MEDIUM – candidate is at the edge of its suitable bands
 *  - HIGH   – candidate does not explicitly support the band
 */
function _assessQualityRisk(
  fromModelId: string,
  toModelId: string,
  complexity: ModelComplexityBand,
): RoutingDecision['qualityRisk'] {
  const toRecord = AI_MODEL_CAPABILITY_MATRIX.find((r) => r.modelId === toModelId)
  if (!toRecord) return 'HIGH'

  const fromRecord = AI_MODEL_CAPABILITY_MATRIX.find((r) => r.modelId === fromModelId)

  if (!toRecord.suitableComplexityBands.includes(complexity)) return 'HIGH'

  // Determine if the target band is at the top of the candidate's range
  const bandOrder: ModelComplexityBand[] = ['TRIVIAL', 'SIMPLE', 'MODERATE', 'COMPLEX', 'EXPERT']
  const maxSuitableIdx = Math.max(
    ...toRecord.suitableComplexityBands.map((b) => bandOrder.indexOf(b)),
  )
  const complexityIdx = bandOrder.indexOf(complexity)

  if (complexityIdx === maxSuitableIdx) {
    // At the edge — compare overall capability scores
    if (fromRecord) {
      const fromAvg = _avgCapabilityScore(fromRecord.capabilities)
      const toAvg = _avgCapabilityScore(toRecord.capabilities)
      return fromAvg - toAvg > 1.5 ? 'MEDIUM' : 'LOW'
    }
    return 'MEDIUM'
  }

  // Well within range — compare capability scores
  if (fromRecord) {
    const fromAvg = _avgCapabilityScore(fromRecord.capabilities)
    const toAvg = _avgCapabilityScore(toRecord.capabilities)
    if (fromAvg - toAvg > 2) return 'LOW'
  }

  return 'NONE'
}

function _avgCapabilityScore(
  caps: AIModelCapabilityRecord['capabilities'],
): number {
  const values = Object.values(caps) as number[]
  return values.reduce((a, b) => a + b, 0) / values.length
}

// Inline type import to avoid circular dependency issues at runtime
type AIModelCapabilityRecord = import('./ai-model-capability-matrix').AIModelCapabilityRecord
