/**
 * AI Model Capability Matrix
 *
 * Defines what each model can and cannot do well, supporting intelligent
 * routing and downgrade decisions across the AI governance layer.
 */

import {
  AI_TOKEN_PRICING_CATALOG,
  computeTokenCost,
  getModelPricing,
} from './ai-token-pricing-catalog'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ModelComplexityBand =
  | 'TRIVIAL'
  | 'SIMPLE'
  | 'MODERATE'
  | 'COMPLEX'
  | 'EXPERT'

export type ModelCapabilityScore = 0 | 1 | 2 | 3 | 4 | 5

export type AIModelCapabilityRecord = {
  vendor: string
  modelId: string
  suitableComplexityBands: ModelComplexityBand[]
  capabilities: {
    reasoning: ModelCapabilityScore
    coding: ModelCapabilityScore
    multimodal: ModelCapabilityScore
    toolUse: ModelCapabilityScore
    longContext: ModelCapabilityScore
    instruction: ModelCapabilityScore
  }
  maxBatchSize: number
  avgLatencyMs: number
  contextWindowTokens: number
  isReasoningModel: boolean
  /** Model IDs that are cheaper alternatives for lower-complexity tasks. */
  canBeDowngradedTo: string[]
}

// ---------------------------------------------------------------------------
// Matrix data
// ---------------------------------------------------------------------------

