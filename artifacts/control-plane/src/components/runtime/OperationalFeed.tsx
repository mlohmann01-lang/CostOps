import { useState, useSyncExternalStore } from 'react'
import { Link } from 'wouter'
import { getRealityFeed, subscribeRealityFeed } from '../../lib/runtime/reality-engine'

export function OperationalFeed() {
  const [paused, setPaused] = useState(false)
  const events = useSyncExternalStore(subscribeRealityFeed, getRealityFeed, getRealityFeed).slice(0, 8)
  const color = (s: string) => s==='success'?'var(--c-teal-600)':s==='warning'?'var(--c-amber-600)':s==='critical'?'var(--c-red-600)':'var(--c-blue-600)'
  return <div style={{background:'var(--surface-0)',border:'0.5px solid var(--border-subtle)',borderRadius:10,padding:10,marginBottom:12}}>
    <div style={{display:'flex',justifyContent:'space-between'}}><strong style={{fontSize:12}}>Operational feed (demo synthetic)</strong><button onClick={()=>setPaused(!paused)} style={{fontSize:11}}>{paused?'Resume':'Pause'}</button></div>
    {events.length===0 && <p style={{fontSize:11,color:'var(--text-secondary)',marginTop:8}}>No runtime events yet. Scenario engine will append events.</p>}
    {!paused && events.map(e => <div key={e.id} style={{fontSize:11,padding:'6px 0',borderBottom:'0.5px solid var(--border-subtle)'}}>
      <span style={{color:color(e.severity),fontWeight:600,marginRight:6}}>{e.severity.toUpperCase()}</span>{e.message} <span style={{color:'var(--text-tertiary)'}}>· {e.domain} · {e.source} · demo</span>
      {e.relatedPath && <Link href={e.relatedPath}><span style={{marginLeft:8,textDecoration:'underline'}}>open</span></Link>}
    </div>)}
  </div>
}
