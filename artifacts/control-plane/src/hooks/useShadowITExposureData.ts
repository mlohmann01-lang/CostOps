import { useMemo } from 'react'
import { useWorkspace } from '../lib/workspaceContext'
import { useLiveResource } from './useLiveResource'

export type ShadowITFinding = {
  id: string
  applicationName: string
  findingType: string
  riskLevel: string
  userCount: number
  owner?: string
  category?: string
  annualCostEstimate?: number
  trustScore: number
  rationale: string
  recommendedAction: string
  evidenceRefs: string[]
}

export type ShadowITOpportunity = {
  id: string
  findingId: string
  applicationName: string
  findingType: string
  potentialAnnualSavings?: number
  confidence: string
  opportunityType: 'RATIONALIZATION' | 'DUPLICATE_CONSOLIDATION' | 'GOVERNANCE_EXPOSURE'
  rationale: string
  evidenceRefs: string[]
}

export type ShadowITExposureData = {
  summary: {
    title: 'Shadow IT Exposure'
    applicationsDiscovered: number
    unknownApplications: number
    aiApplications: number
    duplicateCapabilityFindings: number
    potentialAnnualSavings: number
    governanceExposureScore: number
  }
  findings: ShadowITFinding[]
  opportunities: ShadowITOpportunity[]
  governanceExposureScore: number
}

export const demoShadowITExposureData: ShadowITExposureData = {
  summary: { title: 'Shadow IT Exposure', applicationsDiscovered: 5, unknownApplications: 4, aiApplications: 1, duplicateCapabilityFindings: 0, potentialAnnualSavings: 1260, governanceExposureScore: 100 },
  findings: [
    { id: 'shadow-it-chatgpt-unapproved_application', applicationName: 'ChatGPT', findingType: 'UNAPPROVED_APPLICATION', riskLevel: 'MEDIUM', userCount: 34, category: 'AI', annualCostEstimate: 10200, trustScore: 75, rationale: 'ChatGPT is not on the approved application list.', recommendedAction: 'Review application approval status and assign governance owner.', evidenceRefs: ['enterprise-app:enterprise-app-chatgpt', 'oauth-app:oauth-chatgpt', 'sign-in:signin-chatgpt-1'] },
    { id: 'shadow-it-chatgpt-ai_application', applicationName: 'ChatGPT', findingType: 'AI_APPLICATION', riskLevel: 'HIGH', userCount: 34, category: 'AI', annualCostEstimate: 10200, trustScore: 75, rationale: 'ChatGPT is a known AI application without approval recorded.', recommendedAction: 'Review AI application usage, data handling, and approval posture.', evidenceRefs: ['enterprise-app:enterprise-app-chatgpt', 'oauth-app:oauth-chatgpt', 'sign-in:signin-chatgpt-1'] },
    { id: 'shadow-it-notion-unapproved_application', applicationName: 'Notion', findingType: 'UNAPPROVED_APPLICATION', riskLevel: 'MEDIUM', userCount: 21, owner: 'product-ops@example.com', category: 'Collaboration', annualCostEstimate: 3780, trustScore: 100, rationale: 'Notion is not on the approved application list.', recommendedAction: 'Review application approval status and assign governance owner.', evidenceRefs: ['enterprise-app:enterprise-app-notion', 'sign-in:signin-notion-1'] },
    { id: 'shadow-it-dropbox-unapproved_application', applicationName: 'Dropbox', findingType: 'UNAPPROVED_APPLICATION', riskLevel: 'MEDIUM', userCount: 9, owner: 'it@example.com', category: 'Storage', annualCostEstimate: 2160, trustScore: 100, rationale: 'Dropbox is not on the approved application list.', recommendedAction: 'Review application approval status and assign governance owner.', evidenceRefs: ['enterprise-app:enterprise-app-dropbox', 'oauth-app:oauth-dropbox', 'sign-in:signin-dropbox-1'] },
    { id: 'shadow-it-miro-unapproved_application', applicationName: 'Miro', findingType: 'UNAPPROVED_APPLICATION', riskLevel: 'MEDIUM', userCount: 7, category: 'Whiteboard', annualCostEstimate: 1260, trustScore: 75, rationale: 'Miro is not on the approved application list.', recommendedAction: 'Review application approval status and assign governance owner.', evidenceRefs: ['enterprise-app:enterprise-app-miro', 'sign-in:signin-miro-1'] },
    { id: 'shadow-it-miro-dormant_application', applicationName: 'Miro', findingType: 'DORMANT_APPLICATION', riskLevel: 'LOW', userCount: 7, category: 'Whiteboard', annualCostEstimate: 1260, trustScore: 75, rationale: 'Miro has no recent activity for more than 90 days.', recommendedAction: 'Review for rationalization or retirement opportunity.', evidenceRefs: ['enterprise-app:enterprise-app-miro', 'sign-in:signin-miro-1'] },
    { id: 'shadow-it-figma-approved', applicationName: 'Figma', findingType: 'APPROVED_APPLICATION', riskLevel: 'LOW', userCount: 11, owner: 'design@example.com', category: 'Design', annualCostEstimate: 5940, trustScore: 100, rationale: 'Figma is approved and owner-backed; included for exposure baseline.', recommendedAction: 'Validate usage and keep owner evidence current.', evidenceRefs: ['enterprise-app:enterprise-app-figma', 'sign-in:signin-figma-1'] },
  ],
  opportunities: [
    { id: 'opp-shadow-it-miro-dormant_application', findingId: 'shadow-it-miro-dormant_application', applicationName: 'Miro', findingType: 'DORMANT_APPLICATION', potentialAnnualSavings: 1260, confidence: 'MEDIUM', opportunityType: 'RATIONALIZATION', rationale: 'Miro has a dormant application opportunity with 7 affected users.', evidenceRefs: ['enterprise-app:enterprise-app-miro', 'sign-in:signin-miro-1'] },
    { id: 'opp-shadow-it-chatgpt-ai_application', findingId: 'shadow-it-chatgpt-ai_application', applicationName: 'ChatGPT', findingType: 'AI_APPLICATION', confidence: 'MEDIUM', opportunityType: 'GOVERNANCE_EXPOSURE', rationale: 'ChatGPT requires governance review; no savings are estimated without rationalization or duplicate evidence.', evidenceRefs: ['enterprise-app:enterprise-app-chatgpt', 'oauth-app:oauth-chatgpt', 'sign-in:signin-chatgpt-1'] },
  ],
  governanceExposureScore: 100,
}

