import type { ConnectorConfig } from '../../types/connector'

const STEPS = ['Choose connector','Access requirements','Setup method','Readiness check','First sync']

export function ConnectorSetupWizard({ open, onClose, initialConnector }: { open:boolean, onClose:()=>void, initialConnector?: ConnectorConfig | null }) {
  if (!open) return null
  return <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.35)',zIndex:40}} onClick={onClose}><div onClick={e=>e.stopPropagation()} style={{background:'var(--surface-0)',width:620,maxWidth:'92vw',margin:'5% auto',padding:16,borderRadius:12,border:'0.5px solid var(--border-subtle)'}}>
    <h3>Connector Setup Wizard</h3><p style={{fontSize:12,color:'var(--text-secondary)'}}>Demo workspace setup uses sample connector telemetry.</p>
    {STEPS.map((s,i)=><div key={s} style={{marginTop:10,padding:10,border:'0.5px solid var(--border-subtle)',borderRadius:8}}><strong>{i+1}. {s}</strong><p style={{fontSize:12,marginTop:4}}>{stepText(i, initialConnector?.name ?? 'OpenAI')}</p></div>)}
    <button onClick={onClose} style={{marginTop:12}}>Done</button>
  </div></div>
}

function stepText(i:number, name:string) {
  if (i===0) return `${name} selected. ServiceNow ITAM / Flexera: Not configured yet; request setup available.`
  if (i===1) return `${name}: read-only telemetry. No production writes by default in demo.`
  if (i===2) return `Methods: API key / OAuth / manual export / coming soon. Demo: Use sample connector.`
  if (i===3) return `Readiness states: connected, degraded, missing permissions, stale evidence, unsupported, not configured.`
  return `First sync: Demo simulation only. Shows sync status, freshness, and trust score.`
}
