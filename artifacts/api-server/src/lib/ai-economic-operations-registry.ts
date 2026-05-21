/**
 * AI Economic Operations Domain Registry
 *
 * Defines the top-level AI governance domain alongside M365, SaaS, Cloud, etc.
 * Each entry describes an AI economic operations subdomain that maps to one or
 * more Economic Operations Pack definitions.
 */

export const AI_GOVERNANCE_DOMAINS = [
  'TOKEN_GOVERNANCE',
  'MODEL_ROUTING',
  'AI_VENDOR_GOVERNANCE',
  'AGENT_RUNTIME_GOVERNANCE',
  'CONTEXT_GOVERNANCE',
  'AI_ROI_GOVERNANCE',
  'AI_DRIFT_GOVERNANCE',
  'AI_OVERLAP_ELIMINATION',
] as const

export type AIGovernanceDomain = (typeof AI_GOVERNANCE_DOMAINS)[number]

export interface AIGovernanceDomainRecord {
  readonly domain: AIGovernanceDomain
  readonly displayName: string
  readonly description: string
  readonly packIds: readonly string[]
  /** Problems this domain addresses. */
  readonly problemSpace: readonly string[]
  /** Actions/remediations this domain enables. */
  readonly remediationSpace: readonly string[]
  readonly strategicPriority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
}

