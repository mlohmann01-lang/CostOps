import React, { useState } from 'react'
import { Shell } from '../components/layout/Shell'
import { EmptyState, LiveDataError, SectionLabel, StatusPill } from '../components/shared/Foundation'
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
  const { data, isEmptyLive, error, refresh } = useOutcomesData()
  const [evidenceId, setEvidenceId] = useState<string | null>(null)
  if (error) return <Shell><LiveDataError error={error} onRetry={refresh} /></Shell>
  if (isEmptyLive) return <Shell><EmptyState title='No outcome proofs yet' description='Outcome proofs will appear here as projected, approved, executed, verified, retained, and protected savings accrue evidence.' /></Shell>
  const summary = data.proofSummary ?? {}
  const selected = data.ledger.find((item: any) => item.id === evidenceId)
  return <Shell><div style={{ padding: 20 }}><h1>Outcome Proof Console</h1><a href='/evidence-packs'>Generate Evidence Pack</a> · <a href='/executive-value'>Executive Value Dashboard</a><p>Single authority for projected, approved, executed, verified, retained, and protected savings proof.</p>
    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
      <div>Projected<br /><strong>{money(summary.projectedMonthlySavings ?? data.stats[0])}</strong></div>
      <div>Approved<br /><strong>{money(summary.approvedMonthlySavings)}</strong></div>
      <div>Executed<br /><strong>{money(summary.executedMonthlySavings)}</strong></div>
      <div>Verified<br /><strong>{money(summary.verifiedMonthlySavings ?? data.stats[1])}</strong></div>
      <div>Retained<br /><strong>{money(summary.retainedMonthlySavings)}</strong></div>
      <div>Protected<br /><strong>{money(summary.protectedMonthlySavings)}</strong></div>
    </section>
    <div style={{ marginTop: 8 }}>Variance: {money((summary.verifiedMonthlySavings ?? data.stats[1]) - (summary.projectedMonthlySavings ?? data.stats[0]))} · Verification backlog: {summary.verificationBacklogCount ?? data.stats[3]} · Failed: {summary.verificationFailedCount ?? data.stats[4]} · Drifted: {summary.driftedOutcomeCount ?? data.stats[5]}</div>
    <section style={{ border: 'var(--border-default)', borderRadius: 10, padding: 12, marginTop: 14 }}><SectionLabel>Outcome Proof Authority</SectionLabel><div style={{ display: 'grid', gridTemplateColumns: '1.3fr .7fr .7fr .7fr .7fr .7fr .7fr .7fr .7fr .7fr', gap: 8, fontSize: 12, fontWeight: 600, marginTop: 10 }}><span>Outcome</span><span>Projected</span><span>Approved</span><span>Executed</span><span>Verified</span><span>Retained</span><span>Protected</span><span>Variance</span><span>Confidence</span><span>Proof State</span></div>{data.ledger.map((l: any) => <div key={l.id} style={{ display: 'grid', gridTemplateColumns: '1.3fr .7fr .7fr .7fr .7fr .7fr .7fr .7fr .7fr .7fr', gap: 8, borderTop: 'var(--border-default)', padding: '8px 0', fontSize: 12, alignItems: 'center' }}><button style={{ textAlign: 'left' }} onClick={() => setEvidenceId(l.id)}>{l.action}</button><span>{money(l.projected)}</span><span>{money(l.approved)}</span><span>{money(l.executed)}</span><span>{money(l.verified)}</span><span>{money(l.retained)}</span><span>{money(l.protected)}</span><span>{money(l.variance ?? ((l.verified ?? 0) - (l.projected ?? 0)))}</span><span>{l.confidence ?? 'LOW'}</span><span><StatusPill status={statusPill(l.proofState ?? l.verificationStatus ?? l.state) as any} /> {l.proofState ?? l.verificationStatus ?? l.state}</span></div>)}</section>
    {selected && <section data-testid='outcome-evidence-pack' style={{ border: 'var(--border-teal)', borderRadius: 10, padding: 12, marginTop: 14 }}><SectionLabel>Proof lifecycle · {selected.action}</SectionLabel><button onClick={() => setEvidenceId(null)} style={{ float: 'right' }}>Close</button><h3>Lifecycle timeline</h3><div>{(selected.proofTimeline ?? selected.evidencePack?.proofTimeline ?? []).map((event: any, idx: number) => <div key={`${event.stage ?? idx}-${idx}`}>✓ {event.stage} · {event.occurredAt ?? event.timestamp ?? 'pending'} · {event.sourceSystem ?? event.description ?? 'Outcome Proof Authority'}</div>)}</div><h3>Evidence coverage</h3><div>{evidenceLabels.map(([key, label]) => <div key={key}>{selected.evidenceSummary?.[key] ? '✓' : '⚠'} {label}</div>)}</div><h3>Missing evidence flags</h3><div>{evidenceLabels.filter(([key]) => !selected.evidenceSummary?.[key]).map(([, label]) => <div key={label}>{label} missing</div>)}</div><h3>Supporting evidence</h3><pre style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{JSON.stringify(selected.evidencePack?.supportingEvidence ?? selected.evidencePack ?? {}, null, 2)}</pre></section>}
  </div></Shell>
}
