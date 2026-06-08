import { useEffect, useState } from 'react'
import { liveFetch, normalizeApiError } from '../lib/liveApi'

export const aiIntelligenceApiPaths = ['/api/ai/connectors', '/api/ai/assets', '/api/ai/utilisation', '/api/ai/spend', '/api/ai/governance/findings', '/api/ai/recommendations', '/api/ai/dashboard', '/api/ai/command-dashboard', '/api/ai/executive-proof-pack'] as const

export const demoAIIntelligenceData = {
  assets: [
    { id: 'aiasset-gpt4o', name: 'GPT-4o Customer Support Model', assetType: 'MODEL', vendor: 'OpenAI', ownerId: 'support-platform-owner', department: 'Support', status: 'ACTIVE', approvalStatus: 'APPROVED', lastSeenAt: '2026-06-01T00:00:00Z', governanceFlags: [] },
    { id: 'aiasset-research-agent', name: 'Research Summarisation Agent', assetType: 'AGENT', vendor: 'Anthropic', ownerId: '', department: 'Product', status: 'DISCOVERED', approvalStatus: 'PENDING_REVIEW', lastSeenAt: '2026-05-20T00:00:00Z', governanceFlags: ['UNOWNED_AI_ASSET', 'UNAPPROVED_AI_ASSET'] },
    { id: 'aiasset-sales-workflow', name: 'Sales Proposal Workflow', assetType: 'WORKFLOW', vendor: 'Azure OpenAI', ownerId: 'sales-ops', department: 'Sales', status: 'INACTIVE', approvalStatus: 'APPROVED', lastSeenAt: '2026-03-15T00:00:00Z', governanceFlags: ['INACTIVE_AI_ASSET'] },
  ],
  utilisation: { summary: { totalAIAssets: 3, activeAIAssets: 1, inactiveAIAssets: 1, unusedAIAssets: 1 }, usageByType: [{ key: 'MODEL', value: 12000 }, { key: 'AGENT', value: 120 }], usageByVendor: [{ key: 'OpenAI', value: 12000 }], usageByDepartment: [{ key: 'Support', value: 12000 }], highestUsedAssets: [], dormantAssets: [] },
  spend: { summary: { totalAISpend: 42500 }, spendByVendor: [{ key: 'OpenAI', value: 25000 }, { key: 'Anthropic', value: 7500 }, { key: 'Azure OpenAI', value: 10000 }], spendByModel: [], spendByAgent: [], spendByWorkflow: [], spendByDepartment: [{ key: 'Support', value: 25000 }], spendByCostCentre: [{ key: 'CC-SUPPORT', value: 25000 }], monthlyTrend: [{ key: '2026-06', value: 42500 }], highSpendLowUsageAssets: [] },
  findings: [
    { findingType: 'UNOWNED_AI_ASSET', assetId: 'aiasset-research-agent', severity: 'HIGH' },
    { findingType: 'UNAPPROVED_AI_ASSET', assetId: 'aiasset-research-agent', severity: 'HIGH' },
    { findingType: 'HIGH_COST_LOW_USAGE_AI_ASSET', assetId: 'aiasset-sales-workflow', severity: 'HIGH' },
  ],
  recommendations: [
    { recommendationType: 'ASSIGN_AI_OWNER', assetId: 'aiasset-research-agent' },
    { recommendationType: 'APPROVE_OR_BLOCK_AI_ASSET', assetId: 'aiasset-research-agent' },
    { recommendationType: 'OPTIMISE_HIGH_COST_LOW_USAGE_AI_ASSET', assetId: 'aiasset-sales-workflow' },
  ],
}

export function normalizeAIIntelligencePayload(payload: any = {}) {
  return {
    assets: Array.isArray(payload.assets?.assets) ? payload.assets.assets : Array.isArray(payload.assets) ? payload.assets : demoAIIntelligenceData.assets,
    utilisation: payload.utilisation ?? payload.usage ?? demoAIIntelligenceData.utilisation,
    spend: payload.spend ?? demoAIIntelligenceData.spend,
    findings: Array.isArray(payload.findings?.findings) ? payload.findings.findings : Array.isArray(payload.findings) ? payload.findings : demoAIIntelligenceData.findings,
    recommendations: Array.isArray(payload.recommendations?.recommendations) ? payload.recommendations.recommendations : Array.isArray(payload.recommendations) ? payload.recommendations : demoAIIntelligenceData.recommendations,
    dashboard: payload.dashboard ?? {},
    connectors: payload.connectors?.connectors ?? payload.connectors ?? [],
    commandDashboard: payload.commandDashboard ?? {},
    executiveProofPack: payload.executiveProofPack ?? {},
  }
}

export function useAIIntelligenceData() {
  const [data, setData] = useState(normalizeAIIntelligencePayload())
  const [error, setError] = useState<Error | null>(null)
  useEffect(() => {
    let mounted = true
    Promise.allSettled(aiIntelligenceApiPaths.map((path) => liveFetch<any>(path))).then((results) => {
      if (!mounted) return
      const [connectors, assets, utilisation, spend, findings, recommendations, dashboard, commandDashboard, executiveProofPack] = results.map((result) => result.status === 'fulfilled' ? result.value : undefined)
      setData(normalizeAIIntelligencePayload({ connectors, assets, utilisation, spend, findings, recommendations, dashboard, commandDashboard, executiveProofPack }))
      setError(null)
    }).catch((err) => { if (mounted) setError(normalizeApiError(err)) })
    return () => { mounted = false }
  }, [])
  return { data, error }
}
