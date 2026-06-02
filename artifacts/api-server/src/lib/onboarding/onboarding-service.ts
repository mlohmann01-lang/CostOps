import { platformEventService } from '../events/platform-event-service'
import { checkM365Readiness } from '../connectors/m365/m365-readiness'
import { m365DiscoveryService } from '../connectors/m365/m365-discovery-service'
import { m365TrustService } from '../connectors/m365/m365-trust'
import { runOpportunityFactory } from '../opportunity-factory/opportunity-factory-service'
import { getM365PlaybookHealth } from '../playbooks/m365/m365-playbook-runtime'
import { buildM365GoLiveChecklist } from './m365-go-live-checklist'
import { onboardingRepository, type OnboardingRepository } from './onboarding-repository'
import type { GoLiveChecklist, OnboardingProvider, OnboardingStep, OnboardingStepId, OnboardingStepState, TenantOnboardingState, TenantPilotMode } from './onboarding-types'
import { M365_ONBOARDING_STEP_LABELS, M365_ONBOARDING_STEPS } from './onboarding-types'

type Dependencies = { readiness?: typeof checkM365Readiness; discovery?: typeof m365DiscoveryService.discover; trust?: typeof m365TrustService.generateTrustReport; opportunityFactory?: typeof runOpportunityFactory; playbookHealth?: typeof getM365PlaybookHealth; now?: () => string }

function nowIso() { return new Date().toISOString() }
function newSteps(): OnboardingStep[] { return M365_ONBOARDING_STEPS.map((stepId) => ({ stepId, label: M365_ONBOARDING_STEP_LABELS[stepId], state: 'NOT_STARTED', blockers: [], warnings: [], evidenceRefs: [] })) }
function setStep(state: TenantOnboardingState, stepId: OnboardingStepId, patch: Partial<OnboardingStep> & { state: OnboardingStepState }) {
  const at = new Date().toISOString()
  state.steps = state.steps.map((step) => step.stepId === stepId ? { ...step, ...patch, completedAt: ['PASSED', 'WARNING', 'BLOCKED', 'SKIPPED'].includes(patch.state) ? at : step.completedAt } : step)
  state.currentStep = stepId
  state.blockers = state.steps.flatMap((step) => step.blockers)
  state.warnings = state.steps.flatMap((step) => step.warnings)
  state.status = state.blockers.length ? 'BLOCKED' : state.currentStep === 'GO_LIVE_CHECKLIST' || state.currentStep === 'PILOT_MODE' ? 'READY_FOR_PILOT' : 'IN_PROGRESS'
  state.updatedAt = at
  return state
}
function providerOnly(provider: OnboardingProvider) { if (provider !== 'M365') throw new Error('ONLY_M365_ONBOARDING_SUPPORTED') }
function highOrTrusted(band?: string) { return band === 'HIGH' || band === 'TRUSTED' }

export class OnboardingService {
  constructor(private readonly repo: OnboardingRepository = onboardingRepository, private readonly deps: Dependencies = {}) {}

  async getOrCreateOnboarding(tenantId: string, provider: OnboardingProvider = 'M365') {
    providerOnly(provider)
    const existing = await this.repo.get(tenantId, provider)
    if (existing) return existing
    const at = this.deps.now?.() ?? nowIso()
    const state: TenantOnboardingState = { tenantId, onboardingId: `onboarding-${provider.toLowerCase()}-${tenantId}`, provider, currentStep: 'WORKSPACE_SETUP', status: 'IN_PROGRESS', pilotMode: 'READ_ONLY', steps: newSteps(), blockers: [], warnings: [], createdAt: at, updatedAt: at }
    setStep(state, 'WORKSPACE_SETUP', { state: 'PASSED', summary: 'Tenant context exists, workspace mode is known, and tenant name is defaulted when absent.', evidenceRefs: [`tenant:${tenantId}`], blockers: [], warnings: [] })
    setStep(state, 'CONNECT_M365', this.hasM365Config() ? { state: 'PASSED', summary: 'M365 connector configuration can be inspected.', evidenceRefs: ['connector:m365:config'], blockers: [], warnings: [] } : { state: 'BLOCKED', summary: 'M365 connector configuration is incomplete.', evidenceRefs: ['connector:m365:config'], blockers: ['Missing tenantId/clientId/clientSecret or managed identity configuration.'], warnings: [] })
    await this.repo.save(state)
    await this.emit(tenantId, 'TENANT_ONBOARDING_STARTED', state)
    if (state.status === 'BLOCKED') await this.emit(tenantId, 'M365_ONBOARDING_BLOCKED', state)
    return state
  }