export const AI_MODEL_CAPABILITY_MATRIX: AIModelCapabilityRecord[] = [
  // ---- OpenAI ----------------------------------------------------------------
  {
    vendor: 'openai',
    modelId: 'gpt-4o',
    suitableComplexityBands: ['SIMPLE', 'MODERATE', 'COMPLEX', 'EXPERT'],
    capabilities: {
      reasoning: 4,
      coding: 5,
      multimodal: 5,
      toolUse: 5,
      longContext: 4,
      instruction: 5,
    },
    maxBatchSize: 100,
    avgLatencyMs: 2_200,
    contextWindowTokens: 128_000,
    isReasoningModel: false,
    canBeDowngradedTo: ['gpt-4o-mini', 'claude-haiku-4-5', 'gemini-1.5-flash'],
  },
  {
    vendor: 'openai',
    modelId: 'gpt-4o-mini',
    suitableComplexityBands: ['TRIVIAL', 'SIMPLE', 'MODERATE'],
    capabilities: {
      reasoning: 2,
      coding: 3,
      multimodal: 4,
      toolUse: 4,
      longContext: 3,
      instruction: 4,
    },
    maxBatchSize: 500,
    avgLatencyMs: 800,
    contextWindowTokens: 128_000,
    isReasoningModel: false,
    canBeDowngradedTo: ['gemini-1.5-flash', 'mistral-small'],
  },
  {
    vendor: 'openai',
    modelId: 'o1',
    suitableComplexityBands: ['COMPLEX', 'EXPERT'],
    capabilities: {
      reasoning: 5,
      coding: 5,
      multimodal: 2,
      toolUse: 3,
      longContext: 4,
      instruction: 4,
    },
    maxBatchSize: 20,
    avgLatencyMs: 12_000,
    contextWindowTokens: 200_000,
    isReasoningModel: true,
    canBeDowngradedTo: ['o3-mini', 'gpt-4o'],
  },
  {
    vendor: 'openai',
    modelId: 'o3',
    suitableComplexityBands: ['COMPLEX', 'EXPERT'],
    capabilities: {
      reasoning: 5,
      coding: 5,
      multimodal: 3,
      toolUse: 4,
      longContext: 4,
      instruction: 5,
    },
    maxBatchSize: 20,
    avgLatencyMs: 10_000,
    contextWindowTokens: 200_000,
    isReasoningModel: true,
    canBeDowngradedTo: ['o3-mini', 'gpt-4o'],
  },
  {
    vendor: 'openai',
    modelId: 'o3-mini',
    suitableComplexityBands: ['MODERATE', 'COMPLEX'],
    capabilities: {
      reasoning: 4,
      coding: 4,
      multimodal: 1,
      toolUse: 3,
      longContext: 3,
      instruction: 4,
    },
    maxBatchSize: 50,
    avgLatencyMs: 4_500,
    contextWindowTokens: 200_000,
    isReasoningModel: true,
    canBeDowngradedTo: ['gpt-4o', 'claude-sonnet-4-6'],
  },

  // ---- Anthropic -------------------------------------------------------------
  {
    vendor: 'anthropic',
    modelId: 'claude-opus-4-7',
    suitableComplexityBands: ['MODERATE', 'COMPLEX', 'EXPERT'],
    capabilities: {
      reasoning: 5,
      coding: 5,
      multimodal: 4,
      toolUse: 5,
      longContext: 5,
      instruction: 5,
    },
    maxBatchSize: 50,
    avgLatencyMs: 3_500,
    contextWindowTokens: 200_000,
    isReasoningModel: false,
    canBeDowngradedTo: ['claude-sonnet-4-6', 'claude-haiku-4-5'],
  },
  {
    vendor: 'anthropic',
    modelId: 'claude-sonnet-4-6',
    suitableComplexityBands: ['SIMPLE', 'MODERATE', 'COMPLEX'],
    capabilities: {
      reasoning: 4,
      coding: 4,
      multimodal: 3,
      toolUse: 5,
      longContext: 5,
      instruction: 5,
    },
    maxBatchSize: 200,
    avgLatencyMs: 1_800,
    contextWindowTokens: 200_000,
    isReasoningModel: false,
    canBeDowngradedTo: ['claude-haiku-4-5', 'gpt-4o-mini'],
  },
  {
    vendor: 'anthropic',
    modelId: 'claude-haiku-4-5',
    suitableComplexityBands: ['TRIVIAL', 'SIMPLE', 'MODERATE'],
    capabilities: {
      reasoning: 2,
      coding: 3,
      multimodal: 2,
      toolUse: 4,
      longContext: 4,
      instruction: 4,
    },
    maxBatchSize: 1_000,
    avgLatencyMs: 500,
    contextWindowTokens: 200_000,
    isReasoningModel: false,
    canBeDowngradedTo: ['gemini-1.5-flash', 'mistral-small'],
  },

  // ---- Google ----------------------------------------------------------------
  {
    vendor: 'google',
    modelId: 'gemini-1.5-pro',
    suitableComplexityBands: ['SIMPLE', 'MODERATE', 'COMPLEX', 'EXPERT'],
    capabilities: {
      reasoning: 4,
      coding: 4,
      multimodal: 5,
      toolUse: 4,
      longContext: 5,
      instruction: 4,
    },
    maxBatchSize: 100,
    avgLatencyMs: 2_000,
    contextWindowTokens: 2_000_000,
    isReasoningModel: false,
    canBeDowngradedTo: ['gemini-1.5-flash', 'gpt-4o-mini'],
  },
  {
    vendor: 'google',
    modelId: 'gemini-1.5-flash',
    suitableComplexityBands: ['TRIVIAL', 'SIMPLE', 'MODERATE'],
    capabilities: {
      reasoning: 2,
      coding: 3,
      multimodal: 4,
      toolUse: 3,
      longContext: 5,
      instruction: 3,
    },
    maxBatchSize: 1_000,
    avgLatencyMs: 400,
    contextWindowTokens: 1_000_000,
    isReasoningModel: false,
    canBeDowngradedTo: ['mistral-small', 'llama-3-8b'],
  },

  // ---- Meta (self-hosted) ----------------------------------------------------
  {
    vendor: 'meta',
    modelId: 'llama-3-70b',
    suitableComplexityBands: ['SIMPLE', 'MODERATE', 'COMPLEX'],
    capabilities: {
      reasoning: 3,
      coding: 4,
      multimodal: 0,
      toolUse: 3,
      longContext: 3,
      instruction: 4,
    },
    maxBatchSize: 200,
    avgLatencyMs: 1_500,
    contextWindowTokens: 128_000,
    isReasoningModel: false,
    canBeDowngradedTo: ['llama-3-8b'],
  },
  {
    vendor: 'meta',
    modelId: 'llama-3-8b',
    suitableComplexityBands: ['TRIVIAL', 'SIMPLE'],
    capabilities: {
      reasoning: 1,
      coding: 2,
      multimodal: 0,
      toolUse: 2,
      longContext: 2,
      instruction: 3,
    },
    maxBatchSize: 1_000,
    avgLatencyMs: 300,
    contextWindowTokens: 128_000,
    isReasoningModel: false,
    canBeDowngradedTo: [],
  },

  // ---- Mistral ---------------------------------------------------------------
  {
    vendor: 'mistral',
    modelId: 'mistral-large',
    suitableComplexityBands: ['SIMPLE', 'MODERATE', 'COMPLEX'],
    capabilities: {
      reasoning: 3,
      coding: 4,
      multimodal: 0,
      toolUse: 4,
      longContext: 3,
      instruction: 4,
    },
    maxBatchSize: 100,
    avgLatencyMs: 1_200,
    contextWindowTokens: 128_000,
    isReasoningModel: false,
    canBeDowngradedTo: ['mistral-small', 'codestral'],
  },
  {
    vendor: 'mistral',
    modelId: 'mistral-small',
    suitableComplexityBands: ['TRIVIAL', 'SIMPLE'],
    capabilities: {
      reasoning: 1,
      coding: 2,
      multimodal: 0,
      toolUse: 2,
      longContext: 2,
      instruction: 3,
    },
    maxBatchSize: 1_000,
    avgLatencyMs: 350,
    contextWindowTokens: 32_000,
    isReasoningModel: false,
    canBeDowngradedTo: [],
  },
  {
    vendor: 'mistral',
    modelId: 'codestral',
    suitableComplexityBands: ['SIMPLE', 'MODERATE', 'COMPLEX'],
    capabilities: {
      reasoning: 2,
      coding: 5,
      multimodal: 0,
      toolUse: 3,
      longContext: 2,
      instruction: 3,
    },
    maxBatchSize: 200,
    avgLatencyMs: 900,
    contextWindowTokens: 32_000,
    isReasoningModel: false,
    canBeDowngradedTo: ['mistral-small'],
  },
]

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/**
 * Retrieve the capability record for a given vendor + modelId.
 */
