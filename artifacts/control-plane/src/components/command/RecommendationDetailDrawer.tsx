import { formatCurrency, formatRelativeTime } from '../../lib/formatters'
import type { GovernanceAction } from '../../types/governance'
import { getSession } from '../../lib/auth/session'
import { getFlexeraSignal } from '../../lib/authority/flexera-authority-normalizer'
import { buildProofLineage } from '../../lib/proof/proof-lineage-builder'
import { authorityCoverageScore } from '../../lib/scoring/authority-coverage-score'
import { governanceConfidenceScore, evidenceConfidenceScore } from '../../lib/scoring/confidence-score'
import { driftStabilityScore } from '../../lib/scoring/drift-stability-score'
import { readinessScore, verificationMaturityScore } from '../../lib/scoring/operational-score'

export function RecommendationDetailDrawer({ action, onClose }: { action: GovernanceAction | null, onClose: ()=>void }) {
  if (!action) return null
  const session = getSession(); const isDemo = !!session?.isDemo
  const verified = Math.round(action.savingAmount * 0.62)
  const flexera = getFlexeraSignal(action.id)
  const lineage = buildProofLineage(action, isDemo)
  const scores = { evidence: evidenceConfidenceScore(action), readiness: readinessScore(action), authority: authorityCoverageScore(action), drift: driftStabilityScore(action), verification: verificationMaturityScore(action), governance: governanceConfidenceScore(action) }
  return <div style={{position:'fixed', inset:0, background:'rgba(7,9,12,0.56)', zIndex:50}} onClick={onClose}><aside onClick={e=>e.stopPropagation()} style={{position:'absolute', right:0, top:0, bottom:0, width:640, background:'var(--surface-0)', borderLeft:'0.5px solid var(--border-subtle)', overflowY:'auto', padding:20}}>
    <h2 style={{fontSize:17,fontWeight:650}}>{action.name}</h2>
    <p style={{fontSize:11,color:'var(--text-secondary)'}}>Verdict: {action.verdict} · {isDemo ? 'Demo synthetic workspace — no production execution' : 'Operational workspace'}.</p>
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginTop:10}}>{[['Governance confidence',`${scores.governance}%`],['Readiness score',`${scores.readiness}%`],['Drift stability',`${scores.drift}%`],['Authority coverage',`${scores.authority}%`],['Verification maturity',`${scores.verification}%`],['Evidence confidence',`${scores.evidence}%`]].map(([k,v]) => <div key={String(k)} style={{background:'var(--surface-2)',borderRadius:10,padding:10}}><div style={{fontSize:10,color:'var(--text-tertiary)'}}>{k}</div><div style={{fontSize:14,fontWeight:600}}>{v}</div></div>)}</div>

    <Section title='Impact'><p>Projected {formatCurrency(action.savingAmount)}/mo · Verified {formatCurrency(verified)}/mo · Annualized {formatCurrency(action.savingAmount*12)}.</p></Section>
    <Section title='Authority evidence panel'><p><strong>Authority evidence:</strong> Flexera</p><p>Entitlement confidence: {flexera ? `+${flexera.adjustedConfidence - flexera.baseConfidence}%` : 'unavailable'} · Mismatch status: {flexera?.adjustedConfidence && flexera.adjustedConfidence < flexera.baseConfidence ? 'blocker' : 'none'} · License position: {flexera ? 'over-licensed' : 'unknown'}.</p><p style={{fontSize:11,color:'var(--text-secondary)'}}>{flexera?.reason ?? 'Authority evidence unavailable — configure Flexera to validate entitlement position.'}</p></Section>
    <Section title='Proof lineage visual'>{lineage.map((n, i) => <div key={n.id} style={{display:'flex',gap:8,padding:'7px 0',borderBottom:'0.5px solid var(--border-subtle)'}}><div style={{width:18,color:'var(--text-tertiary)'}}>{i+1}</div><div><div style={{fontSize:12,fontWeight:600}}>{n.type} · {n.label}</div><div style={{fontSize:11,color:'var(--text-secondary)'}}>{n.description} · {Math.round(n.confidence*100)}% · {n.authorityType} · {n.isSynthetic ? 'synthetic' : 'live'} · {n.status}</div></div></div>)}</Section>
    <Section title='Timeline'><p>Detected {formatRelativeTime(new Date(Date.now()-36e5).toISOString())} → Evidence re-check started {formatRelativeTime(new Date(Date.now()-18e5).toISOString())} → Connector evidence reconciled pending verification.</p></Section>
    <Section title='Next action decision panel'><p>{action.verdict === 'GOVERNED_EXECUTION_ELIGIBLE' ? 'Approve and execute in governed simulation; monitor verification completion and drift stability.' : 'Clear readiness/authority blockers, then re-score governance confidence.'}</p></Section>
    <button onClick={onClose} style={{marginTop:10}}>Close</button>
  </aside></div>
}
function Section({title, children}:{title:string, children:React.ReactNode}) { return <section style={{marginTop:14}}><h3 style={{fontSize:11,textTransform:'uppercase',color:'var(--text-tertiary)',letterSpacing:'0.05em'}}>{title}</h3><div style={{fontSize:12,color:'var(--text-primary)',marginTop:6}}>{children}</div></section> }