  async getOnboarding(tenantId: string, provider: OnboardingProvider = 'M365') { return this.getOrCreateOnboarding(tenantId, provider) }
  async advanceStep(tenantId: string, provider: OnboardingProvider, targetStep: OnboardingStepId) { const state = await this.getOrCreateOnboarding(tenantId, provider); setStep(state, targetStep, { state: 'IN_PROGRESS', blockers: [], warnings: [], evidenceRefs: [`onboarding:${targetStep}`] }); return this.repo.save(state) }

  async runReadinessCheck(tenantId: string) {
    const state = await this.getOrCreateOnboarding(tenantId, 'M365')
    const readiness = await (this.deps.readiness ?? checkM365Readiness)({ tenantId })
    state.readiness = readiness
    const patch = readiness.readReady ? { state: readiness.writeReady ? 'PASSED' as const : 'WARNING' as const, summary: readiness.writeReady ? 'Read and write readiness are available.' : 'Read readiness passed; write readiness is not enabled.', blockers: [], warnings: readiness.warnings ?? ['Write permission not granted.'], evidenceRefs: ['connectors:m365:readiness'] } : { state: 'BLOCKED' as const, summary: 'M365 read readiness is blocked.', blockers: readiness.blockers ?? ['M365 read readiness failed.'], warnings: readiness.warnings ?? [], evidenceRefs: ['connectors:m365:readiness'] }
    setStep(state, 'READINESS_CHECK', patch)
    await this.repo.save(state)
    await this.emit(tenantId, 'M365_ONBOARDING_READINESS_CHECKED', state)
    if (state.status === 'BLOCKED') await this.emit(tenantId, 'M365_ONBOARDING_BLOCKED', state)
    return state
  }

  async runDiscovery(tenantId: string) {
    const state = await this.getOrCreateOnboarding(tenantId, 'M365')
    const discovery = await (this.deps.discovery ?? m365DiscoveryService.discover.bind(m365DiscoveryService))({ tenantId, maxUsers: 100, perPage: 100 } as any)
    state.discovery = discovery
    const status = String(discovery.status ?? 'FAILED')
    const patch = status === 'COMPLETED' ? { state: 'PASSED' as const, summary: 'M365 discovery completed.', blockers: [], warnings: discovery.warnings ?? [], evidenceRefs: [`snapshot:${discovery.snapshotId}`] } : status === 'PARTIAL' ? { state: 'WARNING' as const, summary: 'M365 discovery completed with partial evidence.', blockers: [], warnings: discovery.warnings ?? ['Discovery partial.'], evidenceRefs: [`snapshot:${discovery.snapshotId}`] } : { state: 'BLOCKED' as const, summary: 'M365 discovery failed.', blockers: discovery.blockers ?? ['M365 discovery failed.'], warnings: discovery.warnings ?? [], evidenceRefs: [`snapshot:${discovery.snapshotId ?? 'missing'}`] }
    setStep(state, 'DISCOVERY', patch)
    await this.repo.save(state)
    await this.emit(tenantId, status === 'FAILED' ? 'M365_ONBOARDING_DISCOVERY_BLOCKED' : 'M365_ONBOARDING_DISCOVERY_COMPLETED', state)
    if (state.status === 'BLOCKED') await this.emit(tenantId, 'M365_ONBOARDING_BLOCKED', state)
    return state
  }

