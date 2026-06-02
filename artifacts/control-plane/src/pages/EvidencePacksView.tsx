import { Shell } from '../components/layout/Shell'
import { LiveDataError, SectionLabel, StatusPill } from '../components/shared/Foundation'
import { useEvidencePacks } from '../hooks/useEvidencePacks'

function money(value: number) { return `$${Math.round(Number(value ?? 0)).toLocaleString()}` }
function status(value: string) { return value === 'COMPLETE' ? 'ready' : value === 'FAILED' ? 'blocked' : 'pending' }

export default function EvidencePacksView() {
  const { data, loading, error, refresh, generate } = useEvidencePacks()
  if (error) return <Shell><LiveDataError error={error} onRetry={refresh} /></Shell>
  const summary = data.summary ?? {}
  const coverage = data.coverage ?? {}
  const packs = data.packs ?? []
  return <Shell><div style={{ padding: 20, display: 'grid', gap: 16 }}>
    <header><SectionLabel>Evidence Pack Authority</SectionLabel><h1>Evidence Packs</h1><button disabled={loading} onClick={() => void generate('TENANT')}>Generate Evidence Pack</button><div data-testid='executive-evidence-pack'>Executive Evidence Pack: generated packs from the Executive Value Dashboard appear here.</div></header>
    <section data-testid='evidence-pack-summary' style={{ border: 'var(--border-default)', borderRadius: 10, padding: 12 }}><SectionLabel>Executive Summary</SectionLabel><div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}><div>Projected {money(summary.projectedSavings)}</div><div>Approved {money(summary.approvedSavings)}</div><div>Executed {money(summary.executedSavings)}</div><div>Verified {money(summary.verifiedSavings)}</div><div>Protected {money(summary.protectedSavings)}</div></div></section>
    <section data-testid='evidence-pack-coverage' style={{ border: 'var(--border-default)', borderRadius: 10, padding: 12 }}><SectionLabel>Evidence Coverage</SectionLabel>{['Discovery','Trust','Opportunity','Approval','Execution','Verification','Outcome','Drift'].map((key) => <div key={key}>{key}: {coverage[key] ?? 'LOW'}</div>)}</section>
    <section data-testid='evidence-pack-list' style={{ border: 'var(--border-default)', borderRadius: 10, padding: 12 }}><SectionLabel>Generated Packs</SectionLabel><div style={{ display: 'grid', gridTemplateColumns: '1.4fr .6fr 1fr .7fr .8fr 2fr', gap: 8, fontWeight: 600 }}><span>Pack</span><span>Scope</span><span>Generated</span><span>Status</span><span>Completeness</span><span>Actions</span></div>{packs.map((pack: any) => <div key={pack.evidencePackId} style={{ display: 'grid', gridTemplateColumns: '1.4fr .6fr 1fr .7fr .8fr 2fr', gap: 8, padding: '8px 0', borderTop: 'var(--border-default)' }}><span>{pack.evidencePackId}</span><span>{pack.scope}</span><span>{pack.generatedAt}</span><span><StatusPill status={status(pack.status) as any} /> {pack.status}</span><span>{pack.metrics?.completeness ?? 0}%</span><span><a href={`/api/evidence-packs/${pack.evidencePackId}/json`}>Export JSON</a> · <a href={`/api/evidence-packs/${pack.evidencePackId}/pdf`}>Export PDF</a> · <a href={`/api/evidence-packs/${pack.evidencePackId}/audit`}>Export Audit Package</a> · <button>View</button></span></div>)}</section>
  </div></Shell>
}
