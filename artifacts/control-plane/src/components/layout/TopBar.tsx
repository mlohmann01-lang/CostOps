import { ShieldCheck, Bell } from 'lucide-react'

export function TopBar() {
  return <header style={{ height: 44, borderBottom: 'var(--border-default)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px' }}>
    <div style={{display:'flex',alignItems:'center',gap:8}}><ShieldCheck size={14}/><strong>Certen</strong></div>
    <div style={{display:'flex',alignItems:'center',gap:10}}><span style={{fontSize:11,color:'var(--teal)'}}>Data trust 91%</span><Bell size={14}/><span style={{width:22,height:22,borderRadius:'50%',background:'var(--teal-bg)',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:11}}>D</span></div>
  </header>
}
