import { useMemo } from 'react'
import { useWorkspace } from '../lib/workspaceContext'
import { useLiveResource } from './useLiveResource'

export type AIGovernanceFinding = { id:string; applicationName:string; findingType:string; riskLevel:string; usersDetected:number; approved:boolean; owner?:string; estimatedAnnualSpend?:number; trustScore:number; rationale:string; recommendedAction:string; evidenceRefs:string[]; potentialAnnualSavings?:number }
export type AIApplicationInventoryItem = { applicationName:string; usersDetected:number; approved:boolean; owner?:string; riskLevel:string; policyCoverage?:boolean; estimatedAnnualSpend?:number }
export type AIGovernanceExposureData = { summary:{ aiApplicationsDetected:number; unapprovedAIApps:number; policyGaps:number; governanceExposureScore:number; potentialAnnualSavings:number; highRiskFindings:number }; inventory:AIApplicationInventoryItem[]; findings:AIGovernanceFinding[]; opportunity:{ potentialAnnualSavings:number; governanceExposureScore:number; policyCoverageScore:number; findingsWithSavings:AIGovernanceFinding[]; governanceOnlyFindings:AIGovernanceFinding[]; recommendedActions:string[] }; governanceExposureScore:number; policyCoverageScore:number; evidenceRefs:string[] }

const finding = (id:string, applicationName:string, findingType:string, riskLevel:string, usersDetected:number, approved:boolean, owner:string|undefined, estimatedAnnualSpend:number|undefined, potentialAnnualSavings:number|undefined, recommendedAction:string, evidenceRefs:string[]): AIGovernanceFinding => ({ id, applicationName, findingType, riskLevel, usersDetected, approved, owner, estimatedAnnualSpend, potentialAnnualSavings, trustScore: owner ? 100 : 85, rationale: `${applicationName} requires AI governance review for ${findingType.toLowerCase().replace(/_/g, ' ')}.`, recommendedAction, evidenceRefs })

const demoFindings: AIGovernanceFinding[] = [
  finding('chatgpt-unapproved', 'ChatGPT', 'UNAPPROVED_AI_APPLICATION', 'HIGH', 34, false, undefined, 10200, undefined, 'Review approval status and create an exception or remediation plan.', ['enterprise-app:chatgpt', 'oauth-app:chatgpt', 'signin:chatgpt-34']),
  finding('chatgpt-data', 'ChatGPT', 'DATA_EXPOSURE_RISK', 'HIGH', 34, false, undefined, 10200, undefined, 'Review data-sharing controls and user guidance.', ['enterprise-app:chatgpt', 'oauth-app:chatgpt', 'signin:chatgpt-34']),
  finding('chatgpt-spend', 'ChatGPT', 'UNMANAGED_AI_SPEND', 'HIGH', 34, false, undefined, 10200, 10200, 'Review unmanaged AI spend and decide whether to approve or consolidate.', ['enterprise-app:chatgpt', 'oauth-app:chatgpt', 'signin:chatgpt-34']),
  finding('claude-owner', 'Claude', 'AI_OWNER_GAP', 'HIGH', 16, false, undefined, 4800, undefined, 'Assign owner before policy and usage decisions.', ['enterprise-app:claude', 'oauth-app:claude', 'signin:claude-16']),
  finding('copilot-policy', 'Microsoft Copilot', 'AI_POLICY_GAP', 'HIGH', 42, true, 'ai-governance@example.com', 15120, undefined, 'Apply AI policy coverage and document controls.', ['enterprise-app:copilot', 'signin:copilot-42']),
  finding('github-code', 'GitHub Copilot', 'SOURCE_CODE_EXPOSURE_RISK', 'HIGH', 11, true, 'engineering@example.com', 2280, undefined, 'Review code-upload controls and developer usage policy.', ['enterprise-app:github-copilot', 'signin:github-copilot-11']),
  finding('cursor-code', 'Cursor', 'SOURCE_CODE_EXPOSURE_RISK', 'HIGH', 9, false, undefined, 1800, undefined, 'Review code-upload controls and developer usage policy.', ['enterprise-app:cursor', 'signin:cursor-9']),
  finding('duplicate-ai', 'Microsoft Copilot', 'DUPLICATE_AI_TOOLING', 'MEDIUM', 42, true, 'ai-governance@example.com', 15120, 3024, 'Consolidate AI tooling where policy and usage support it.', ['enterprise-app:copilot', 'signin:copilot-42']),
  finding('perplexity-data', 'Perplexity', 'DATA_EXPOSURE_RISK', 'HIGH', 7, false, 'research@example.com', 1260, undefined, 'Review data-sharing controls and user guidance.', ['oauth-app:perplexity', 'signin:perplexity-7']),
  finding('gemini-data', 'Gemini', 'DATA_EXPOSURE_RISK', 'HIGH', 4, false, 'data@example.com', 960, undefined, 'Review data-sharing controls and user guidance.', ['enterprise-app:gemini', 'signin:gemini-4']),
]

