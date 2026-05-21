/**
 * AI Context Cost Model
 *
 * Models the economics of context window usage, retrieval-augmented generation
 * (RAG), and memory patterns.  Provides optimization recommendations and
 * cost projections used by the AI governance layer.
 */

import { getModelPricing, computeTokenCost, computeMonthlyCostProjection } from './ai-token-pricing-catalog'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ContextUsagePattern = {
  /** Average total context tokens per request (system + user + retrieval + memory). */
  averageContextTokens: number
  /** Observed peak context tokens (used for capacity planning). */
  peakContextTokens: number
  /** Fixed system-prompt tokens that repeat on every call. */
  systemPromptTokens: number
  /** Average tokens per retrieval chunk. */
  retrievalChunkTokens: number
  /** Number of retrieval chunks injected per request. */
  retrievalChunkCount: number
  /** Number of prior conversation turns included as context. */
  conversationTurnCount: number
  /** Tokens consumed by in-context memory / episodic summaries. */
  memoryTokens: number
  /** Observed total cost per request (USD). */
  totalCostPerRequest: number
}

export type ContextOptimizationOpportunity = {
  type:
    | 'PROMPT_COMPRESSION'
    | 'RETRIEVAL_REDUCTION'
    | 'MEMORY_PRUNING'
    | 'CONTEXT_TRUNCATION'
    | 'CACHE_ENFORCEMENT'
  currentTokens: number
  targetTokens: number
  estimatedSavingsPct: number
  estimatedMonthlySavings: number
  qualityRisk: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'
  rationale: string
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

/** Minimum prompt-cache hit rate assumed when caching can be applied. */
const CACHE_HIT_RATE = 0.70

/**
 * Fraction of the system prompt that can typically be eliminated through
 * aggressive compression without material quality loss.
 */
const PROMPT_COMPRESSION_RATIO = 0.30

/**
 * Fraction of retrieval tokens that can be removed by tighter top-k selection
 * or re-ranking while retaining recall quality.
 */
const RETRIEVAL_REDUCTION_RATIO = 0.35

/** Fraction of memory tokens prunable via summarisation / eviction. */
const MEMORY_PRUNING_RATIO = 0.40

/** Fraction of conversation-turn context prunable via sliding-window truncation. */
const CONTEXT_TRUNCATION_RATIO = 0.25

// ---------------------------------------------------------------------------
// Core cost computations
// ---------------------------------------------------------------------------

/**
 * Compute the USD cost for a single request given the model and token split.
 *
 * The context tokens are treated as input tokens.  If a prompt-cache record is
 * available (cachedInputPricePerMToken), 70 % of the system-prompt tokens are
 * assumed to be cached.
 *
 * @param modelId        Target model identifier.
 * @param vendor         Vendor of the target model.
 * @param contextTokens  Total input context tokens for the request.
 * @param outputTokens   Generated output tokens.
 */
export function computeContextCostPerRequest(
  modelId: string,
  vendor: string,
  contextTokens: number,
  outputTokens: number,
): number {
  const pricing = getModelPricing(vendor, modelId)
  if (!pricing) return 0

  // Assume a portion of context tokens can be cache hits
  const cachedTokens = Math.floor(contextTokens * CACHE_HIT_RATE)
  const uncachedTokens = contextTokens - cachedTokens

  return computeTokenCost(pricing, uncachedTokens, outputTokens, cachedTokens)
}

/**
 * Estimate total monthly USD cost for a given usage pattern.
 *
 * @param pattern        Observed context usage pattern.
 * @param modelId        Model being used.
 * @param vendor         Vendor of the model.
 * @param requestsPerDay Average daily call volume.
 */
export function estimateMonthlyContextCost(
  pattern: ContextUsagePattern,
  modelId: string,
  vendor: string,
  requestsPerDay: number,
): number {
  // Derive output token estimate from the per-request cost already observed
  // when a pricing record is available.  Fall back to a 1:4 input:output ratio.
  const pricing = getModelPricing(vendor, modelId)
  let outputTokens: number

  if (pricing && pricing.inputPricePerMToken > 0) {
    // Back-calculate output tokens from observed cost
    const inputCost =
      (pattern.averageContextTokens / 1_000_000) * pricing.inputPricePerMToken
    const remainingCost = Math.max(0, pattern.totalCostPerRequest - inputCost)
    outputTokens =
      pricing.outputPricePerMToken > 0
        ? (remainingCost / pricing.outputPricePerMToken) * 1_000_000
        : Math.floor(pattern.averageContextTokens * 0.25)
  } else {
    outputTokens = Math.floor(pattern.averageContextTokens * 0.25)
  }

  const costPerRequest = computeContextCostPerRequest(
    modelId,
    vendor,
    pattern.averageContextTokens,
    outputTokens,
  )
  const dailyCost = costPerRequest * requestsPerDay
  return computeMonthlyCostProjection(dailyCost)
}

/**
 * Compute the monthly savings achievable by compressing context by
 * `targetCompressionRatio` (0–1, where 0.3 = 30 % token reduction).
 *
 * @param currentPattern        Baseline context usage pattern.
 * @param targetCompressionRatio Fraction of context tokens to eliminate (0–1).
 * @param modelId               Model being used.
 * @param vendor                Vendor of the model.
 * @param requestsPerDay        Average daily call volume.
 */
export function computeCompressionSavings(
  currentPattern: ContextUsagePattern,
  targetCompressionRatio: number,
  modelId: string,
  vendor: string,
  requestsPerDay: number,
): number {
  const ratio = Math.max(0, Math.min(1, targetCompressionRatio))
  const compressedTokens = Math.floor(
    currentPattern.averageContextTokens * (1 - ratio),
  )

  const compressedPattern: ContextUsagePattern = {
    ...currentPattern,
    averageContextTokens: compressedTokens,
  }

  const currentMonthly = estimateMonthlyContextCost(
    currentPattern,
    modelId,
    vendor,
    requestsPerDay,
  )
  const compressedMonthly = estimateMonthlyContextCost(
    compressedPattern,
    modelId,
    vendor,
    requestsPerDay,
  )

  return Math.max(0, currentMonthly - compressedMonthly)
}

// ---------------------------------------------------------------------------
// Optimization opportunity analysis
// ---------------------------------------------------------------------------

/**
 * Analyse a context usage pattern and return a ranked list of optimisation
 * opportunities, each with estimated monthly savings and quality-risk rating.
 *
 * The function evaluates five optimisation levers:
 *   1. PROMPT_COMPRESSION   – reduce verbose system prompts
 *   2. RETRIEVAL_REDUCTION  – tighten top-k / re-ranking
 *   3. MEMORY_PRUNING       – prune stale episodic memory
 *   4. CONTEXT_TRUNCATION   – sliding-window conversation history
 *   5. CACHE_ENFORCEMENT    – ensure prefix-cache hits on static content
 *
 * Results are sorted by estimated monthly savings descending.
 *
 * NOTE: estimatedMonthlySavings returned here uses a cost-per-token
 * approximation (not a full model lookup) so that the function is
 * self-contained.  Callers with access to a specific model should use
 * `computeCompressionSavings` for higher accuracy.
 */
export function analyzeContextUsage(
  pattern: ContextUsagePattern,
): ContextOptimizationOpportunity[] {
  const opportunities: ContextOptimizationOpportunity[] = []

  // Helper: approximate monthly savings for a given token reduction,
  // scaled from the observed per-request cost.
  const costPerToken =
    pattern.averageContextTokens > 0
      ? pattern.totalCostPerRequest / pattern.averageContextTokens
      : 0

  const DAYS_PER_MONTH = 30.44

  function approximateSavings(reducedTokens: number): number {
    // Savings are proportional to the token reduction.
    // We do not know requestsPerDay here, so we return a per-request saving
    // that callers can scale; for the opportunity record we report a
    // single-request saving * 30.44 as an indicative monthly figure assuming
    // 1 call/day (callers should multiply by actual volume).
    return reducedTokens * costPerToken * DAYS_PER_MONTH
  }

  // ---- 1. PROMPT_COMPRESSION ------------------------------------------------
  const compressableSystemPromptTokens = Math.floor(
    pattern.systemPromptTokens * PROMPT_COMPRESSION_RATIO,
  )
  if (compressableSystemPromptTokens > 50) {
    const targetTokens = pattern.systemPromptTokens - compressableSystemPromptTokens
    const savings = approximateSavings(compressableSystemPromptTokens)
    const savingsPct = pattern.averageContextTokens > 0
      ? (compressableSystemPromptTokens / pattern.averageContextTokens) * 100
      : 0

    opportunities.push({
      type: 'PROMPT_COMPRESSION',
      currentTokens: pattern.systemPromptTokens,
      targetTokens,
      estimatedSavingsPct: Number(savingsPct.toFixed(1)),
      estimatedMonthlySavings: Number(savings.toFixed(4)),
      qualityRisk: savingsPct > 20 ? 'LOW' : 'NONE',
      rationale:
        `System prompt is ${pattern.systemPromptTokens.toLocaleString()} tokens. ` +
        `Removing boilerplate, redundant instructions, and verbose examples ` +
        `can reduce it by ~${PROMPT_COMPRESSION_RATIO * 100}% to ` +
        `${targetTokens.toLocaleString()} tokens.`,
    })
  }

  // ---- 2. RETRIEVAL_REDUCTION -----------------------------------------------
  const totalRetrievalTokens = pattern.retrievalChunkTokens * pattern.retrievalChunkCount
  const reducibleRetrievalTokens = Math.floor(totalRetrievalTokens * RETRIEVAL_REDUCTION_RATIO)
  if (reducibleRetrievalTokens > 50 && pattern.retrievalChunkCount > 1) {
    const targetChunkCount = Math.max(
      1,
      Math.floor(pattern.retrievalChunkCount * (1 - RETRIEVAL_REDUCTION_RATIO)),
    )
    const targetTokens = pattern.retrievalChunkTokens * targetChunkCount
    const savings = approximateSavings(reducibleRetrievalTokens)
    const savingsPct = pattern.averageContextTokens > 0
      ? (reducibleRetrievalTokens / pattern.averageContextTokens) * 100
      : 0

    opportunities.push({
      type: 'RETRIEVAL_REDUCTION',
      currentTokens: totalRetrievalTokens,
      targetTokens,
      estimatedSavingsPct: Number(savingsPct.toFixed(1)),
      estimatedMonthlySavings: Number(savings.toFixed(4)),
      qualityRisk: pattern.retrievalChunkCount > 8 ? 'NONE' : 'LOW',
      rationale:
        `${pattern.retrievalChunkCount} retrieval chunks × ` +
        `${pattern.retrievalChunkTokens} tokens = ${totalRetrievalTokens.toLocaleString()} tokens. ` +
        `Tighter top-k selection and cross-encoder re-ranking can reduce to ` +
        `${targetChunkCount} chunks (${targetTokens.toLocaleString()} tokens) ` +
        `without meaningful recall loss.`,
    })
  }

  // ---- 3. MEMORY_PRUNING ----------------------------------------------------
  const pruneableMemoryTokens = Math.floor(pattern.memoryTokens * MEMORY_PRUNING_RATIO)
  if (pruneableMemoryTokens > 50) {
    const targetTokens = pattern.memoryTokens - pruneableMemoryTokens
    const savings = approximateSavings(pruneableMemoryTokens)
    const savingsPct = pattern.averageContextTokens > 0
      ? (pruneableMemoryTokens / pattern.averageContextTokens) * 100
      : 0

    opportunities.push({
      type: 'MEMORY_PRUNING',
      currentTokens: pattern.memoryTokens,
      targetTokens,
      estimatedSavingsPct: Number(savingsPct.toFixed(1)),
      estimatedMonthlySavings: Number(savings.toFixed(4)),
      qualityRisk: 'LOW',
      rationale:
        `In-context memory uses ${pattern.memoryTokens.toLocaleString()} tokens. ` +
        `Summarisation of older episodes and TTL-based eviction of stale entries ` +
        `can reduce this by ~${MEMORY_PRUNING_RATIO * 100}% to ` +
        `${targetTokens.toLocaleString()} tokens.`,
    })
  }

  // ---- 4. CONTEXT_TRUNCATION (conversation history) -------------------------
  const conversationTokensEstimate = pattern.conversationTurnCount * 200  // ~200 tokens/turn avg
  const truncatableTokens = Math.floor(conversationTokensEstimate * CONTEXT_TRUNCATION_RATIO)
  if (truncatableTokens > 50 && pattern.conversationTurnCount > 3) {
    const targetTokens = conversationTokensEstimate - truncatableTokens
    const savings = approximateSavings(truncatableTokens)
    const savingsPct = pattern.averageContextTokens > 0
      ? (truncatableTokens / pattern.averageContextTokens) * 100
      : 0

    opportunities.push({
      type: 'CONTEXT_TRUNCATION',
      currentTokens: conversationTokensEstimate,
      targetTokens,
      estimatedSavingsPct: Number(savingsPct.toFixed(1)),
      estimatedMonthlySavings: Number(savings.toFixed(4)),
      qualityRisk: pattern.conversationTurnCount > 10 ? 'LOW' : 'MEDIUM',
      rationale:
        `${pattern.conversationTurnCount} conversation turns contribute ` +
        `~${conversationTokensEstimate.toLocaleString()} tokens. ` +
        `A sliding window that retains the last ${Math.max(2, pattern.conversationTurnCount - 2)} turns ` +
        `and summarises earlier turns saves ~${CONTEXT_TRUNCATION_RATIO * 100}%.`,
    })
  }

  // ---- 5. CACHE_ENFORCEMENT -------------------------------------------------
  // System prompt is the primary candidate for prompt caching.
  const cacheBenefit = pattern.systemPromptTokens
  if (cacheBenefit > 100 && pattern.totalCostPerRequest > 0) {
    // Estimate: cached tokens cost ~10-25 % of full input price, saving 75-90 %
    const cacheDiscountFraction = 0.75
    const cachedTokenSavingsPerRequest = cacheBenefit * cacheDiscountFraction
    const savings = approximateSavings(cachedTokenSavingsPerRequest)
    const savingsPct = pattern.averageContextTokens > 0
      ? (cachedTokenSavingsPerRequest / pattern.averageContextTokens) * 100
      : 0

    opportunities.push({
      type: 'CACHE_ENFORCEMENT',
      currentTokens: cacheBenefit,
      targetTokens: Math.floor(cacheBenefit * (1 - cacheDiscountFraction)),
      estimatedSavingsPct: Number(savingsPct.toFixed(1)),
      estimatedMonthlySavings: Number(savings.toFixed(4)),
      qualityRisk: 'NONE',
      rationale:
        `${cacheBenefit.toLocaleString()} system-prompt tokens are re-transmitted on ` +
        `every request. Enforcing prompt-prefix caching (e.g. Anthropic cache_control, ` +
        `OpenAI cached inputs) reduces effective cost of these tokens by ~75%.`,
    })
  }

  // Sort by estimated monthly savings descending
  return opportunities.sort(
    (a, b) => b.estimatedMonthlySavings - a.estimatedMonthlySavings,
  )
}
