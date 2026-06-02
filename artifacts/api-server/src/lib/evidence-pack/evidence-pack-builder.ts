import { m365SnapshotRepository } from '../connectors/m365/m365-snapshot-repository'
import { m365HealthService } from '../connectors/m365/m365-health'
import { m365TrustService } from '../connectors/m365/m365-trust'
import { OpportunityRepository } from '../opportunities/opportunity-repository'
import { getM365PlaybookHealth } from '../playbooks/m365/m365-playbook-runtime'
import { platformEventService } from '../events/platform-event-service'
import { outcomeProofService } from '../outcomes/outcome-proof-service'
import { monitoredOutcomeService } from '../drift/monitored-outcome-service'
import type { EvidenceConfidence, EvidencePack, EvidencePackGenerateInput, EvidencePackScope, EvidencePackSection, EvidencePackSummary } from './evidence-pack-types'

function confidence(hasEvidence: boolean, warnings = 0, blockers = 0): EvidenceConfidence { if (blockers > 0 || !hasEvidence) return 'LOW'; if (warnings > 0) return 'MEDIUM'; return 'HIGH' }
function pct(parts: EvidenceConfidence[]) { const score = parts.reduce((sum, band) => sum + (band === 'HIGH' ? 100 : band === 'MEDIUM' ? 65 : 25), 0); return parts.length ? Math.round(score / parts.length) : 0 }
function section(sectionId: string, title: string, type: EvidencePackSection['type'], summary: string, metrics: Record<string, unknown>, findings: Array<Record<string, unknown>> = [], evidenceRefs: string[] = []): EvidencePackSection { return { sectionId, title, type, summary, metrics, findings, evidenceRefs } }
function scopedEvents(events: any[], category: string) { return events.filter((event) => event.category === category) }

export class EvidencePackBuilder {
  constructor(private readonly opportunityRepo = new OpportunityRepository()) {}

  async buildTenantEvidencePack(input: EvidencePackGenerateInput): Promise<EvidencePack> { return this.build(input.tenantId, input.scope ?? 'TENANT', input.targetId, input.generatedBy) }
  async buildOpportunityEvidencePack(input: EvidencePackGenerateInput): Promise<EvidencePack> { return this.build(input.tenantId, 'OPPORTUNITY', input.targetId, input.generatedBy) }
  async buildExecutionEvidencePack(input: EvidencePackGenerateInput): Promise<EvidencePack> { return this.build(input.tenantId, 'EXECUTION', input.targetId, input.generatedBy) }
  async buildOutcomeEvidencePack(input: EvidencePackGenerateInput): Promise<EvidencePack> { return this.build(input.tenantId, 'OUTCOME', input.targetId, input.generatedBy) }