export const demoAIGovernanceExposureData: AIGovernanceExposureData = {
  summary: { aiApplicationsDetected: 7, unapprovedAIApps: 5, policyGaps: 1, governanceExposureScore: 100, potentialAnnualSavings: 14224, highRiskFindings: 9 },
  inventory: [
    { applicationName:'ChatGPT', usersDetected:34, approved:false, riskLevel:'HIGH', estimatedAnnualSpend:10200 }, { applicationName:'Claude', usersDetected:16, approved:false, riskLevel:'HIGH', estimatedAnnualSpend:4800 }, { applicationName:'Microsoft Copilot', usersDetected:42, approved:true, owner:'ai-governance@example.com', riskLevel:'HIGH', policyCoverage:false, estimatedAnnualSpend:15120 }, { applicationName:'GitHub Copilot', usersDetected:11, approved:true, owner:'engineering@example.com', riskLevel:'HIGH', policyCoverage:true, estimatedAnnualSpend:2280 }, { applicationName:'Cursor', usersDetected:9, approved:false, riskLevel:'HIGH', estimatedAnnualSpend:1800 }, { applicationName:'Perplexity', usersDetected:7, approved:false, owner:'research@example.com', riskLevel:'HIGH', estimatedAnnualSpend:1260 }, { applicationName:'Gemini', usersDetected:4, approved:false, owner:'data@example.com', riskLevel:'HIGH', estimatedAnnualSpend:960 },
  ],
  findings: demoFindings,
  opportunity: { potentialAnnualSavings: 14224, governanceExposureScore: 100, policyCoverageScore: 0, findingsWithSavings: demoFindings.filter((finding) => Number(finding.potentialAnnualSavings) > 0), governanceOnlyFindings: demoFindings.filter((finding) => !finding.potentialAnnualSavings), recommendedActions: ['Assign owner', 'Review approval status', 'Apply AI policy', 'Consolidate AI tooling', 'Review code-upload controls', 'Review data-sharing controls'] },
  governanceExposureScore: 100,
  policyCoverageScore: 0,
  evidenceRefs: Array.from(new Set(demoFindings.flatMap((finding) => finding.evidenceRefs))),
}

export function normalizeAIGovernanceExposurePayload(payload: any): AIGovernanceExposureData {
  const summary = payload?.summary ?? demoAIGovernanceExposureData.summary
  const findings = Array.isArray(payload?.findings) ? payload.findings : []
  const inventory = Array.isArray(payload?.inventory) ? payload.inventory : []
  const opportunity = payload?.opportunity ?? { ...demoAIGovernanceExposureData.opportunity, findingsWithSavings: findings.filter((finding: AIGovernanceFinding) => Number(finding.potentialAnnualSavings) > 0), governanceOnlyFindings: findings.filter((finding: AIGovernanceFinding) => !finding.potentialAnnualSavings) }
  return { summary: { ...demoAIGovernanceExposureData.summary, ...summary }, inventory, findings, opportunity, governanceExposureScore: Number(payload?.governanceExposureScore ?? summary.governanceExposureScore ?? 0), policyCoverageScore: Number(payload?.policyCoverageScore ?? opportunity.policyCoverageScore ?? 0), evidenceRefs: Array.isArray(payload?.evidenceRefs) ? payload.evidenceRefs : [] }
}

export type AIGovernanceExposureDataState = 'LIVE' | 'DEMO' | 'NOT_CONNECTED' | 'NO_DATA'
const notConnectedAIGovernanceExposureData: AIGovernanceExposureData = { summary: { aiApplicationsDetected: 0, unapprovedAIApps: 0, policyGaps: 0, governanceExposureScore: 0, potentialAnnualSavings: 0, highRiskFindings: 0 }, inventory: [], findings: [], opportunity: { potentialAnnualSavings: 0, governanceExposureScore: 0, policyCoverageScore: 0, findingsWithSavings: [], governanceOnlyFindings: [] , recommendedActions: [] }, governanceExposureScore: 0, policyCoverageScore: 0, evidenceRefs: [] }

export function useAIGovernanceExposureData() {
  const workspace = useWorkspace()
  const live = useLiveResource<AIGovernanceExposureData>({ path: '/api/playbooks/ai-governance/exposure', enabled: workspace.mode === 'live', requireDataReady: false, initialData: demoAIGovernanceExposureData, normalizer: normalizeAIGovernanceExposurePayload, isEmpty: (data) => data.findings.length === 0 })
  return useMemo(() => {
    if (workspace.mode === 'demo') return { data: demoAIGovernanceExposureData, loading: false, error: null, isEmptyLive: false, dataState: 'DEMO' as AIGovernanceExposureDataState, refresh: () => Promise.resolve(demoAIGovernanceExposureData) }
    if (!workspace.dataReady) return { data: notConnectedAIGovernanceExposureData, loading: false, error: null, isEmptyLive: true, dataState: 'NOT_CONNECTED' as AIGovernanceExposureDataState, refresh: live.refresh }
    const dataState: AIGovernanceExposureDataState = live.error ? 'NO_DATA' : live.isEmpty ? 'NO_DATA' : 'LIVE'
    return { data: live.data, loading: live.loading, error: live.error, isEmptyLive: live.isEmpty, dataState, refresh: live.refresh }
  }, [workspace.mode, workspace.dataReady, live.data, live.loading, live.error, live.isEmpty, live.refresh])
}
