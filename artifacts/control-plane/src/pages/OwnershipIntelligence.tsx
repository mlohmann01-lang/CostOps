import { FileText } from 'lucide-react'
import { Shell } from '../components/layout/Shell'
import { EmptyState, ExecutiveKpiCard, ExecutivePageShell, ExecutiveSection, RiskBadge, StatusBadge } from '../components/executive'
import { buildOwnershipEvidencePack, summarizeOwnershipKpis, useOwnershipIntelligenceData, type OwnershipFinding } from '../hooks/useOwnershipIntelligenceData'
import { program3OwnershipRoute, type OwnershipDecision } from '../lib/program3OwnershipAccountability'

const money = (value?: number) => typeof value === 'number' ? `$${Math.round(value).toLocaleString()}` : '—'
const pct = (value?: number) => value === undefined ? 'Unknown' : `${Math.round(value)}%`
const label = (value: string) => value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
const decisionTone = (decision: OwnershipDecision) => decision === 'VERIFIED' ? 'success' : decision === 'BLOCKED' || decision === 'ESCALATE' ? 'danger' : 'warning'

const executiveQuestion = 'Who is accountable for every critical technology asset, decision, contract, renewal, spend, and business outcome—and where are ownership gaps creating risk?'

const decisionCopy: Record<OwnershipDecision, string> = {
  VERIFIED: 'Ownership evidence verifies the Responsible Owner, Executive Sponsor, decision authority, and supporting lineage.',
  ASSIGN: 'A Responsible Owner is missing and must be assigned before the asset, contract, spend, or outcome can be governed.',
  REASSIGN: 'The recorded owner is no longer accountable and ownership must be reassigned.',
  REVIEW: 'Shared or conflicting ownership requires executive accountability review.',
  ESCALATE: 'Executive accountability is missing and must be escalated to an Executive Sponsor.',
  BLOCKED: 'Ownership evidence is incomplete, so accountability cannot be certified.',
}

export function renderOwnershipAccountabilityState(data: ReturnType<typeof summarizeOwnershipKpis> extends never ? never : any, isDemo = false) {
  const summary = data.summary ?? {}
  return {
    title: 'Ownership & Accountability',
    question: program3OwnershipRoute.question,
    demoBanner: isDemo ? 'Demo ownership accountability data' : '',
    empty: !isDemo && (data.findings?.length ?? 0) === 0,
    governedAssets: summary.governedAssets ?? 0,
    assetsMissingOwner: summary.assetsMissingOwner ?? 0,
    verifiedOwnership: summary.verifiedOwnership ?? 0,
    renewalOwnerGaps: summary.renewalOwnerGaps ?? 0,
    executiveSponsorshipCoverage: summary.executiveSponsorshipCoverage,
    ownershipConflicts: summary.ownershipConflicts ?? 0,
    highRiskOrphanedAssets: summary.highRiskOrphanedAssets ?? 0,
    evidenceCompleteness: summary.evidenceCompleteness,
    findings: data.findings?.length ?? 0,
    decisions: (data.findings ?? []).map((finding: OwnershipFinding) => finding.decision),
    evidenceStatuses: (data.findings ?? []).map((finding: OwnershipFinding) => buildOwnershipEvidencePack(finding).status),
  }
}

function DecisionBadge({ decision }: { decision: OwnershipDecision }) { return <StatusBadge status={decision} tone={decisionTone(decision) as any} /> }

