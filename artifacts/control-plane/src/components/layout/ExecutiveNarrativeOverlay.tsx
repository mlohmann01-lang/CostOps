import { updateDemoSession, useDemoSession } from '../../lib/operations/demo-session'

const STAGES = [
  ['Waste Visibility', 'Certen continuously identifies operational inefficiencies across AI, SaaS, Cloud, and IT environments.', 'Connector Hub · Intelligence trends · Identified savings'],
  ['Governance', 'Actions are not executed blindly. Certen governs readiness, approval, rollback, and blast radius before any action proceeds.', 'Recommendation drawer · Readiness · Approval · Rollback'],
  ['Execution', 'Approved actions move into governed execution workflows with verification and audit continuity.', 'Execution page · Verification pending · Audit references'],
  ['Proof & Verification', 'Savings are not considered realized until Certen verifies the operational outcome.', 'Proof chain · Projected vs verified · Drift detection'],
  ['Drift Prevention', 'Certen continuously monitors for recurrence, degradation, and rollback risk to prevent economic drift from returning.', 'Drift · Connector freshness · Recurrence risk'],
] as const

export function ExecutiveNarrativeOverlay() {
  const session = useDemoSession()
  const step = Math.min(session.walkthroughStep, STAGES.length - 1)
  if (session.dismissedNarrative) return null
  const [title, body, highlights] = STAGES[step]
  return <div style={{position:'fixed', inset:0, background:'rgba(8,10,14,.5)', zIndex:60, display:'grid', placeItems:'center'}}>
    <div style={{width:640,background:'var(--surface-0)',borderRadius:14,padding:20,border:'0.5px solid var(--border-subtle)'}}>
      <p style={{fontSize:11,color:'var(--text-tertiary)',textTransform:'uppercase'}}>Executive narrative {step + 1}/{STAGES.length}</p>
      <h2 style={{marginTop:6}}>{title}</h2><p style={{fontSize:13,color:'var(--text-secondary)'}}>{body}</p>
      <p style={{fontSize:12,marginTop:10}}><strong>Highlights:</strong> {highlights}</p>
      <div style={{display:'flex',gap:8,marginTop:14}}>
        <button onClick={() => updateDemoSession({ walkthroughStep: Math.max(0, step - 1) })} disabled={step===0}>Back</button>
        <button onClick={() => updateDemoSession({ walkthroughStep: step === STAGES.length - 1 ? 0 : step + 1 })}>{step===STAGES.length-1?'Restart':'Next'}</button>
        <button onClick={() => updateDemoSession({ dismissedNarrative: true })}>Dismiss</button>
      </div>
    </div>
  </div>
}
