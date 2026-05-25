import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { VerdictBadge } from '../shared/VerdictBadge'
import { ProofPanel } from './ProofPanel'
import { formatCurrency } from '../../lib/formatters'
import type { GovernanceAction, BlastRadius, RollbackClass } from '../../types/governance'
import { ConfirmDialog } from '../../lib/interaction/confirm-dialog'
import { isDemoMode } from '../../lib/demo/demo-action-policy'

function BlastBadge({ level }: { level: BlastRadius }) { const color = level === 'LOW' ? 'var(--c-teal-600)' : level === 'MEDIUM' ? 'var(--c-amber-600)' : 'var(--c-red-600)'; return <span style={{ fontSize: 12, color, fontWeight: 500 }}>{level.charAt(0) + level.slice(1).toLowerCase()}</span> }
function RollbackPill({ level }: { level: RollbackClass }) { const cfg = { FULL:{ bg:'var(--c-gray-50)',text:'var(--c-gray-600)' }, PARTIAL:{ bg:'var(--c-amber-50)',text:'var(--c-amber-600)' }, NONE:{ bg:'var(--c-red-50)',text:'var(--c-red-600)' } }[level]; return <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 10, background: cfg.bg, color: cfg.text }}>{level.charAt(0)+level.slice(1).toLowerCase()}</span> }

export function ActionTable({ actions }: { actions: GovernanceAction[] }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<GovernanceAction | null>(null)
  const [status, setStatus] = useState<Record<string, string>>({})

  return <div style={{ background:'var(--surface-0)', border:'0.5px solid var(--border-subtle)', borderRadius:12, overflow:'hidden' }}>
    <div style={{ display:'grid', gridTemplateColumns:'2fr 0.9fr 1.2fr 0.8fr 0.7fr 0.7fr', padding:'8px 16px', background:'var(--surface-2)', borderBottom:'0.5px solid var(--border-subtle)' }}>{['Action','Saving','Verdict','Blast','Rollback',''].map(h=><span key={h} style={{fontSize:10,color:'var(--text-tertiary)'}}>{h}</span>)}</div>
    {actions.map((action,i)=>{ const isOpen=openId===action.id; return <div key={action.id} style={{ borderBottom: i < actions.length - 1 ? '0.5px solid var(--border-subtle)' : 'none' }}>
      <div onClick={()=>setOpenId(isOpen?null:action.id)} style={{display:'grid',gridTemplateColumns:'2fr 0.9fr 1.2fr 0.8fr 0.7fr 0.7fr',padding:'11px 16px',cursor:'pointer',background:isOpen?'var(--surface-2)':'transparent'}}>
      <div><p style={{fontSize:13,fontWeight:500}}>{action.name}</p><p style={{fontSize:11}}>{action.description}</p>{status[action.id] && <p style={{fontSize:10,color:'var(--text-secondary)'}}>{status[action.id]}</p>}</div>
      <div>{formatCurrency(action.savingAmount)}/mo</div><div><VerdictBadge verdict={action.verdict} /></div><div><BlastBadge level={action.blastRadius}/></div><div><RollbackPill level={action.rollback}/></div>
      <div style={{display:'flex',justifyContent:'flex-end'}}>
      {action.verdict === 'GOVERNED_EXECUTION_ELIGIBLE' && <button onClick={e=>{e.stopPropagation(); setConfirming(action)}}>Approve</button>}
      {action.verdict !== 'GOVERNED_EXECUTION_ELIGIBLE' && <button onClick={e=>{e.stopPropagation(); setOpenId(action.id)}}>Review</button>}
      <ChevronDown size={14} />
      </div></div>
      {isOpen && <ProofPanel steps={action.proofChain} certId={action.certId} verdict={action.verdict} />}
    </div>})}
    <ConfirmDialog open={!!confirming} title='Approve action' body={`Approve ${confirming?.name}. ${isDemoMode() ? 'Demo approval simulated.' : 'Will call approval endpoint.'}`} confirmText='Approve' onCancel={()=>setConfirming(null)} onConfirm={()=>{ if (confirming) setStatus(prev=>({ ...prev, [confirming.id]: isDemoMode() ? 'Demo approval recorded. Action moved to Execution.' : 'approval endpoint not available for this action' })); setConfirming(null) }} />
  </div>
}
