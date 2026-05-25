import { DEMO_SCENARIOS } from '../../lib/demo/scenarios'
import { updateDemoSession, useDemoSession } from '../../lib/operations/demo-session'

export function ScenarioLauncher() {
  const session = useDemoSession()
  return <div style={{background:'var(--surface-0)',border:'0.5px solid var(--border-subtle)',borderRadius:10,padding:12,marginBottom:12}}>
    <div style={{display:'flex',justifyContent:'space-between'}}><strong style={{fontSize:12}}>Scenario launcher (synthetic demo)</strong><span style={{fontSize:11,color:'var(--text-tertiary)'}}>No production execution</span></div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8, marginTop:10}}>
      {DEMO_SCENARIOS.map(s => <button key={s.id} onClick={()=>updateDemoSession({scenarioId:s.id, dismissedNarrative:false, walkthroughStep:0})} style={{textAlign:'left',padding:10,borderRadius:8,border:'0.5px solid var(--border-subtle)',background:session.scenarioId===s.id?'var(--surface-2)':'var(--surface-0)'}}>
        <div style={{fontSize:12,fontWeight:600}}>{s.title}</div>
        <div style={{fontSize:11,color:'var(--text-secondary)'}}>{s.narrative}</div>
      </button>)}
    </div>
  </div>
}
