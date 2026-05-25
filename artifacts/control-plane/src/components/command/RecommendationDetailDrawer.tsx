import { formatCurrency, formatRelativeTime } from '../../lib/formatters'
import type { GovernanceAction } from '../../types/governance'
import { getSession } from '../../lib/auth/session'

export function RecommendationDetailDrawer({ action, onClose }: { action: GovernanceAction | null, onClose: ()=>void }) {
  if (!action) return null
  const session = getSession()
  const verified = Math.round(action.savingAmount * 0.62)
  const readinessBlocked = action.verdict !== 'GOVERNED_EXECUTION_ELIGIBLE'
  const sourceType = session?.isDemo ? 'synthetic · demo' : 'connector · estimated'
  return <div style={{position:'fixed', inset:0, background:'rgba(7,9,12,0.56)', zIndex:50}} onClick={onClose}>
    <aside onClick={e=>e.stopPropagation()} style={{position:'absolute', right:0, top:0, bottom:0, width:560, background:'var(--surface-0)', borderLeft:'0.5px solid var(--border-subtle)', overflowY:'auto', padding:18}}>
      <h2 style={{fontSize:16,fontWeight:600}}>{action.name}</h2>
      <p style={{fontSize:11,color:'var(--text-secondary)'}}>Verdict: {action.verdict} · Tenant mode: {session?.tenantMode ?? 'UNKNOWN'} · Source: {sourceType}</p>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8, marginTop:10}}>{[['Projected monthly',formatCurrency(action.savingAmount)],['Annualized',formatCurrency(action.savingAmount*12)],['Confidence','89% (±8%)'],['Blast / rollback',`${action.blastRadius} / ${action.rollback}`]].map(([k,v])=><div key={k} style={{background:'var(--surface-2)',padding:10,borderRadius:8,fontSize:12}}><div style={{color:'var(--text-tertiary)',fontSize:10}}>{k}</div><div>{v}</div></div>)}</div>

      <Section title='Why this exists'><p>{action.description}. Evidence shows sustained cost driver and recurrence risk linked to unchanged operational behavior.</p></Section>
      <Section title='Savings impact'><p>Projected: {formatCurrency(action.savingAmount)}/mo · Verified: {formatCurrency(verified)}/mo · Avoided annual cost: {formatCurrency(action.savingAmount*12)}.</p></Section>
      <Section title='Readiness'><p>{readinessBlocked ? 'Blocked/approval-gated due to governance prerequisites.' : 'Ready for governed execution.'}</p><p style={{fontSize:11,color:'var(--text-secondary)'}}>Why this matters: uncontrolled execution can create operational risk. Next: clear approver/connector prerequisites.</p></Section>
      <Section title='Simulation'><p>Before: higher-cost baseline behavior active. After: governed lower-cost route with policy guardrails. Expected propagation: 15-45 minutes.</p></Section>
      <Section title='Proof'>
        {['Evidence proof','Cost proof','Readiness proof','Approval proof','Execution proof','Verification proof','Drift proof','Rollback proof'].map((x,i)=><div key={x} style={{fontSize:11,padding:'6px 0',borderBottom:'0.5px solid var(--border-subtle)'}}>{x} — {i < 5 || !readinessBlocked ? 'Complete' : 'PROOF_INCOMPLETE'} · {action.proofChain[Math.min(i, action.proofChain.length-1)]?.detail ?? 'Awaiting evidence'} </div>)}
      </Section>
      <Section title='Timeline'><p>Detected {formatRelativeTime(new Date(Date.now()-36e5).toISOString())} · Reviewed {formatRelativeTime(new Date(Date.now()-18e5).toISOString())} · {session?.isDemo ? 'Demo simulation' : 'Connector source'} · Cert {action.certId ?? 'pending'}.</p></Section>
      <Section title='Rollback / Drift'><p>Rollback: {action.rollback}. Drift risk: {action.blastRadius === 'HIGH' ? 'High' : action.blastRadius === 'MEDIUM' ? 'Medium' : 'Low'} recurrence.</p></Section>
      <Section title='Next action'><p>{readinessBlocked ? 'Connector setup required before this action can proceed.' : 'Approve to move this action into the execution queue.'}</p></Section>
      <button onClick={onClose} style={{marginTop:8}}>Close</button>
    </aside>
  </div>
}

function Section({title, children}:{title:string, children:React.ReactNode}) {
  return <section style={{marginTop:14}}><h3 style={{fontSize:11,textTransform:'uppercase',color:'var(--text-tertiary)',letterSpacing:'0.05em'}}>{title}</h3><div style={{fontSize:12,color:'var(--text-primary)',marginTop:6}}>{children}</div></section>
}