function OwnershipEvidencePack({ finding }: { finding: OwnershipFinding }) {
  const pack = buildOwnershipEvidencePack(finding)
  return <div style={{ border: 'var(--border-default)', borderRadius: 12, padding: 12, display: 'grid', gap: 6 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><strong>{finding.assetName}</strong><DecisionBadge decision={finding.decision} /></div>
    <p style={{ margin: 0 }}>{finding.decisionReason}</p>
    <p style={{ margin: 0 }}>Evidence Pack / Proof Pack: <StatusBadge status={pack.status} tone={pack.status === 'COMPLETE' ? 'info' : 'warning'} /> {pack.missing.length ? `Missing: ${pack.missing.join(', ')}` : 'Complete accountability evidence available.'}</p>
    <p style={{ margin: 0 }}>Responsible Owner: {finding.responsibleOwner ?? 'Missing'} · Business Owner: {finding.businessOwner ?? 'Missing'} · Technical Owner: {finding.technicalOwner ?? 'Missing'} · Executive Sponsor: {finding.executiveSponsor ?? 'Missing'} · Renewal Owner: {finding.renewalOwner ?? 'Missing'}</p>
    <p style={{ margin: 0 }}>Business unit: {finding.businessUnit ?? 'Missing'} · Cost centre: {finding.costCentre ?? 'Missing'} · Assignment basis: {finding.assignmentBasis ?? 'Missing'} · Decision authority: {finding.decisionAuthority ?? 'Missing'}</p>
    <p style={{ margin: 0 }}>Source system: {finding.sourceSystem ?? 'Missing'} · Timestamp: {finding.timestamp ?? 'Missing'} · Lineage: {finding.lineage ?? 'Missing'} · Outcome/protection linkage: {finding.outcomeProtectionLinkage ?? 'Not applicable'}</p>
  </div>
}

export default function OwnershipIntelligence() {
  const { data, isDemo, isLiveUnconnected, loading, error } = useOwnershipIntelligenceData()
  const summary = summarizeOwnershipKpis(data)
  const missingOwner = data.findings.filter((finding) => finding.decision === 'ASSIGN' || finding.scenario === 'MISSING_OWNER')
  const renewalGaps = data.findings.filter((finding) => finding.scenario === 'RENEWAL_OWNER_MISSING')
  const conflicts = data.findings.filter((finding) => finding.decision === 'REVIEW' || finding.ownerConflict)
  const escalations = data.findings.filter((finding) => finding.decision === 'ESCALATE' || !finding.executiveSponsor)
  return <Shell><ExecutivePageShell title='Ownership & Accountability' subtitle={`${executiveQuestion} This governance authority explains accountability, not just owner names, across assets, AI, applications, contracts, renewals, budgets, outcomes, and decisions.`} badgeLabel={isDemo ? 'Demo accountability evidence' : 'Live accountability evidence'} badgeTone={isDemo ? 'info' : 'warning'}>
    {isDemo && <div data-testid='demo-banner' style={{ border: '1px solid rgba(45,212,191,.24)', borderRadius: 14, padding: 12 }}><strong>Demo ownership accountability data</strong><p style={{ margin: '4px 0 0' }}>Synthetic but coherent accountability scenarios only. No production organisation is connected.</p></div>}
    {isLiveUnconnected && <EmptyState title='Ownership & Accountability unavailable.' description='No live owners, executives, departments, contracts, assets, accountability statuses, recommendations, or organisational structures are shown until connected enterprise systems provide ownership evidence.' />}
    {loading && <p role='status'>Loading Ownership & Accountability evidence…</p>}
    {error && <p role='alert'>Ownership evidence is unavailable. No synthetic ownership information is displayed.</p>}

    <div data-testid='ownership-kpis' style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12 }}>
      <ExecutiveKpiCard label='Governed assets' value={summary.governedAssets} tone='info' />
      <ExecutiveKpiCard label='Assets missing owner' value={summary.assetsMissingOwner} tone='danger' />
      <ExecutiveKpiCard label='Assets with verified ownership' value={summary.verifiedOwnership} tone='info' />
      <ExecutiveKpiCard label='Renewal owner gaps' value={summary.renewalOwnerGaps} tone='danger' />
      <ExecutiveKpiCard label='Executive sponsorship coverage' value={pct(summary.executiveSponsorshipCoverage)} tone='warning' />
      <ExecutiveKpiCard label='Ownership conflicts' value={summary.ownershipConflicts} tone='warning' />
      <ExecutiveKpiCard label='High-risk orphaned assets' value={summary.highRiskOrphanedAssets} tone='danger' />
      <ExecutiveKpiCard label='Evidence completeness' value={pct(summary.evidenceCompleteness)} tone='warning' />
    </div>

    <ExecutiveSection testId='accountability-decision-model' title='Executive Accountability Decision Model'>{(Object.keys(decisionCopy) as OwnershipDecision[]).map((decision) => <p key={decision}><DecisionBadge decision={decision} /> {decisionCopy[decision]}</p>)}</ExecutiveSection>

    <ExecutiveSection testId='ownership-findings-table' title='Ownership Gap and Accountability Risk Register'>{data.findings.length ? <div style={{ overflowX: 'auto' }}><div style={{ minWidth: 1180 }}><div style={{ display: 'grid', gridTemplateColumns: '.9fr .8fr .8fr .8fr .8fr .7fr .7fr .8fr .8fr 1fr', gap: 8, fontWeight: 700, borderBottom: 'var(--border-default)', paddingBottom: 8 }}><span>Asset</span><span>Responsible Owner</span><span>Business Owner</span><span>Technical Owner</span><span>Executive Sponsor</span><span>Renewal Owner</span><span>Risk</span><span>Scenario</span><span>Ownership Decision</span><span>Why action is required</span></div>{data.findings.map((finding) => <div key={finding.id} style={{ display: 'grid', gridTemplateColumns: '.9fr .8fr .8fr .8fr .8fr .7fr .7fr .8fr .8fr 1fr', gap: 8, borderBottom: 'var(--border-default)', padding: '10px 0', alignItems: 'center' }}><strong>{finding.assetName}</strong><span>{finding.responsibleOwner ?? 'Missing'}</span><span>{finding.businessOwner ?? 'Missing'}</span><span>{finding.technicalOwner ?? 'Missing'}</span><span>{finding.executiveSponsor ?? 'Missing'}</span><span>{finding.renewalOwner ?? 'Missing'}</span><RiskBadge level={finding.riskLevel} /><span>{label(finding.scenario)}</span><DecisionBadge decision={finding.decision} /><span>{finding.decisionReason}</span></div>)}</div></div> : <EmptyState title='No ownership evidence yet.' description='Connected identity, HR, contract, finance, and portfolio sources will populate accountability findings.' />}</ExecutiveSection>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
      <ExecutiveSection testId='missing-owner' title='Ownership Gap'>{missingOwner.length ? missingOwner.map((finding) => <p key={finding.id}><strong>{finding.assetName}</strong> · Responsible Owner missing · <DecisionBadge decision={finding.decision} /></p>) : <p>No missing owner evidence.</p>}</ExecutiveSection>
      <ExecutiveSection testId='renewal-owner' title='Renewal Owner'>{renewalGaps.length ? renewalGaps.map((finding) => <p key={finding.id}><strong>{finding.assetName}</strong> · {finding.renewalDate ?? 'No renewal date'} · <DecisionBadge decision={finding.decision} /></p>) : <p>No renewal owner gaps.</p>}</ExecutiveSection>
      <ExecutiveSection testId='executive-sponsor' title='Executive Sponsor'>{escalations.length ? escalations.map((finding) => <p key={finding.id}><strong>{finding.assetName}</strong> · Executive Sponsor {finding.executiveSponsor ?? 'Missing'} · <DecisionBadge decision={finding.decision} /></p>) : <p>Executive accountability coverage is complete for available evidence.</p>}</ExecutiveSection>
      <ExecutiveSection testId='ownership-conflicts' title='Shared Ownership Requiring REVIEW'>{conflicts.length ? conflicts.map((finding) => <p key={finding.id}><strong>{finding.assetName}</strong> · {finding.decisionReason}</p>) : <p>No shared ownership conflicts.</p>}</ExecutiveSection>
    </div>

    <ExecutiveSection testId='ownership-evidence-packs' title='Ownership Evidence Pack / Proof Pack'>{data.findings.length ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(360px,1fr))', gap: 12 }}>{data.findings.map((finding) => <OwnershipEvidencePack key={finding.id} finding={finding} />)}</div> : <EmptyState title='No Ownership Evidence Packs yet.' description='No owner identity, business unit, cost centre, executive sponsor, renewal responsibility, lineage, or outcome linkage is invented without connected evidence.' />}</ExecutiveSection>

    <ExecutiveSection testId='ownership-evidence-refs' title='Evidence References'>{data.evidenceRefs.length ? data.evidenceRefs.map((ref) => <p key={ref}><FileText size={13} /> {ref}</p>) : <p>No evidence references available.</p>}</ExecutiveSection>
  </ExecutivePageShell></Shell>
}