  async runTrustAssessment(tenantId: string) {
    const state = await this.getOrCreateOnboarding(tenantId, 'M365')
    const trust = await (this.deps.trust ?? m365TrustService.generateTrustReport.bind(m365TrustService))(tenantId)
    state.trust = trust
    const critical = [trust.identityTrust, trust.licenseTrust, trust.usageTrust, trust.activityTrust].filter((d: any) => ['LOW_CONFIDENCE', 'BLOCKED'].includes(d?.band))
    const investigate = [trust.identityTrust, trust.licenseTrust, trust.usageTrust, trust.activityTrust, trust.mailboxTrust, trust.executionSafetyTrust].filter((d: any) => d?.band === 'INVESTIGATE')
    const patch = critical.length ? { state: 'BLOCKED' as const, summary: 'Critical trust dimensions are blocked or low confidence.', blockers: trust.blockers?.length ? trust.blockers : ['Critical trust dimension is LOW_CONFIDENCE/BLOCKED.'], warnings: trust.warnings ?? [], evidenceRefs: ['trust:m365'] } : investigate.length ? { state: 'WARNING' as const, summary: 'Trust assessment completed with investigation warnings.', blockers: [], warnings: ['One or more trust dimensions require investigation.', ...(trust.warnings ?? [])], evidenceRefs: ['trust:m365'] } : { state: 'PASSED' as const, summary: 'Identity, license, usage, and activity trust are acceptable.', blockers: [], warnings: trust.warnings ?? [], evidenceRefs: ['trust:m365'] }
    setStep(state, 'TRUST_ASSESSMENT', patch)
    await this.repo.save(state)
    await this.emit(tenantId, 'M365_ONBOARDING_TRUST_ASSESSED', state)
    if (state.status === 'BLOCKED') await this.emit(tenantId, 'M365_ONBOARDING_BLOCKED', state)
    return state
  }

  async runOpportunityAssessment(tenantId: string) {
    const state = await this.getOrCreateOnboarding(tenantId, 'M365')
    try {
      const factory = await (this.deps.opportunityFactory ?? runOpportunityFactory)(tenantId)
      const health = (this.deps.playbookHealth ?? getM365PlaybookHealth)(tenantId)
      const opportunities = factory.opportunities ?? []
      const assessment = { playbooksRun: health.playbooksRun ?? 0, candidates: health.candidates ?? 0, opportunitiesGenerated: factory.health?.opportunitiesGenerated ?? opportunities.length, readyForApproval: health.productionReadinessCounts?.readyForApproval ?? 0, reviewRequired: health.productionReadinessCounts?.needsHardening ?? 0, blocked: health.productionReadinessCounts?.notReady ?? 0, projectedMonthlySavings: health.projectedMonthlySavings ?? factory.summary?.projectedSavings ?? 0, economicAssessmentPresent: opportunities.some((opp: any) => Boolean(opp.economicAssessment ?? opp.metadata?.economicAssessment)) }
      state.opportunityAssessment = assessment
      const patch = assessment.opportunitiesGenerated > 0 || assessment.candidates > 0 ? { state: assessment.readyForApproval > 0 ? 'PASSED' as const : 'WARNING' as const, summary: `${assessment.candidates} candidates and ${assessment.opportunitiesGenerated} opportunities assessed.`, blockers: [], warnings: assessment.readyForApproval > 0 ? [] : ['Candidates generated but none READY_FOR_APPROVAL.'], evidenceRefs: ['opportunity-factory:m365'] } : { state: 'WARNING' as const, summary: 'Playbooks ran but no opportunities were generated.', blockers: [], warnings: ['No M365 opportunities generated.'], evidenceRefs: ['opportunity-factory:m365'] }
      setStep(state, 'OPPORTUNITY_ASSESSMENT', patch)
      await this.repo.save(state)
      await this.emit(tenantId, 'M365_ONBOARDING_OPPORTUNITIES_ASSESSED', state)
      return state
    } catch (error) {
      state.opportunityAssessment = { error: error instanceof Error ? error.message : String(error) }
      setStep(state, 'OPPORTUNITY_ASSESSMENT', { state: 'BLOCKED', summary: 'M365 playbook runtime or Opportunity Factory failed.', blockers: [state.opportunityAssessment.error], warnings: [], evidenceRefs: ['opportunity-factory:m365'] })
      await this.repo.save(state); await this.emit(tenantId, 'M365_ONBOARDING_BLOCKED', state); return state
    }
  }