export function getModelCapabilities(
  vendor: string,
  modelId: string,
): AIModelCapabilityRecord | undefined {
  return AI_MODEL_CAPABILITY_MATRIX.find(
    (r) => r.vendor === vendor && r.modelId === modelId,
  )
}

/**
 * Returns true when the model explicitly lists the complexity band as suitable.
 */
export function isModelSuitableForComplexity(
  modelId: string,
  complexity: ModelComplexityBand,
): boolean {
  const record = AI_MODEL_CAPABILITY_MATRIX.find((r) => r.modelId === modelId)
  if (!record) return false
  return record.suitableComplexityBands.includes(complexity)
}

// ---------------------------------------------------------------------------
// Downgrade helpers
// ---------------------------------------------------------------------------

/**
 * Suggest a cheaper model that is still capable enough for the given task
 * complexity band.
 *
 * The function walks the `canBeDowngradedTo` list of the current model and
 * returns the first entry that is listed as suitable for `taskComplexity`.
 * If none qualify it returns `undefined`.
 *
 * @param currentModelId   The model currently being used.
 * @param taskComplexity   The complexity of the task to be handled.
 */
export function suggestDowngrade(
  currentModelId: string,
  taskComplexity: ModelComplexityBand,
): AIModelCapabilityRecord | undefined {
  const current = AI_MODEL_CAPABILITY_MATRIX.find(
    (r) => r.modelId === currentModelId,
  )
  if (!current) return undefined

  for (const candidateId of current.canBeDowngradedTo) {
    const candidate = AI_MODEL_CAPABILITY_MATRIX.find(
      (r) => r.modelId === candidateId,
    )
    if (candidate && candidate.suitableComplexityBands.includes(taskComplexity)) {
      return candidate
    }
  }
  return undefined
}

/**
 * Compute the expected monthly cost savings when switching from one model to
 * another given a projected monthly token volume.
 *
 * @param fromModelId    Current model.
 * @param toModelId      Target (cheaper) model.
 * @param monthlyTokens  Estimated monthly token usage split by direction.
 */
export function computeDowngradeSavings(
  fromModelId: string,
  toModelId: string,
  monthlyTokens: { input: number; output: number },
): number {
  // Resolve pricing records; fall back to the first catalog entry matching the
  // model id regardless of vendor if a vendor-scoped lookup is not available.
  const fromPricing =
    AI_TOKEN_PRICING_CATALOG.find((r) => r.modelId === fromModelId)
  const toPricing =
    AI_TOKEN_PRICING_CATALOG.find((r) => r.modelId === toModelId)

  if (!fromPricing || !toPricing) return 0

  const fromCost = computeTokenCost(
    fromPricing,
    monthlyTokens.input,
    monthlyTokens.output,
  )
  const toCost = computeTokenCost(
    toPricing,
    monthlyTokens.input,
    monthlyTokens.output,
  )

  return Math.max(0, fromCost - toCost)
}