export function normalizeShadowITExposurePayload(payload: any): ShadowITExposureData {
  const summary = payload?.summary ?? payload?.dashboardTile ?? demoShadowITExposureData.summary
  const findings = Array.isArray(payload?.findings) ? payload.findings : []
  const opportunities = Array.isArray(payload?.opportunities) ? payload.opportunities : []
  return { summary: { ...demoShadowITExposureData.summary, ...summary }, findings, opportunities, governanceExposureScore: Number(payload?.governanceExposureScore ?? summary.governanceExposureScore ?? 0) }
}

export function useShadowITExposureData() {
  const workspace = useWorkspace()
  const live = useLiveResource<ShadowITExposureData>({ path: '/api/playbooks/shadow-it/exposure', enabled: workspace.mode === 'live', requireDataReady: false, initialData: demoShadowITExposureData, normalizer: normalizeShadowITExposurePayload, isEmpty: (data) => data.findings.length === 0 })
  return useMemo(() => {
    if (workspace.mode === 'demo') return { data: demoShadowITExposureData, loading: false, error: null, isEmptyLive: false, refresh: () => Promise.resolve(demoShadowITExposureData) }
    return { data: live.data.findings.length ? live.data : demoShadowITExposureData, loading: live.loading, error: live.error, isEmptyLive: live.isEmpty, refresh: live.refresh }
  }, [workspace.mode, live.data, live.loading, live.error, live.isEmpty, live.refresh])
}
