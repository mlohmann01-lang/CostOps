export type OnboardingProvider = 'M365'
export type OnboardingStepId = 'WORKSPACE_SETUP' | 'CONNECT_M365' | 'READINESS_CHECK' | 'DISCOVERY' | 'TRUST_ASSESSMENT' | 'OPPORTUNITY_ASSESSMENT' | 'PILOT_MODE' | 'GO_LIVE_CHECKLIST' | 'COMPLETE'
export type TenantOnboardingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'READY_FOR_PILOT' | 'COMPLETE'
export type TenantPilotMode = 'READ_ONLY' | 'DRY_RUN' | 'CONTROLLED_EXECUTION'
export type OnboardingStepState = 'NOT_STARTED' | 'IN_PROGRESS' | 'PASSED' | 'WARNING' | 'BLOCKED' | 'SKIPPED'

export interface OnboardingStep { stepId: OnboardingStepId; label: string; state: OnboardingStepState; summary?: string; blockers: string[]; warnings: string[]; evidenceRefs: string[]; completedAt?: string }
export interface TenantOnboardingState { tenantId: string; onboardingId: string; provider: OnboardingProvider; currentStep: OnboardingStepId; status: TenantOnboardingStatus; pilotMode: TenantPilotMode; steps: OnboardingStep[]; blockers: string[]; warnings: string[]; createdAt: string; updatedAt: string; readiness?: any; discovery?: any; trust?: any; opportunityAssessment?: any }
export interface GoLiveChecklistItem { id: string; label: string; status: 'PASSED' | 'WARNING' | 'BLOCKED' | 'NOT_APPLICABLE'; reason: string; evidenceRef?: string }
export interface GoLiveChecklistSummary { total: number; passed: number; warning: number; blocked: number; readiness: 'NOT_READY' | 'READ_ONLY_READY' | 'DRY_RUN_READY' | 'CONTROLLED_EXECUTION_READY' }
export interface GoLiveChecklist { tenantId: string; provider: OnboardingProvider; items: GoLiveChecklistItem[]; summary: GoLiveChecklistSummary; generatedAt: string }
export const M365_ONBOARDING_STEP_LABELS: Record<OnboardingStepId, string> = { WORKSPACE_SETUP: 'Workspace Setup', CONNECT_M365: 'Connect M365', READINESS_CHECK: 'Readiness Check', DISCOVERY: 'Discovery', TRUST_ASSESSMENT: 'Trust Assessment', OPPORTUNITY_ASSESSMENT: 'Opportunity Assessment', PILOT_MODE: 'Pilot Mode', GO_LIVE_CHECKLIST: 'Go-Live Checklist', COMPLETE: 'Complete' }
export const M365_ONBOARDING_STEPS = Object.keys(M365_ONBOARDING_STEP_LABELS).filter((step) => step !== 'COMPLETE') as OnboardingStepId[]
