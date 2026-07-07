import { Shell } from '../components/layout/Shell'
import { EmptyState, ExecutivePageHeader, ExecutiveSection, MetricCard, StatusChip } from '../components/executive'
import { demoProtectionOutcomes, getProtectionEvidencePackCompleteness, inferProtectionDecision, program4LiveUnconnectedCopy, program4ProtectionQuestion, protectionCapabilities, summarizeProtectionKpis } from '../lib/program4Protection'
import { useWorkspace } from '../lib/workspaceContext'
import type { ProtectionOutcome } from '../lib/program4Protection'

const money = (value?: number) => value === undefined ? 'Unknown' : new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
const tone = (value: string) => /BLOCK|FAILED|REQUIRED|DRIFTING|HARMFUL/i.test(value) ? 'danger' : /REVIEW|PARTIAL|PENDING|READY/i.test(value) ? 'warning' : /VERIFIED|PROTECTED|COMPLETE|PASSED|AVAILABLE/i.test(value) ? 'success' : 'info' as any

export function renderProtectionWorkspaceState(outcomes: ProtectionOutcome[], isDemo = false) {
  const kpis = summarizeProtectionKpis(outcomes)
  return {
    title: 'Protection',
    question: program4ProtectionQuestion,
    emptyLive: !isDemo && outcomes.length === 0,
    hasDemoStory: isDemo && outcomes.some((item) => item.decisionHint === 'PROTECTED') && outcomes.some((item) => item.decisionHint === 'DRIFTING') && outcomes.some((item) => item.decisionHint === 'ROLLBACK_REQUIRED'),
    kpis,
    decisions: outcomes.map((item) => inferProtectionDecision(item).decision),
    evidenceStatuses: outcomes.map((item) => getProtectionEvidencePackCompleteness(item).status),
  }
}

