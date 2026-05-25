import { useState } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { ChevronDown } from 'lucide-react'
import { VerdictBadge } from '../shared/VerdictBadge'
import { ProofPanel } from './ProofPanel'
import { RecommendationDetailDrawer } from './RecommendationDetailDrawer'
import { formatCurrency } from '../../lib/formatters'
import type { GovernanceAction, BlastRadius, RollbackClass } from '../../types/governance'
import { ConfirmDialog } from '../../lib/interaction/confirm-dialog'
import { isDemoMode } from '../../lib/demo/demo-action-policy'
import { emitOperationEvent } from '../../lib/operations/operation-store'
import { getActionPermission } from '../../lib/interaction/action-permissions'

function BlastBadge({ level }: { level: BlastRadius }) { const color = level === 'LOW' ? 'var(--c-teal-600)' : level === 'MEDIUM' ? 'var(--c-amber-600)' : 'var(--c-red-600)'; return <span style={{ fontSize: 12, color, fontWeight: 500 }}>{level.charAt(0) + level.slice(1).toLowerCase()}</span> }
function RollbackPill({ level }: { level: RollbackClass }) { const cfg = { FULL:{ bg:'var(--c-gray-50)',text:'var(--c-gray-600)' }, PARTIAL:{ bg:'var(--c-amber-50)',text:'var(--c-amber-600)' }, NONE:{ bg:'var(--c-red-50)',text:'var(--c-red-600)' } }[level]; return <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 10, background: cfg.bg, color: cfg.text }}>{level.charAt(0)+level.slice(1).toLowerCase()}</span> }

export function ActionTable({ actions }: { actions: GovernanceAction[] }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<GovernanceAction | null>(null)
  const [status, setStatus] = useState<Record<string, string>>({})
  const [reviewing, setReviewing] = useState<GovernanceAction | null>(null)

  return <div style={{ background:'var(--surface-0)', border:'0.5px solid var(--border-subtle)', borderRadius:12, overflow:'hidden' }}>
    <div style={{ display:'grid', gridTemplateColumns:'2fr 0.9fr 1.2fr 0.8fr 0.7fr 0.7fr', padding:'8px 16px', background:'var(--surface-2)', borderBottom:'0.5px solid var(--border-subtle)' }}>{['Action','Saving','Verdict','Blast','Rollback',''].map(h=><span key={h} style={{fontSize:10,color:'var(--text-tertiary)'}}>{h}</span>)}</div>
    <TooltipProvider>{actions.map((action,i)=>{ const isOpen=openId===action.id; return <div key={action.id} style={{ borderBottom: i < actions.length - 1 ? '0.5px solid var(--border-subtle)' : 'none' }}>
      <div onClick={()=>setOpenId(isOpen?null:action.id)} style={{display:'grid',gridTemplateColumns:'2fr 0.9fr 1.2fr 0.8fr 0.7fr 0.7fr',padding:'11px 16px',cursor:'pointer',background:isOpen?'var(--surface-2)':'transparent'}} onMouseEnter={(e)=>{if(!isOpen)e.currentTarget.style.background='var(--surface-1)'}} onMouseLeave={(e)=>{if(!isOpen)e.currentTarget.style.background='transparent'}}>
      <div><p style={{fontSize:13,fontWeight:500}}>{action.name}</p><p style={{fontSize:11}}>{action.description}</p>{status[action.id] && <p style={{fontSize:10,color:'var(--text-secondary)'}}>{status[action.id]}</p>}</div>
      <div>{formatCurrency(action.savingAmount)}/mo</div><div><VerdictBadge verdict={action.verdict} /></div><Tooltip><TooltipTrigger asChild><div><BlastBadge level={action.blastRadius}/></div></TooltipTrigger><TooltipContent>Blast radius = expected operational impact if action is executed.</TooltipContent></Tooltip><Tooltip><TooltipTrigger asChild><div><RollbackPill level={action.rollback}/></div></TooltipTrigger><TooltipContent>Rollback = whether Certen has a governed reversal path.</TooltipContent></Tooltip>
      <div style={{display:'flex',justifyContent:'flex-end'}}>
      {action.verdict === 'GOVERNED_EXECUTION_ELIGIBLE' && (() => { const permission = getActionPermission({ role: 'OPERATOR', tenantMode: isDemoMode() ? 'DEMO' : 'PRODUCTION', actionType: 'APPROVE', liveExecutionEnabled: true }); return <button disabled={!permission.canRun} title={permission.disabledReason ?? 'Unavailable'} onClick={e=>{e.stopPropagation(); setConfirming(action)}}>{permission.canRun ? 'Approve' : 'Blocked'}</button> })()}
      {action.verdict !== 'GOVERNED_EXECUTION_ELIGIBLE' && <button onClick={e=>{e.stopPropagation(); setReviewing(action); setOpenId(action.id); emitOperationEvent({ type: 'RECOMMENDATION_REVIEWED', entityId: action.id, timestamp: new Date().toISOString(), demo: isDemoMode(), message: 'Recommendation reviewed from command table.' })}}>Review</button>}
      <span title='Expand proof and governance evidence'><ChevronDown size={14} /></span>
        <RecommendationDetailDrawer action={reviewing} onClose={() => setReviewing(null)} />
  </div></div>
      {isOpen && <ProofPanel steps={action.proofChain} certId={action.certId} verdict={action.verdict} />}
      <RecommendationDetailDrawer action={reviewing} onClose={() => setReviewing(null)} />
  </div>})}
    </TooltipProvider>
    <ConfirmDialog open={!!confirming} title='Approve action' body={`Approve ${confirming?.name}. ${isDemoMode() ? 'Demo approval simulated.' : 'Will call approval endpoint.'}`} confirmText='Approve' onCancel={()=>setConfirming(null)} onConfirm={()=>{ if (confirming) { const demo = isDemoMode(); setStatus(prev=>({ ...prev, [confirming.id]: demo ? 'Demo approval recorded — no production action taken.' : 'Approval endpoint not available for this action type.' })); if (demo) { emitOperationEvent({ type: 'RECOMMENDATION_APPROVED', entityId: confirming.id, timestamp: new Date().toISOString(), demo, message: 'Demo approval recorded.' }); emitOperationEvent({ type: 'EXECUTION_QUEUED', entityId: confirming.id, timestamp: new Date().toISOString(), demo, message: 'Queued for demo execution.' }); emitOperationEvent({ type: 'AUDIT_EVENT_CREATED', entityId: confirming.id, timestamp: new Date().toISOString(), demo, message: 'Demo audit event created.' }); emitOperationEvent({ type: 'INTELLIGENCE_METRICS_CHANGED', entityId: confirming.id, timestamp: new Date().toISOString(), demo, message: 'Savings funnel updated from approval.' }); } else { emitOperationEvent({ type: 'EXECUTION_BLOCKED', entityId: confirming.id, timestamp: new Date().toISOString(), demo, message: 'Approval endpoint unavailable.' }); } } setConfirming(null) }} />
    <RecommendationDetailDrawer action={reviewing} onClose={() => setReviewing(null)} />
  </div>
}
