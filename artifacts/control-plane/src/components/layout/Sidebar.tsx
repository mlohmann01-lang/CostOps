import type { ElementType } from 'react'
import { Link, useLocation } from 'wouter'
import { ShieldCheck, LayoutDashboard, Award, Play, TrendingUp, Activity, FileText, Settings, Plug, LogOut, BookOpen, Waves, Target, Calendar, Shield, Server } from 'lucide-react'
import { getSession, clearSession } from '../../lib/auth/session'

type Item = { label:string; href:string; icon: ElementType; muted?: boolean; badge?: string }

export const NAV_GROUPS: {label?: string; items: Item[]}[] = [
  { items: [{ label: 'Command', icon: LayoutDashboard, href: '/all/command' }] },
  { label: 'OPERATIONAL', items: [
    { label: 'Intelligence', icon: TrendingUp, href: '/all/intelligence' },
    { label: 'Outcomes', icon: BookOpen, href: '/outcomes' },
  ]},
  { label: 'EXECUTION', items: [
    { label: 'Recommendations', icon: Target, href: '/all/command', badge: 'In progress' },
    { label: 'Campaigns', icon: Target, href: '/campaigns' },
    { label: 'Execution', icon: Play, href: '/all/execution' },
    { label: 'Drift monitor', icon: Waves, href: '/drift' },
  ]},
  { label: 'GOVERNANCE', items: [
    { label: 'Governance', icon: Award, href: '/all/governance' },
    { label: 'Approval workflows', icon: Shield, href: '/approval-workflows' },
    { label: 'Scheduling', icon: Calendar, href: '/scheduling' },
  ]},
  { label: 'PLATFORM', items: [
    { label: 'Connector hub', icon: Plug, href: '/connectors', muted: true, badge: '1' },
    { label: 'Runtime health', icon: Server, href: '/runtime-health', muted: true },
    { label: 'Connector ops', icon: Activity, href: '/connector-ops', muted: true },
    { label: 'Evidence & audit', icon: FileText, href: '/audit-log', muted: true },
    { label: 'Security', icon: ShieldCheck, href: '/security', muted: true },
    { label: 'Settings', icon: Settings, href: '/settings', muted: true },
  ]},
]

export function Sidebar(){
 const [location]=useLocation(); const session=getSession()
 const active=(href:string)=> location===href || location.endsWith(href.split('/').pop()||'')
 return <nav style={{width:220,background:'#0a0c0b',borderRight:'var(--border-default)',display:'flex',flexDirection:'column'}}>
  <div style={{padding:'14px 16px',display:'flex',alignItems:'center',gap:8,borderBottom:'var(--border-default)'}}><ShieldCheck size={14}/><b>Certen</b></div>
  <div style={{flex:1,overflow:'auto',paddingTop:8}}>{NAV_GROUPS.map(g=><div key={g.label||'top'}>{g.label&&<div style={{fontSize:9,color:'var(--text-tertiary)',letterSpacing:'0.08em',padding:'8px 16px'}}>{g.label}</div>}{g.items.map(i=>{const a=active(i.href);const Icon=i.icon;return <Link key={i.label} href={i.href}><div title={i.badge==='In progress'?'In progress':undefined} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 16px',fontSize:i.muted?12:13,color:a?'var(--text-primary)':(i.muted?'var(--text-tertiary)':'var(--text-secondary)'),background:a?'var(--teal-bg)':'transparent',borderLeft:a?'2px solid var(--teal)':'2px solid transparent'}}><Icon size={13}/><span style={{flex:1}}>{i.label}</span>{i.badge&&<span style={{fontSize:10,color:'var(--amber)'}}>{i.badge}</span>}</div></Link>})}</div>)}</div>
  <div style={{borderTop:'var(--border-default)',padding:12}}><div style={{display:'inline-flex',padding:'3px 8px',border:'var(--border-teal)',borderRadius:999,color:'var(--teal)',fontSize:11}}>Data trust: 91%</div>{session&&<button onClick={()=>{clearSession();window.location.href='/login'}} style={{marginLeft:8,fontSize:11}}><LogOut size={12}/></button>}</div>
 </nav>
}
