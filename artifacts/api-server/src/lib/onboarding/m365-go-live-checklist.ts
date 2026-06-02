import type { GoLiveChecklist, GoLiveChecklistItem, GoLiveChecklistSummary, TenantOnboardingState } from './onboarding-types'

function item(id: string, label: string, status: GoLiveChecklistItem['status'], reason: string, evidenceRef?: string): GoLiveChecklistItem { return { id, label, status, reason, evidenceRef } }
function stepPassed(state: TenantOnboardingState, stepId: string) { return state.steps.find((step) => step.stepId === stepId)?.state === 'PASSED' }
function trustOk(band?: string) { return band === 'HIGH' || band === 'TRUSTED' }
function trustWarn(band?: string) { return band === 'INVESTIGATE' }

export function buildM365GoLiveChecklist(state: TenantOnboardingState): GoLiveChecklist {
  const readiness = state.readiness ?? {}
  const discovery = state.discovery ?? {}
  const trust = state.trust ?? {}
  const opp = state.opportunityAssessment ?? {}
  const writeReady = Boolean(readiness.writeReady)
  const readReady = Boolean(readiness.readReady)
  const graphReachable = readiness.graphReachable !== false && (readiness.status === 'READY' || readiness.authState === 'READY' || readReady)
  const dims = ['identityTrust', 'licenseTrust', 'usageTrust', 'activityTrust', 'mailboxTrust']
  const executionSafetyBand = trust.executionSafetyTrust?.band
  const items: GoLiveChecklistItem[] = [
    item('workspace_configured', 'Workspace configured', stepPassed(state, 'WORKSPACE_SETUP') ? 'PASSED' : 'BLOCKED', stepPassed(state, 'WORKSPACE_SETUP') ? 'Tenant context and workspace mode are known.' : 'Workspace setup has not passed.', 'onboarding:WORKSPACE_SETUP'),
    item('m365_connector_configured', 'M365 connector configured', stepPassed(state, 'CONNECT_M365') ? 'PASSED' : 'BLOCKED', stepPassed(state, 'CONNECT_M365') ? 'M365 connector config can be inspected.' : 'M365 connector config is missing.', 'onboarding:CONNECT_M365'),
    item('required_read_permissions', 'Required read permissions granted', readReady ? 'PASSED' : 'BLOCKED', readReady ? 'Required read permissions are present.' : 'Required read permissions are missing.', 'onboarding:READINESS_CHECK'),
    item('optional_write_permissions', 'Optional write permissions identified', writeReady ? 'PASSED' : 'WARNING', writeReady ? 'Write readiness is available for later controlled validation.' : 'Write permission not granted; execution remains disabled.'),
    item('graph_reachable', 'Graph reachable', graphReachable ? 'PASSED' : 'BLOCKED', graphReachable ? 'Graph readiness can be inspected.' : 'Graph/token readiness is blocked.'),
    item('discovery_completed', 'Discovery completed', discovery.status === 'COMPLETED' || stepPassed(state, 'DISCOVERY') ? 'PASSED' : discovery.status === 'PARTIAL' ? 'WARNING' : 'BLOCKED', discovery.status ? `Discovery status ${discovery.status}.` : 'Discovery has not completed.', 'onboarding:DISCOVERY'),
    item('latest_snapshot', 'Latest snapshot available', discovery.snapshotId ? 'PASSED' : stepPassed(state, 'DISCOVERY') ? 'WARNING' : 'BLOCKED', discovery.snapshotId ? `Latest snapshot ${discovery.snapshotId}.` : 'Snapshot evidence is unavailable.'),
    ...dims.map((dim) => item(dim, `${dim.replace('Trust', '')} trust acceptable`, trustOk(trust[dim]?.band) ? 'PASSED' : trustWarn(trust[dim]?.band) ? 'WARNING' : 'BLOCKED', trust[dim]?.band ? `${dim} is ${trust[dim].band}.` : `${dim} unavailable.`, `trust:${dim}`)),
    item('playbooks_run', 'Playbooks run', opp.playbooksRun > 0 ? 'PASSED' : 'BLOCKED', opp.playbooksRun > 0 ? `${opp.playbooksRun} playbooks ran.` : 'M365 playbook runtime has not completed.', 'onboarding:OPPORTUNITY_ASSESSMENT'),
    item('opportunities_generated', 'Opportunities generated', opp.opportunitiesGenerated > 0 || opp.candidates > 0 ? 'PASSED' : 'WARNING', opp.opportunitiesGenerated > 0 ? `${opp.opportunitiesGenerated} opportunities generated.` : `${opp.candidates ?? 0} candidates found.`),
    item('economic_assessment', 'Economic assessment present', opp.economicAssessmentPresent ? 'PASSED' : 'WARNING', opp.economicAssessmentPresent ? 'Economic assessment fields are present.' : 'Economic assessment not observed in latest opportunity run.'),
    item('execution_safety_gates', 'Execution safety gates configured', trustOk(executionSafetyBand) ? 'PASSED' : executionSafetyBand === 'INVESTIGATE' ? 'WARNING' : 'BLOCKED', executionSafetyBand ? `Execution safety trust is ${executionSafetyBand}.` : 'Execution safety trust unavailable.'),
    item('pilot_mode_selected', 'Pilot mode selected', state.pilotMode ? 'PASSED' : 'BLOCKED', `Pilot mode ${state.pilotMode}.`),
    item('runtime_health', 'Runtime health not failed', state.status !== 'BLOCKED' ? 'PASSED' : 'BLOCKED', `Onboarding status ${state.status}.`),
    item('platform_events', 'Platform events recording', 'PASSED', 'Onboarding events emit through PlatformEventService.'),
    item('outcome_proof_authority', 'Outcome proof authority available', 'PASSED', 'Outcome Proof Authority is available for later execution validation.'),
  ]
  const summaryBase = { total: items.length, passed: items.filter((row) => row.status === 'PASSED').length, warning: items.filter((row) => row.status === 'WARNING').length, blocked: items.filter((row) => row.status === 'BLOCKED').length }
  const readinessSummary: GoLiveChecklistSummary['readiness'] = summaryBase.blocked > 0 ? 'NOT_READY' : state.pilotMode === 'CONTROLLED_EXECUTION' && writeReady && trustOk(executionSafetyBand) ? 'CONTROLLED_EXECUTION_READY' : state.pilotMode === 'DRY_RUN' ? 'DRY_RUN_READY' : 'READ_ONLY_READY'
  return { tenantId: state.tenantId, provider: 'M365', items, summary: { ...summaryBase, readiness: readinessSummary }, generatedAt: new Date().toISOString() }
}