function ProtectionEvidencePack({ outcome }: { outcome: ProtectionOutcome }) {
  const evidence = getProtectionEvidencePackCompleteness(outcome)
  const decision = inferProtectionDecision(outcome)
  return <div style={{ border: 'var(--border-default)', borderRadius: 12, padding: 12, display: 'grid', gap: 6 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><strong>{outcome.executedAction}</strong><StatusChip label={decision.decision} tone={tone(decision.decision) as any} /></div>
    <p style={{ margin: 0 }}>Protection Evidence Pack / Proof Pack: <StatusChip label={evidence.status} tone={tone(evidence.status) as any} /> {decision.reason}</p>
    <p style={{ margin: 0 }}>Source: {outcome.sourceSystem} · Owner: {outcome.owner ?? 'Missing owner'} · Confidence: {outcome.confidence ?? 'Unknown'}%</p>
    <p style={{ margin: 0 }}>Pre-state: {outcome.preState ?? 'Missing'} · Post-state: {outcome.postState ?? 'Missing'} · Verification: {outcome.verificationResult ?? 'Missing'}</p>
    <p style={{ margin: 0 }}>Protected outcome: {outcome.protectedOutcome ?? 'Missing'} · Drift: {outcome.driftStatus ?? 'Missing'} · Rollback: {outcome.rollbackStatus ?? 'Missing'}</p>
    <p style={{ margin: 0 }}>Timestamp: {outcome.timestamp ?? 'Missing'} · Lineage: {outcome.lineage ?? 'Missing'} · Trust/proof reference: {outcome.trustProofReference ?? 'Missing'}</p>
    {evidence.missing.length > 0 && <p style={{ margin: 0 }}>Missing evidence: {evidence.missing.join(', ')}</p>}
  </div>
}

export default function ProtectionWorkspace({ section }: { section?: string }) {
  const workspace = useWorkspace()
  const isDemo = workspace.mode === 'demo'
  const selected = section?.toLowerCase()
  const allOutcomes = isDemo ? demoProtectionOutcomes : []
  const outcomes = selected && selected !== 'evidence'
    ? allOutcomes.filter((item) => item.id.includes(selected) || item.executedAction.toLowerCase().includes(selected) || item.driftStatus?.toLowerCase().includes(selected) || item.rollbackStatus?.toLowerCase().includes(selected) || item.sourceSystem.toLowerCase().includes(selected))
    : allOutcomes
  const kpis = summarizeProtectionKpis(outcomes)
  return <Shell><main style={{ padding: '24px clamp(18px,3vw,34px)', display: 'grid', gap: 16, maxWidth: 1480, margin: '0 auto' }}>
    <ExecutivePageHeader title={selected ? `Protection — ${selected.toUpperCase()}` : 'Protection'} subtitle={`${program4ProtectionQuestion} One executive workspace for drift, verification, protection policies, rollback, Outcome Protection and trust evidence after execution.`} chips={[{ label: `Tenant mode: ${isDemo ? 'Demo' : 'Live'}`, tone: isDemo ? 'info' : 'warning' }, { label: 'Protection Evidence Pack / Proof Pack', tone: 'info' }, { label: isDemo ? 'Connected post-execution demo story' : 'LIVE_UNCONNECTED', tone: isDemo ? 'success' : 'warning' }]} />
    {!isDemo && <EmptyState title='Protection unavailable.' description={program4LiveUnconnectedCopy('Protection')} />}

    <ExecutiveSection title='Unified Protection Workspace' description='One product surface across Verification, Drift, Rollback, Outcome Protection and Trust. No demo executions, verifications, drift, rollback status, protected value, trust evidence, outcomes or confidence are shown in LIVE_UNCONNECTED.'>{protectionCapabilities.map((capability) => <a key={capability.key} href={capability.route} style={{ display: 'inline-flex', margin: '0 8px 8px 0', border: 'var(--border-default)', borderRadius: 999, padding: '8px 12px', color: 'var(--teal)', fontWeight: 800 }}>{capability.label}</a>)}</ExecutiveSection>

    <section data-testid='protection-kpis' style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(180px,1fr))', gap: 12 }}>
      <MetricCard label='Verified Outcomes' value={kpis.verifiedOutcomes} description='Executed outcomes with verified post-state.' />
      <MetricCard label='Protected Outcomes' value={kpis.protectedOutcomes} description='Verified outcomes with active protection evidence.' />
      <MetricCard label='Drift Detected' value={kpis.driftDetected} description='Post-execution state changed.' />
      <MetricCard label='Rollback Ready' value={kpis.rollbackReady} description='Rollback exists and is available.' />
      <MetricCard label='Rollback Required' value={kpis.rollbackRequired} description='Failed verification or harmful drift.' />
      <MetricCard label='Failed Verification' value={kpis.failedVerification} description='Verification did not prove the expected state.' />
      <MetricCard label='Value Protected' value={money(kpis.valueProtected)} description='Protected value supported by evidence.' />
      <MetricCard label='Trust Evidence Coverage' value={kpis.trustEvidenceCoverage === undefined ? 'Unknown' : `${kpis.trustEvidenceCoverage}%`} description='Outcomes with trust/proof evidence.' />
      <MetricCard label='Evidence Completeness' value={kpis.evidenceCompleteness === undefined ? 'Unknown' : `${kpis.evidenceCompleteness}%`} description='Complete Protection Evidence Pack rate.' />
    </section>

    <ExecutiveSection title='Protection Outcome List' description='What was executed, verified, protected, drifted, rollback-ready or blocked.'>{outcomes.length ? <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{['Executed action', 'Source', 'Verification', 'Protected outcome', 'Drift', 'Rollback', 'Value', 'Decision', 'Evidence'].map((header) => <th key={header} style={{ textAlign: 'left', padding: 8 }}>{header}</th>)}</tr></thead><tbody>{outcomes.map((outcome) => { const decision = inferProtectionDecision(outcome); const evidence = getProtectionEvidencePackCompleteness(outcome); return <tr key={outcome.id}><td>{outcome.executedAction}</td><td>{outcome.sourceSystem}</td><td>{outcome.verificationResult ?? 'Missing'}</td><td>{outcome.protectedOutcome ?? 'Missing'}</td><td>{outcome.driftStatus ?? 'Missing'}</td><td>{outcome.rollbackStatus ?? 'Missing'}</td><td>{money(outcome.protectedValue)}</td><td><StatusChip label={decision.decision} tone={tone(decision.decision) as any} /></td><td><StatusChip label={evidence.status} tone={tone(evidence.status) as any} /></td></tr> })}</tbody></table></div> : <EmptyState title='No protection outcomes yet.' description={program4LiveUnconnectedCopy(selected ? `Protection — ${selected.toUpperCase()}` : 'Protection')} />}</ExecutiveSection>

    <ExecutiveSection title='Protection Evidence Pack and Proof Pack' description='Reachable evidence packs expose execution, pre/post state, verification, protection, drift, rollback, owner, timestamp, lineage, confidence and trust proof.'>{outcomes.length ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(380px,1fr))', gap: 12 }}>{outcomes.map((outcome) => <ProtectionEvidencePack key={outcome.id} outcome={outcome} />)}</div> : <EmptyState title='No Protection Evidence Packs yet.' description='Evidence packs remain empty until connected execution, verification, drift, rollback and trust sources provide evidence.' />}</ExecutiveSection>

    <ExecutiveSection title='Protection Decision Model' description='VERIFIED · PROTECTED · DRIFTING · ROLLBACK_READY · ROLLBACK_REQUIRED · REVIEW · BLOCKED'><p>Verified execution + evidence → VERIFIED. Verified outcome + protection evidence → PROTECTED. Post-execution state changed → DRIFTING. Rollback available → ROLLBACK_READY. Harmful drift or failed verification → ROLLBACK_REQUIRED. Incomplete evidence → REVIEW. Missing critical evidence → BLOCKED.</p></ExecutiveSection>
  </main></Shell>
}