  private async build(tenantId: string, scope: EvidencePackScope, targetId?: string, generatedBy?: string): Promise<EvidencePack> {
    const generatedAt = new Date().toISOString()
    const snapshot = m365SnapshotRepository.getLatest(tenantId)
    const health = await m365HealthService.getHealth(tenantId).catch((error) => ({ state: 'FAILED', blockers: [String(error)], warnings: [] } as any))
    const trust = await m365TrustService.generateTrustReport(tenantId).catch((error) => ({ globalTrustScore: 0, globalTrustBand: 'BLOCKED', blockers: [String(error)], warnings: [] } as any))
    const opportunities = this.opportunityRepo.list(tenantId).filter((opp) => !targetId || scope !== 'OPPORTUNITY' || opp.id === targetId)
    const playbooks = getM365PlaybookHealth(tenantId)
    const events = await platformEventService.listEvents(tenantId, { limit: 1000 })
    const proofs = await outcomeProofService.listProofs(tenantId, { limit: 500 })
    const proofSummary = await outcomeProofService.getSummary(tenantId).catch(() => ({ projectedMonthlySavings: 0, approvedMonthlySavings: 0, executedMonthlySavings: 0, verifiedMonthlySavings: 0, protectedMonthlySavings: 0, verificationBacklogCount: 0, verificationFailedCount: 0, driftedOutcomeCount: 0 })) as any
    const drift = monitoredOutcomeService.list(tenantId)
    const approvalEvents = scopedEvents(events, 'APPROVAL')
    const executionEvents = scopedEvents(events, 'EXECUTION')
    const verificationEvents = events.filter((event) => event.type.includes('VERIFICATION') || event.type.includes('VERIFIED'))
    const driftEvents = scopedEvents(events, 'DRIFT')
    const sections: EvidencePackSection[] = [
      section('executive-summary', 'Executive Summary', 'EXECUTIVE_SUMMARY', 'Page 1 summary of projected, approved, executed, verified, and protected savings.', {}, []),
      section('discovery', 'Discovery Evidence', 'DISCOVERY', snapshot ? 'Latest M365 snapshot and connector discovery evidence are available.' : 'No M365 discovery snapshot is available.', { users: snapshot?.users.length ?? 0, licenses: snapshot?.skus.length ?? 0, usageRecords: snapshot?.usageRecords.length ?? 0, mailboxes: snapshot?.mailboxes.length ?? 0, groups: snapshot?.groups.length ?? 0, connectorHealth: health.state }, [], snapshot ? [`snapshot:${snapshot.snapshot.snapshotId}`] : []),
      section('trust', 'Trust Summary', 'TRUST', `Trust band ${trust.globalTrustBand ?? 'UNKNOWN'} with score ${trust.globalTrustScore ?? 0}.`, { identityTrust: trust.identityTrust?.band, licenseTrust: trust.licenseTrust?.band, usageTrust: trust.usageTrust?.band, activityTrust: trust.activityTrust?.band, executionSafetyTrust: trust.executionSafetyTrust?.band, trustFindings: scopedEvents(events, 'TRUST').length }, trust.blockers?.map((blocker: string) => ({ severity: 'BLOCKER', blocker })) ?? [], ['trust:m365']),
      section('opportunity', 'Opportunity Summary', 'OPPORTUNITY', `${opportunities.length} opportunities and ${playbooks.candidates ?? 0} M365 playbook candidates captured.`, { playbooksRun: playbooks.playbooksRun ?? 0, opportunities: opportunities.length, projectedSavings: opportunities.reduce((sum, opp) => sum + opp.projectedMonthlySavings, 0), evidenceQuality: opportunities.map((opp: any) => opp.evidenceQuality).filter(Boolean), savingsConfidence: opportunities.map((opp: any) => opp.savingsConfidence).filter(Boolean), executionSafety: opportunities.map((opp: any) => opp.executionSafety).filter(Boolean) }, opportunities.map((opp) => ({ opportunityId: opp.id, title: opp.title, readiness: opp.readiness })), opportunities.flatMap((opp) => (opp.evidence ?? []).map((_: unknown, index: number) => `opportunity:${opp.id}:evidence:${index}`))),
      section('approval', 'Approval Timeline', 'APPROVAL', `${approvalEvents.length} approval events captured.`, { approvals: approvalEvents.length }, approvalEvents.map((event) => ({ eventId: event.eventId, type: event.type, at: event.occurredAt })), approvalEvents.map((event) => event.eventId)),
      section('execution', 'Execution Timeline', 'EXECUTION', `${executionEvents.length} execution events captured, including dry-run and mutation evidence when present.`, { executions: executionEvents.length, dryRuns: executionEvents.filter((event) => event.type.includes('DRY_RUN')).length }, executionEvents.map((event) => ({ eventId: event.eventId, type: event.type, at: event.occurredAt })), executionEvents.map((event) => event.eventId)),
      section('verification', 'Verification Summary', 'VERIFICATION', `${verificationEvents.length} verification events and ${proofSummary.verificationBacklogCount ?? 0} backlog items captured.`, { verificationEvents: verificationEvents.length, verificationBacklog: proofSummary.verificationBacklogCount ?? 0, verificationFailures: proofSummary.verificationFailedCount ?? 0 }, verificationEvents.map((event) => ({ eventId: event.eventId, type: event.type, at: event.occurredAt })), verificationEvents.map((event) => event.eventId)),
      section('outcome', 'Outcome Summary', 'OUTCOME', `${proofs.length} outcome proofs captured through Outcome Proof Authority.`, { proofs: proofs.length, projectedSavings: proofSummary.projectedMonthlySavings ?? 0, executedSavings: proofSummary.executedMonthlySavings ?? 0, verifiedSavings: proofSummary.verifiedMonthlySavings ?? 0 }, proofs.map((proof) => ({ outcomeId: proof.outcomeId, proofState: proof.proofState, confidenceBand: proof.confidenceBand })), proofs.map((proof) => `outcome:${proof.outcomeId}`)),
      section('drift', 'Drift Summary', 'DRIFT', `${drift.length} drift monitors and ${driftEvents.length} drift events captured.`, { driftRules: drift.length, driftEvents: driftEvents.length, protectedSavings: proofSummary.protectedMonthlySavings ?? 0 }, drift.map((row) => ({ outcomeId: row.outcomeId, monitoringState: row.monitoringState })), driftEvents.map((event) => event.eventId)),
    ]
    const conf: Record<string, EvidenceConfidence> = {
      Discovery: confidence(Boolean(snapshot), health.warnings?.length ?? 0, health.blockers?.length ?? 0),
      Trust: confidence((trust.globalTrustScore ?? 0) > 0, trust.warnings?.length ?? 0, trust.blockers?.length ?? 0),
      Opportunity: confidence(opportunities.length > 0 || (playbooks.candidates ?? 0) > 0, 0, playbooks.state === 'FAILED' ? 1 : 0),
      Approval: confidence(approvalEvents.length > 0, 0, 0),
      Execution: confidence(executionEvents.length > 0, 0, 0),
      Verification: confidence(verificationEvents.length > 0 || (proofSummary.verifiedMonthlySavings ?? 0) > 0, proofSummary.verificationBacklogCount ?? 0, proofSummary.verificationFailedCount ?? 0),
      Outcome: confidence(proofs.length > 0, 0, 0),
      Drift: confidence(drift.length > 0 || driftEvents.length > 0, 0, 0),
    }
    const summary: EvidencePackSummary = { projectedSavings: proofSummary.projectedMonthlySavings ?? opportunities.reduce((sum, opp) => sum + opp.projectedMonthlySavings, 0), approvedSavings: proofSummary.approvedMonthlySavings ?? 0, executedSavings: proofSummary.executedMonthlySavings ?? 0, verifiedSavings: proofSummary.verifiedMonthlySavings ?? 0, protectedSavings: proofSummary.protectedMonthlySavings ?? 0, trustScore: trust.globalTrustScore ?? 0, connectorCoverage: snapshot ? 100 : 0, opportunities: opportunities.length, approvals: approvalEvents.length, executions: executionEvents.length, verificationRate: proofs.length ? Math.round((proofs.filter((proof) => proof.proofState === 'VERIFIED').length / proofs.length) * 100) : 0, driftStatus: drift.some((row) => row.monitoringState === 'DRIFT_DETECTED') ? 'DRIFT_DETECTED' : drift.length ? 'MONITORED' : 'NO_DRIFT_MONITOR' }
    const evidenceRefs = Array.from(new Set(sections.flatMap((row) => row.evidenceRefs)))
    return { evidencePackId: `ep-${scope.toLowerCase()}-${targetId ?? tenantId}-${Date.now()}`, tenantId, generatedAt, generatedBy, scope, status: 'COMPLETE', summary, sections, metrics: { completeness: pct(Object.values(conf)), confidence: conf, counts: { events: events.length, opportunities: opportunities.length, proofs: proofs.length, driftRules: drift.length } }, evidenceRefs, warnings: sections.flatMap((row) => row.findings.filter((finding) => finding.severity === 'WARNING').map((finding) => String(finding.reason ?? finding.warning))), blockers: [...(trust.blockers ?? []), ...(health.blockers ?? [])] }
  }
}

export const evidencePackBuilder = new EvidencePackBuilder()
export const buildTenantEvidencePack = (input: EvidencePackGenerateInput) => evidencePackBuilder.buildTenantEvidencePack(input)
export const buildOpportunityEvidencePack = (input: EvidencePackGenerateInput) => evidencePackBuilder.buildOpportunityEvidencePack(input)
export const buildExecutionEvidencePack = (input: EvidencePackGenerateInput) => evidencePackBuilder.buildExecutionEvidencePack(input)
export const buildOutcomeEvidencePack = (input: EvidencePackGenerateInput) => evidencePackBuilder.buildOutcomeEvidencePack(input)