export const AI_ECONOMIC_OPERATIONS_REGISTRY: Record<AIGovernanceDomain, AIGovernanceDomainRecord> = {
  TOKEN_GOVERNANCE: {
    domain: 'TOKEN_GOVERNANCE',
    displayName: 'Token Governance',
    description: 'Detect and remediate runaway token economics across AI inference workloads.',
    packIds: ['ai-token-governance'],
    problemSpace: [
      'Runaway token burn from oversized prompts',
      'Excessive context windows inflating inference cost',
      'Recursive agent loops consuming unbounded tokens',
      'Unnecessary retries multiplying token spend',
      'Reasoning model overuse for trivial tasks',
      'Long-lived context inefficiency in multi-turn workflows',
    ],
    remediationSpace: [
      'Model downgrade to cheaper tier',
      'Prompt compression enforcement',
      'Cache enforcement to eliminate redundant inference',
      'Retry limits to bound failure-mode spend',
      'Context truncation policies',
      'Budget enforcement per workflow',
    ],
    strategicPriority: 'CRITICAL',
  },

  MODEL_ROUTING: {
    domain: 'MODEL_ROUTING',
    displayName: 'Model Routing Optimization',
    description: 'Govern model selection economics — route tasks to the most cost-effective capable model.',
    packIds: ['ai-model-routing'],
    problemSpace: [
      'Premium models (GPT-4o, Opus) used for trivial tasks',
      'No task-complexity classification driving routing',
      'Reasoning models invoked for simple instruction-following',
      'Expensive inference defaults applied organization-wide',
      'No routing policy enforcement at workflow boundary',
    ],
    remediationSpace: [
      'Task classification to infer required model tier',
      'Downgrade routing for low-complexity tasks',
      'Cache-first routing before inference',
      'Reasoning model gating (only when required)',
      'Execution budget controls per workflow class',
    ],
    strategicPriority: 'HIGH',
  },

  AI_VENDOR_GOVERNANCE: {
    domain: 'AI_VENDOR_GOVERNANCE',
    displayName: 'AI Vendor Governance',
    description: 'Govern AI SaaS subscriptions, detect idle seats, and eliminate redundant vendor spend.',
    packIds: ['ai-vendor-seat-reclaim'],
    problemSpace: [
      'Unused AI platform seats accruing monthly cost',
      'Multiple overlapping AI vendor subscriptions',
      'Shadow AI procurement outside central governance',
      'Inactive developer tool seats (Cursor, Windsurf, Copilot)',
      'Duplicate general-purpose LLM vendor contracts',
    ],
    remediationSpace: [
      'Idle seat reclaim',
      'Vendor consolidation recommendations',
      'Plan downgrade for low-utilization users',
      'Seat reassignment to new hires',
      'Subscription standardization policy',
    ],
    strategicPriority: 'HIGH',
  },

  AGENT_RUNTIME_GOVERNANCE: {
    domain: 'AGENT_RUNTIME_GOVERNANCE',
    displayName: 'Agent Runtime Governance',
    description: 'Detect orphaned, idle, and duplicated AI agents and MCP server infrastructure.',
    packIds: ['ai-agent-runtime-governance'],
    problemSpace: [
      'Orphaned agents with no execution activity',
      'Idle MCP servers consuming compute allocation',
      'Duplicated agent workflows performing redundant functions',
      'Uncontrolled automation proliferation',
      'Recursive workflow loops consuming unbounded resources',
      'No lifecycle governance on deployed agents',
    ],
    remediationSpace: [
      'Agent disable and archive',
      'MCP server retirement',
      'Workflow consolidation',
      'Loop guard policy enforcement',
      'Tool invocation limits',
      'Agent lifecycle audit trail',
    ],
    strategicPriority: 'HIGH',
  },

  CONTEXT_GOVERNANCE: {
    domain: 'CONTEXT_GOVERNANCE',
    displayName: 'Context & Retrieval Governance',
    description: 'Govern vector database, retrieval, and context window economics.',
    packIds: ['ai-context-governance'],
    problemSpace: [
      'Oversized retrieval windows inflating context costs',
      'Duplicated vector embeddings in multiple collections',
      'Stale or unused memory stores',
      'Excessive conversation history carried through multi-turn chains',
      'Vector database bloat from abandoned workloads',
      'Context inefficiency from poor chunking strategies',
    ],
    remediationSpace: [
      'Memory archive and pruning',
      'Vector collection consolidation',
      'Retrieval breadth limits',
      'Context compression for long workflows',
      'Embedding deduplication',
      'Cache enforcement for repeated retrievals',
    ],
    strategicPriority: 'MEDIUM',
  },

  AI_ROI_GOVERNANCE: {
    domain: 'AI_ROI_GOVERNANCE',
    displayName: 'AI ROI Governance',
    description: 'Track actual AI economic outcomes against spend — verify realized savings and attribute productivity gains.',
    packIds: ['ai-roi-governance'],
    problemSpace: [
      'AI spend not linked to measurable business outcomes',
      'Realized savings unverified against actual token reduction',
      'Productivity gains from AI tooling unattributed',
      'No cost-per-outcome tracking',
      'AI ROI claims not backed by execution evidence',
    ],
    remediationSpace: [
      'Cost-per-outcome computation',
      'Verified savings ledger (execution-backed)',
      'Productivity signal attribution',
      'Business outcome linkage',
      'ROI confidence scoring with proof graph',
    ],
    strategicPriority: 'CRITICAL',
  },

  AI_DRIFT_GOVERNANCE: {
    domain: 'AI_DRIFT_GOVERNANCE',
    displayName: 'AI Economic Drift Detection',
    description: 'Detect economic degradation in AI operations over time — token spikes, routing drift, unauthorized model adoption.',
    packIds: ['ai-drift-governance'],
    problemSpace: [
      'Token consumption re-expanding after optimization',
      'Model routing reverting to expensive defaults',
      'Unauthorized premium models introduced',
      'Inference cost exploding from workflow expansion',
      'Prompt inflation creeping back post-compression',
      'Hidden automation growth outside governance',
    ],
    remediationSpace: [
      'Policy re-enforcement',
      'Routing lock',
      'Budget guard activation',
      'Operator review trigger',
      'Execution limit enforcement',
      'Drift severity classification and escalation',
    ],
    strategicPriority: 'HIGH',
  },

  AI_OVERLAP_ELIMINATION: {
    domain: 'AI_OVERLAP_ELIMINATION',
    displayName: 'AI Vendor Overlap Elimination',
    description: 'Detect and eliminate overlapping AI tooling that creates duplicated cost without incremental value.',
    packIds: ['ai-overlap-elimination'],
    problemSpace: [
      'Claude + ChatGPT + Gemini all active in same organization',
      'Multiple coding assistants with overlapping capability (Cursor + Windsurf + Copilot)',
      'Duplicated agent platforms running parallel infrastructure',
      'Redundant AI SaaS without differentiation rationale',
      'MCP infrastructure duplication',
      'No consolidation policy for AI vendor proliferation',
    ],
    remediationSpace: [
      'Vendor consolidation recommendation',
      'Redundant tool retirement',
      'Model standardization policy',
      'Platform retirement for unused tools',
      'Capability overlap analysis with consolidation roadmap',
    ],
    strategicPriority: 'HIGH',
  },
}

/** Returns all domains in priority order (CRITICAL first) */
export function listDomainsByPriority(): AIGovernanceDomainRecord[] {
  const order: Record<AIGovernanceDomainRecord['strategicPriority'], number> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  }
  return Object.values(AI_ECONOMIC_OPERATIONS_REGISTRY).sort(
    (a, b) => order[a.strategicPriority] - order[b.strategicPriority],
  )
}

/** Returns all pack IDs registered across all AI governance domains */
export function listAllAIPackIds(): string[] {
  return Object.values(AI_ECONOMIC_OPERATIONS_REGISTRY).flatMap((d) => [...d.packIds])
}
