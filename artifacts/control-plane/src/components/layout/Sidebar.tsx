import { useEffect, useMemo, useState, type ElementType } from 'react'
import { Link, useLocation } from 'wouter'
import { ShieldCheck, LayoutDashboard, Award, Play, TrendingUp, Settings, Plug, LogOut, BookOpen, Target, FileText, ListChecks, ChevronDown, ChevronRight, Crown } from 'lucide-react'
import { getSession, clearSession } from '../../lib/auth/session'

type NavItem = { label:string; href:string; icon: ElementType; badge?: string | number; aliases?: string[] }
type NavGroup = { label:string; defaultOpen?: boolean; items: NavItem[] }

export const NAV_GROUPS: NavGroup[] = [
  { label: 'Command', defaultOpen: true, items: [
    { label: 'Overview', icon: LayoutDashboard, href: '/workspace', aliases: ['/pilot-workspace', '/all/command'] },
    { label: 'Actions', icon: Target, href: '/actions', badge: 'In progress', aliases: ['/recommendations', '/campaigns', '/approval-workflows', '/scheduling'] },
  ]},
  { label: 'Executive', defaultOpen: true, items: [
    { label: 'Risk', icon: Crown, href: '/executive-risk' },
    { label: 'Value', icon: TrendingUp, href: '/executive-value' },
    { label: 'Priorities', icon: ListChecks, href: '/executive-priorities' },
  ]},
  { label: 'Intelligence', defaultOpen: true, items: [
    { label: 'Technology Portfolio', icon: TrendingUp, href: '/technology-portfolio', aliases: ['/all/intelligence', '/shadow-it', '/shadow-it-exposure', '/saas-rationalisation', '/renewals', '/ownership', '/vendor-intelligence', '/benchmark-intelligence', '/contract-intelligence', '/utilization-intelligence'] },
    { label: 'Governance', icon: Award, href: '/governance', aliases: ['/all/governance', '/governance-graph', '/ai-governance'] },
    { label: 'Opportunities', icon: Target, href: '/opportunities' },
  ]},
  { label: 'Operations', defaultOpen: false, items: [
    { label: 'Evidence', icon: FileText, href: '/evidence', aliases: ['/evidence-packs', '/evidence-audit', '/audit-log'] },
    { label: 'Execution', icon: Play, href: '/execution', aliases: ['/all/execution', '/drift', '/drift-monitor'] },
    { label: 'Outcomes', icon: BookOpen, href: '/outcomes' },
  ]},
  { label: 'Admin', defaultOpen: false, items: [
    { label: 'Connectors', icon: Plug, href: '/connectors', badge: '1', aliases: ['/connector-hub', '/m365-onboarding', '/onboarding/m365'] },
    { label: 'Platform', icon: ShieldCheck, href: '/platform', aliases: ['/data-trust', '/connector-ops', '/runtime-health', '/sync-jobs'] },
    { label: 'Settings', icon: Settings, href: '/settings', aliases: ['/security'] },
  ]},
]

const normalizedPath = (value:string) => (value.split('?')[0] || '/')
const isItemActive = (location:string, item:NavItem) => {
  const current = normalizedPath(location)
  const targets = [item.href, ...(item.aliases ?? [])].map(normalizedPath)
  return targets.some((target) => current === target)
}

export function Sidebar(){
 const [location]=useLocation(); const session=getSession()
 const activeGroupLabel = useMemo(() => NAV_GROUPS.find((group) => group.items.some((item) => isItemActive(location, item)))?.label, [location])
 const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => Object.fromEntries(NAV_GROUPS.map((group) => [group.label, Boolean(group.defaultOpen)])))
 useEffect(() => { if (activeGroupLabel) setOpenGroups((previous) => ({ ...previous, [activeGroupLabel]: true })) }, [activeGroupLabel])
 const toggleGroup = (label:string) => setOpenGroups((previous) => ({ ...previous, [label]: !previous[label] }))
 return <nav aria-label='Primary navigation' style={{width:236,background:'#0a0c0b',borderRight:'var(--border-default)',display:'flex',flexDirection:'column',height:'100%',minHeight:0}}>
  <div style={{padding:'14px 16px',display:'flex',alignItems:'center',gap:8,borderBottom:'var(--border-default)'}}><ShieldCheck size={14}/><b>Certen</b></div>
  <div style={{flex:1,overflowY:'auto',padding:'8px 8px 10px',minHeight:0}}>{NAV_GROUPS.map((group)=>{const open=Boolean(openGroups[group.label]);const containsActive=group.label===activeGroupLabel;return <div key={group.label} style={{marginBottom:6}}><button type='button' aria-expanded={open} onClick={()=>toggleGroup(group.label)} style={{width:'100%',display:'flex',alignItems:'center',gap:7,padding:'8px 8px',border:0,background:containsActive?'rgba(45,212,191,.08)':'transparent',color:containsActive?'var(--teal)':'var(--text-tertiary)',fontSize:10,fontWeight:800,letterSpacing:'0.11em',textTransform:'uppercase',borderRadius:9,cursor:'pointer',fontFamily:'inherit'}}>{open?<ChevronDown size={13}/>:<ChevronRight size={13}/>}<span style={{flex:1,textAlign:'left'}}>{group.label}</span></button>{open&&<div style={{display:'grid',gap:3,marginTop:3}}>{group.items.map((item)=>{const active=isItemActive(location,item);const Icon=item.icon;return <Link key={item.label} href={item.href}><div title={item.badge==='In progress'?'In progress':undefined} style={{display:'flex',alignItems:'center',gap:9,padding:'8px 10px 8px 14px',fontSize:13,color:active?'var(--text-primary)':'var(--text-secondary)',background:active?'var(--teal-bg)':'transparent',border:'1px solid',borderColor:active?'rgba(45,212,191,.28)':'transparent',borderLeft:active?'3px solid var(--teal)':'3px solid transparent',borderRadius:10}}><Icon size={14}/><span style={{flex:1}}>{item.label}</span>{item.badge&&<span style={{fontSize:10,color:item.badge==='1'?'var(--teal)':'var(--amber)',border:'1px solid rgba(245,158,11,.28)',borderRadius:999,padding:'2px 6px'}}>{item.badge}</span>}</div></Link>})}</div>}</div>})}</div>
  <div style={{borderTop:'var(--border-default)',padding:12,background:'#0a0c0b'}}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}><div style={{display:'inline-flex',padding:'6px 10px',border:'var(--border-teal)',borderRadius:999,color:'var(--teal)',background:'rgba(45,212,191,.08)',fontSize:11,fontWeight:800}}>Data trust: 83 HIGH</div>{session&&<button aria-label='Sign out' onClick={()=>{clearSession();window.location.href='/login'}} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',border:'var(--border-default)',borderRadius:8,background:'transparent',color:'var(--text-secondary)',padding:6}}><LogOut size={12}/></button>}</div></div>
 </nav>
}