  async setPilotMode(tenantId: string, mode: TenantPilotMode) {
    const state = await this.getOrCreateOnboarding(tenantId, 'M365')
    const blockers: string[] = []
    if (mode === 'DRY_RUN' && !['PASSED', 'WARNING'].includes(state.steps.find((s) => s.stepId === 'TRUST_ASSESSMENT')?.state ?? '')) blockers.push('DRY_RUN requires trust assessment warning/pass.')
    if (mode === 'CONTROLLED_EXECUTION') {
      if (!state.readiness?.writeReady) blockers.push('CONTROLLED_EXECUTION requires writeReady true.')
      if (!highOrTrusted(state.trust?.executionSafetyTrust?.band)) blockers.push('CONTROLLED_EXECUTION requires execution safety trust HIGH/TRUSTED.')
    }
    if (mode === 'READ_ONLY' && !['PASSED', 'WARNING'].includes(state.steps.find((s) => s.stepId === 'DISCOVERY')?.state ?? '')) blockers.push('READ_ONLY pilot requires discovery warning/pass.')
    if (!blockers.length) state.pilotMode = mode
    setStep(state, 'PILOT_MODE', blockers.length ? { state: 'BLOCKED', summary: `${mode} pilot mode is blocked.`, blockers, warnings: [], evidenceRefs: ['pilot-mode:m365'] } : { state: 'PASSED', summary: `${mode} pilot mode selected.`, blockers: [], warnings: mode === 'CONTROLLED_EXECUTION' ? ['Selection only; no execution request was created.'] : [], evidenceRefs: ['pilot-mode:m365'] })
    await this.repo.save(state)
    await this.emit(tenantId, 'M365_ONBOARDING_PILOT_MODE_SELECTED', state)
    if (!blockers.length) await this.emit(tenantId, 'M365_ONBOARDING_READY_FOR_PILOT', state)
    else await this.emit(tenantId, 'M365_ONBOARDING_BLOCKED', state)
    return state
  }

  async getGoLiveChecklist(tenantId: string): Promise<GoLiveChecklist> { const state = await this.getOrCreateOnboarding(tenantId, 'M365'); const checklist = buildM365GoLiveChecklist(state); setStep(state, 'GO_LIVE_CHECKLIST', { state: checklist.summary.blocked ? 'BLOCKED' : checklist.summary.warning ? 'WARNING' : 'PASSED', summary: `Checklist readiness ${checklist.summary.readiness}.`, blockers: checklist.items.filter((i) => i.status === 'BLOCKED').map((i) => i.reason), warnings: checklist.items.filter((i) => i.status === 'WARNING').map((i) => i.reason), evidenceRefs: ['go-live-checklist:m365'] }); await this.repo.save(state); if (!checklist.summary.blocked) await this.emit(tenantId, 'M365_ONBOARDING_COMPLETED', state); return checklist }
  async getOnboardingSummary(tenantId: string) { const state = await this.getOrCreateOnboarding(tenantId, 'M365'); const checklist = buildM365GoLiveChecklist(state); return { tenantId, provider: 'M365', status: state.status, currentStep: state.currentStep, pilotMode: state.pilotMode, blockers: state.blockers, warnings: state.warnings, checklist: checklist.summary, readyForPilot: state.status === 'READY_FOR_PILOT' || checklist.summary.readiness !== 'NOT_READY' } }

  private hasM365Config() { return Boolean((process.env.M365_TENANT_ID && process.env.M365_CLIENT_ID && process.env.M365_CLIENT_SECRET) || process.env.M365_MANAGED_IDENTITY_CLIENT_ID) }
  private emit(tenantId: string, type: string, state: TenantOnboardingState) { return platformEventService.recordSystemEvent(tenantId, type, { entityType: 'TENANT_ONBOARDING', entityId: state.onboardingId, sourceSystem: 'm365-onboarding-service', metadata: { currentStep: state.currentStep, status: state.status, pilotMode: state.pilotMode } }).catch(() => undefined) }
}

export const onboardingService = new OnboardingService()
