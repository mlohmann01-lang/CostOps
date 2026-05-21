/**
 * AI Token Pricing Catalog
 *
 * Comprehensive pricing records for major AI model vendors and models.
 * Prices are illustrative and close to actual market rates (USD per million tokens).
 * Update periodically as vendors revise pricing.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AIModelVendor = 'openai' | 'anthropic' | 'google' | 'meta' | 'mistral'

export type AIModelTier = 'ECONOMY' | 'STANDARD' | 'PREMIUM' | 'REASONING'

export type AIModelPricingRecord = {
  vendor: AIModelVendor
  modelId: string
  modelFamily: string
  tier: AIModelTier
  inputPricePerMToken: number
  outputPricePerMToken: number
  cachedInputPricePerMToken: number
  contextWindowTokens: number
  reasoningMultiplier?: number
  embeddingPricePerMToken?: number
  currency: 'USD'
}

// ---------------------------------------------------------------------------
// Catalog data
// ---------------------------------------------------------------------------

export const AI_TOKEN_PRICING_CATALOG: AIModelPricingRecord[] = [
  // ---- OpenAI ----------------------------------------------------------------
  {
    vendor: 'openai',
    modelId: 'gpt-4o',
    modelFamily: 'gpt-4',
    tier: 'PREMIUM',
    inputPricePerMToken: 5.0,
    outputPricePerMToken: 15.0,
    cachedInputPricePerMToken: 2.5,
    contextWindowTokens: 128_000,
    currency: 'USD',
  },
  {
    vendor: 'openai',
    modelId: 'gpt-4o-mini',
    modelFamily: 'gpt-4',
    tier: 'ECONOMY',
    inputPricePerMToken: 0.15,
    outputPricePerMToken: 0.60,
    cachedInputPricePerMToken: 0.075,
    contextWindowTokens: 128_000,
    currency: 'USD',
  },
  {
    vendor: 'openai',
    modelId: 'o1',
    modelFamily: 'o1',
    tier: 'REASONING',
    inputPricePerMToken: 15.0,
    outputPricePerMToken: 60.0,
    cachedInputPricePerMToken: 7.5,
    contextWindowTokens: 200_000,
    reasoningMultiplier: 4.0,
    currency: 'USD',
  },
  {
    vendor: 'openai',
    modelId: 'o3',
    modelFamily: 'o3',
    tier: 'REASONING',
    inputPricePerMToken: 10.0,
    outputPricePerMToken: 40.0,
    cachedInputPricePerMToken: 2.5,
    contextWindowTokens: 200_000,
    reasoningMultiplier: 3.5,
    currency: 'USD',
  },
  {
    vendor: 'openai',
    modelId: 'o3-mini',
    modelFamily: 'o3',
    tier: 'STANDARD',
    inputPricePerMToken: 1.10,
    outputPricePerMToken: 4.40,
    cachedInputPricePerMToken: 0.55,
    contextWindowTokens: 200_000,
    reasoningMultiplier: 2.0,
    currency: 'USD',
  },

  // ---- Anthropic -------------------------------------------------------------
  {
    vendor: 'anthropic',
    modelId: 'claude-opus-4-7',
    modelFamily: 'claude-opus',
    tier: 'PREMIUM',
    inputPricePerMToken: 15.0,
    outputPricePerMToken: 75.0,
    cachedInputPricePerMToken: 1.875,
    contextWindowTokens: 200_000,
    currency: 'USD',
  },
  {
    vendor: 'anthropic',
    modelId: 'claude-sonnet-4-6',
    modelFamily: 'claude-sonnet',
    tier: 'STANDARD',
    inputPricePerMToken: 3.0,
    outputPricePerMToken: 15.0,
    cachedInputPricePerMToken: 0.30,
    contextWindowTokens: 200_000,
    currency: 'USD',
  },
  {
    vendor: 'anthropic',
    modelId: 'claude-haiku-4-5',
    modelFamily: 'claude-haiku',
    tier: 'ECONOMY',
    inputPricePerMToken: 0.80,
    outputPricePerMToken: 4.0,
    cachedInputPricePerMToken: 0.08,
    contextWindowTokens: 200_000,
    currency: 'USD',
  },

  // ---- Google ----------------------------------------------------------------
  {
    vendor: 'google',
    modelId: 'gemini-1.5-pro',
    modelFamily: 'gemini-1.5',
    tier: 'PREMIUM',
    inputPricePerMToken: 3.50,
    outputPricePerMToken: 10.50,
    cachedInputPricePerMToken: 0.875,
    contextWindowTokens: 2_000_000,
    currency: 'USD',
  },
  {
    vendor: 'google',
    modelId: 'gemini-1.5-flash',
    modelFamily: 'gemini-1.5',
    tier: 'ECONOMY',
    inputPricePerMToken: 0.075,
    outputPricePerMToken: 0.30,
    cachedInputPricePerMToken: 0.01875,
    contextWindowTokens: 1_000_000,
    currency: 'USD',
  },

  // ---- Meta (self-hosted cost estimate) --------------------------------------
  {
    vendor: 'meta',
    modelId: 'llama-3-70b',
    modelFamily: 'llama-3',
    tier: 'STANDARD',
    inputPricePerMToken: 0.90,
    outputPricePerMToken: 0.90,
    cachedInputPricePerMToken: 0.45,
    contextWindowTokens: 128_000,
    currency: 'USD',
  },
  {
    vendor: 'meta',
    modelId: 'llama-3-8b',
    modelFamily: 'llama-3',
    tier: 'ECONOMY',
    inputPricePerMToken: 0.20,
    outputPricePerMToken: 0.20,
    cachedInputPricePerMToken: 0.10,
    contextWindowTokens: 128_000,
    currency: 'USD',
  },

  // ---- Mistral ---------------------------------------------------------------
  {
    vendor: 'mistral',
    modelId: 'mistral-large',
    modelFamily: 'mistral-large',
    tier: 'STANDARD',
    inputPricePerMToken: 4.0,
    outputPricePerMToken: 12.0,
    cachedInputPricePerMToken: 2.0,
    contextWindowTokens: 128_000,
    currency: 'USD',
  },
  {
    vendor: 'mistral',
    modelId: 'mistral-small',
    modelFamily: 'mistral-small',
    tier: 'ECONOMY',
    inputPricePerMToken: 0.10,
    outputPricePerMToken: 0.30,
    cachedInputPricePerMToken: 0.05,
    contextWindowTokens: 32_000,
    currency: 'USD',
  },
  {
    vendor: 'mistral',
    modelId: 'codestral',
    modelFamily: 'codestral',
    tier: 'STANDARD',
    inputPricePerMToken: 1.0,
    outputPricePerMToken: 3.0,
    cachedInputPricePerMToken: 0.50,
    contextWindowTokens: 32_000,
    currency: 'USD',
  },
]

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/**
 * Retrieve a single pricing record by vendor + modelId.
 */
