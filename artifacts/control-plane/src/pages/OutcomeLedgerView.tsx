import React, { useState } from 'react'
import { Shell } from '../components/layout/Shell'
import { EmptyState, LiveDataError, SectionLabel, StatusPill } from '../components/shared/Foundation'
import { ConfidenceBadge, ExecutiveMetricStrip, ExecutiveSection, Timeline, TimelineEvent, ExecutiveEvidenceBadge } from '../components/executive'
import { DataStateBanner } from '../components/shared/DataStateBanner'
import { useOutcomesData } from '../hooks/useOutcomesData'

function money(value: number | null | undefined) { return value == null ? '—' : `$${Math.round(value).toLocaleString()}` }
function statusPill(status: string) { const s = String(status).toUpperCase(); return s.includes('FAILED') || s.includes('DRIFT') ? 'blocked' : s.includes('VERIFIED') || s.includes('PROTECTED') || s.includes('RETAINED') ? 'verified' : s.includes('EXECUT') ? 'testing' : 'pending' }

const evidenceLabels = [
  ['hasProjectionEvidence', 'Projected evidence'],
  ['hasApprovalEvidence', 'Approval evidence'],
  ['hasExecutionEvidence', 'Execution evidence'],
  ['hasVerificationEvidence', 'Verification evidence'],
  ['hasRetentionEvidence', 'Retention evidence'],
  ['hasDriftProtectionEvidence', 'Drift/protection evidence'],
]

export default function OutcomeLedgerView() {
  const { data, isEmptyLive, dataState, error, refresh } = useOutcomesData()
  const [evidenceId, setEvidenceId] = useState<string | null>(null)
  if (error) return <Shell><LiveDataError error={error} onRetry={refresh} /></Shell>
  if (dataState === 'NOT_CONNECTED') return <Shell><div style={{ padding: 20 }}><DataStateBanner state='NOT_CONNECTED' ctaLabel='Connect Tenant' ctaHref='/connectors' /></div></Shell>
  if (isEmptyLive) return <Shell><div style={{ padding: 20 }}><DataStateBanner state={dataState ?? 'NO_DATA'} /><EmptyState title='No Outcomes Recorded' description='No outcomes have been recorded yet for this tenant. Outcomes will appear here as projected, approved, executed, verified, finance-confirmed, protected, and value leakage evidence accrues.' /></div></Shell>
  const summary = data.proofSummary ?? {}
  const selected = data.ledger.find((item: any) => item.id === evidenceId)
  return <Shell><div style={{ padding: 20 }}><h1>Outcome Ledger</h1>{dataState && dataState !== 'LIVE' && <DataStateBanner state={dataState} />}<a href='/evidence-packs'>Generate Evidence Pack</a> · <a href='/overview'>Executive Value Dashboard</a><p>What value has actually been realised and protected? Financial assets under governance across projected, approved, executed, verified, finance-confirmed, protected and leaked value.</p>
    <ExecutiveMetricStrip columns='repeat(6, 1fr)' metrics={[
      { label: 'Projected', value: money(summary.projectedMonthlySavings ?? data.stats[0]) },
      { label: 'Approved', value: money(summary.approvedMonthlySavings) },
      { label: 'Executed', value: money(summary.executedMonthlySavings) },
      { label: 'Verified', value: money(summary.verifiedMonthlySavings ?? data.stats[1]), hero: true },
      { label: 'Finance Confirmed', value: money(summary.retainedMonthlySavings) },
      { label: 'Protected', value: money(summary.protectedMonthlySavings) },
    ]} />
    <div style={{ marginTop: 8 }}>Value Leakage: {money((summary.verifiedMonthlySavings ?? data.stats[1]) - (summary.projectedMonthlySavings ?? data.stats[0]))} · Verification backlog: {summary.verificationBacklogCount ?? data.stats[3]} · Failed: {summary.verificationFailedCount ?? data.stats[4]} · Drifted: {summary.driftedOutcomeCount ?? data.stats[5]}</div>
    <ExecutiveSection title='Outcome Proof Authority' description={<SectionLabel>Outcome Proof Authority</SectionLabel>}><div style={{ display: 'grid', gridTemplateColumns: '1.3fr .7fr .7fr .7fr .7fr .7fr .7fr .7fr .7fr .7fr', gap: 8, fontSize: 12, fontWeight: 600, marginTop: 10 }}><span>Outcome</span><span>Projected</span><span>Approved</span><span>Executed</span><span>Verified</span><span>Finance Confirmed</span><span>Protected</span><span>Value Leakage</span><span>Confidence</span><span>Proof State</span></div>{data.ledger.map((l: any) => <div key={l.id} style={{ display: 'grid', gridTemplateColumns: '1.3fr .7fr .7fr .7fr .7fr .7fr .7fr .7fr .7fr .7fr', gap: 8, borderTop: 'var(--border-default)', padding: '8px 0', fontSize: 12, alignItems: 'center' }}><button style={{ textAlign: 'left' }} onClick={() => setEvidenceId(l.id)}>{l.action}</button><span>{money(l.projected)}</span><span>{money(l.approved)}</span><span>{money(l.executed)}</span><span>{money(l.verified)}</span><span>{money(l.retained)}</span><span>{money(l.protected)}</span><span>{money(l.variance ?? ((l.verified ?? 0) - (l.projected ?? 0)))}</span><span><ConfidenceBadge value={l.confidence ?? 'LOW'} /></span><span><StatusPill status={statusPill(l.proofState ?? l.verificationStatus ?? l.state) as any} /> {l.proofState ?? l.verificationStatus ?? l.state}</span></div>)}</ExecutiveSection>
    {selected && <ExecutiveSection testId='outcome-evidence-pack' title={`Proof lifecycle · ${selected.action}`} rightSlot={<button onClick={() => setEvidenceId(null)}>Close</button>}><Timeline title='Lifecycle timeline'>{(selected.proofTimeline ?? selected.evidencePack?.proofTimeline ?? []).map((event: any, idx: number) => <TimelineEvent key={`${event.stage ?? idx}-${idx}`} title={event.stage} timestamp={event.occurredAt ?? event.timestamp ?? 'pending'} detail={event.sourceSystem ?? event.description ?? 'Outcome Proof Authority'} />)}</Timeline><h3>Evidence coverage</h3><div style={{ display: 'grid', gap: 6 }}>{evidenceLabels.map(([key, label]) => <div key={key}>{selected.evidenceSummary?.[key] ? '✓' : '⚠'} {label}</div>)}</div><ExecutiveEvidenceBadge label='Evidence' count={evidenceLabels.filter(([key]) => selected.evidenceSummary?.[key]).length} /><h3>Missing evidence flags</h3><div>{evidenceLabels.filter(([key]) => !selected.evidenceSummary?.[key]).map(([, label]) => <div key={label}>{label} missing</div>)}</div><h3>Supporting evidence</h3><pre style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{JSON.stringify(selected.evidencePack?.supportingEvidence ?? selected.evidencePack ?? {}, null, 2)}</pre></ExecutiveSection>}
  </div></Shell>
}
