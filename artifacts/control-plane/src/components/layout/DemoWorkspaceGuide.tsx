import { useState } from 'react'
import { getSession } from '../../lib/auth/session'

const STEPS = [
  'Welcome: This is a synthetic demo workspace. No production systems are connected.',
  'Review Eligible Savings in Command and open the top recommendation with Review.',
  'Inspect Proof chain and readiness status.',
  'Approve action, confirm modal, and move to queue.',
  'Watch execution queue and verification state in Execution.',
  'View Intelligence for funnel, spend inflection, and domain breakdown.',
  'Ask Certen beta: “What changed today?”',
]

export function DemoWorkspaceGuide() {
  const s = getSession(); const [open, setOpen] = useState(true)
  if (!s?.isDemo || !open) return null
  return <div style={{background:'var(--c-amber-50)',border:'0.5px solid var(--c-amber-400)',borderRadius:10,padding:12,marginBottom:14}}>
    <div style={{display:'flex',justifyContent:'space-between'}}><strong style={{fontSize:12}}>Demo Workspace Guide</strong><button onClick={()=>setOpen(false)} style={{fontSize:11}}>Dismiss</button></div>
    <ol style={{margin:'8px 0 0 16px',fontSize:11,color:'var(--text-secondary)'}}>{STEPS.map(x=><li key={x} style={{marginBottom:4}}>{x}</li>)}</ol>
  </div>
}