export function getModelPricing(
  vendor: string,
  modelId: string,
): AIModelPricingRecord | undefined {
  return AI_TOKEN_PRICING_CATALOG.find(
    (r) => r.vendor === vendor && r.modelId === modelId,
  )
}

/**
 * List all models belonging to a specific pricing tier.
 */
export function listModelsByTier(tier: AIModelTier): AIModelPricingRecord[] {
  return AI_TOKEN_PRICING_CATALOG.filter((r) => r.tier === tier)
}

// ---------------------------------------------------------------------------
// Cost computation
// ---------------------------------------------------------------------------

/**
 * Compute the USD cost for a single inference call.
 *
 * @param record         Pricing record for the target model.
 * @param inputTokens    Non-cached input tokens consumed.
 * @param outputTokens   Output tokens generated.
 * @param cachedTokens   Cached input tokens (prompt cache hit) — default 0.
 */
export function computeTokenCost(
  record: AIModelPricingRecord,
  inputTokens: number,
  outputTokens: number,
  cachedTokens: number = 0,
): number {
  const inputCost = (inputTokens / 1_000_000) * record.inputPricePerMToken
  const outputCost = (outputTokens / 1_000_000) * record.outputPricePerMToken
  const cachedCost = (cachedTokens / 1_000_000) * record.cachedInputPricePerMToken
  return inputCost + outputCost + cachedCost
}

/**
 * Project a monthly cost from an observed daily cost figure.
 * Uses a 30.44-day average month.
 */
export function computeMonthlyCostProjection(dailyCost: number): number {
  const DAYS_PER_MONTH = 30.44
  return dailyCost * DAYS_PER_MONTH
}

// ---------------------------------------------------------------------------
// Optimisation helpers
// ---------------------------------------------------------------------------

/**
 * Find a cheaper model that satisfies the required tier floor.
 *
 * The function looks for the lowest-cost model (by blended input+output price)
 * whose tier is AT MOST the specified required tier.  Tier ordering:
 *   ECONOMY < STANDARD < PREMIUM < REASONING
 *
 * @param currentModel   modelId of the model currently in use.
 * @param requiredTier   Minimum acceptable capability tier.
 */
export function findCheaperAlternative(
  currentModel: string,
  requiredTier: 'ECONOMY' | 'STANDARD',
): AIModelPricingRecord | undefined {
  const current = AI_TOKEN_PRICING_CATALOG.find((r) => r.modelId === currentModel)
  if (!current) return undefined

  const tierRank: Record<AIModelTier, number> = {
    ECONOMY: 0,
    STANDARD: 1,
    PREMIUM: 2,
    REASONING: 3,
  }

  const requiredRank = tierRank[requiredTier]
  const currentBlended =
    current.inputPricePerMToken + current.outputPricePerMToken

  const candidates = AI_TOKEN_PRICING_CATALOG.filter((r) => {
    if (r.modelId === currentModel) return false
    if (tierRank[r.tier] > requiredRank) return false
    const blended = r.inputPricePerMToken + r.outputPricePerMToken
    return blended < currentBlended
  })

  if (candidates.length === 0) return undefined

  // Return the cheapest candidate (lowest blended price)
  return candidates.reduce((best, r) => {
    const bBlended = best.inputPricePerMToken + best.outputPricePerMToken
    const rBlended = r.inputPricePerMToken + r.outputPricePerMToken
    return rBlended < bBlended ? r : best
  })
}
