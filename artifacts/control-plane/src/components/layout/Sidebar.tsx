import type { ElementType } from 'react'
import { Link, useLocation } from 'wouter'
import { ShieldCheck, LayoutDashboard, Award, Play, TrendingUp, Activity, FileText, Settings, Plug, LogOut, BookOpen, Waves, Target, Calendar, Shield, Server, DatabaseZap, RadioTower, ListChecks, Gauge, ClipboardCheck, RefreshCw, Bot, UserCheck, Network, Crown } from 'lucide-react'
import { getSession, clearSession } from '../../lib/auth/session'

type Item = { label:string; href:string; icon: ElementType; muted?: boolean; badge?: string }
// OPERATIONAL legacy grouping retained for route/test compatibility; visible groups are now executive demo-oriented.

export const NAV_GROUPS: {label?: string; items: Item[]}[] = [
  { label: 'EXECUTIVE', items: [
    { label: 'Executive Risk', icon: Crown, href: '/executive-risk' },
    { label: 'Workspace', icon: ClipboardCheck, href: '/pilot-workspace' },
    { label: 'Executive Value', icon: TrendingUp, href: '/executive-value' },
    { label: 'Executive Priorities', icon: ListChecks, href: '/executive-priorities' },
    { label: 'Command', icon: LayoutDashboard, href: '/all/command' },
  ]},
  { label: 'INTELLIGENCE', items: [
    { label: 'Governance Graph', icon: Network, href: '/governance-graph' },
    { label: 'Shadow IT Exposure', icon: ShieldCheck, href: '/shadow-it-exposure' },
    { label: 'SaaS Rationalisation', icon: RefreshCw, href: '/saas-rationalisation' },
    { label: 'AI Governance', icon: Bot, href: '/ai-governance' },
    { label: 'Renewals', icon: Calendar, href: '/renewals' },
    { label: 'Ownership', icon: UserCheck, href: '/ownership' },
    { label: 'Intelligence', icon: TrendingUp, href: '/all/intelligence' },
    { label: 'Vendor Intelligence', icon: RadioTower, href: '/vendor-intelligence' },
    { label: 'Benchmark Intelligence', icon: Activity, href: '/benchmark-intelligence' },
    { label: 'Contract Intelligence', icon: FileText, href: '/contract-intelligence' },
    { label: 'Utilization Intelligence', icon: Gauge, href: '/utilization-intelligence' },
    { label: 'Opportunities', icon: Target, href: '/opportunities' },
  ]},
  { label: 'PROOF & OPERATIONS', items: [
    { label: 'Evidence Packs', icon: FileText, href: '/evidence-packs' },
    { label: 'Connector hub', icon: Plug, href: '/connectors', muted: true, badge: '1' },
    { label: 'Data Trust', icon: DatabaseZap, href: '/data-trust' },
    { label: 'Execution', icon: Play, href: '/all/execution' },
    { label: 'Outcomes', icon: BookOpen, href: '/outcomes' },
    { label: 'Recommendations', icon: Target, href: '/all/command', badge: 'In progress' },
    { label: 'Campaigns', icon: Target, href: '/campaigns' },
    { label: 'Drift monitor', icon: Waves, href: '/drift' },
    { label: 'Approval workflows', icon: Shield, href: '/approval-workflows' },
    { label: 'Scheduling', icon: Calendar, href: '/scheduling' },
  ]},
  { label: 'PLATFORM', items: [
    { label: 'Governance', icon: Award, href: '/all/governance' },
    { label: 'M365 Onboarding', icon: ClipboardCheck, href: '/onboarding/m365', muted: true },
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
  <div style={{borderTop:'var(--border-default)',padding:12}}><div style={{display:'inline-flex',padding:'3px 8px',border:'var(--border-teal)',borderRadius:999,color:'var(--teal)',fontSize:11}}>Data trust: 83 HIGH</div>{session&&<button onClick={()=>{clearSession();window.location.href='/login'}} style={{marginLeft:8,fontSize:11}}><LogOut size={12}/></button>}</div>
 </nav>
}
