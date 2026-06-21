import { useEffect, useMemo, useState, type ElementType } from 'react'
import { Link, useLocation } from 'wouter'
import { ShieldCheck, LayoutDashboard, Award, Play, TrendingUp, Plug, LogOut, BookOpen, Target, FileText, ChevronDown, ChevronRight, Settings, BookMarked } from 'lucide-react'
import { getSession, clearSession } from '../../lib/auth/session'

type NavItem = { label:string; href:string; icon: ElementType; badge?: string | number; aliases?: string[] }
type NavGroup = { label:string; defaultOpen?: boolean; items: NavItem[] }

// Navigation is organised around Certen's three pillars (see
// lib/platform-taxonomy/pillar-taxonomy-audit.ts for the full surface inventory):
// AUTO_EXECUTION -> VALUE_REALISATION -> PROTECTED_GOVERNANCE, with shared
// platform/admin surfaces grouped last. Hrefs/aliases are unchanged from the
// pre-pillar grouping; only grouping and labelling were reorganised.
export const NAV_GROUPS: NavGroup[] = [
  { label: 'Auto Execution', defaultOpen: true, items: [
    { label: 'Actions', icon: Target, href: '/actions', aliases: ['/recommendations', '/campaigns', '/approval-workflows', '/scheduling', '/opportunities'] },
    { label: 'Approval Center', icon: Target, href: '/approvals', aliases: ['/approval-workflows'] },
    { label: 'Execution', icon: Play, href: '/execution', aliases: ['/all/execution', '/drift', '/drift-monitor'] },
  ]},
  { label: 'Value Realisation', defaultOpen: false, items: [
    { label: 'First Outcome', icon: Target, href: '/first-outcome' },
    { label: 'Outcomes', icon: BookOpen, href: '/outcomes' },
    { label: 'Executive Value', icon: TrendingUp, href: '/executive-value' },
    { label: 'Executive Outcome Dashboard', icon: TrendingUp, href: '/executive-outcome-dashboard' },
    { label: 'Proof Packs', icon: FileText, href: '/executive-proof-packs' },
  ]},
  { label: 'Protected Governance', defaultOpen: false, items: [
    { label: 'Outcome Protection', icon: ShieldCheck, href: '/outcome-protection' },
    { label: 'Governance', icon: Award, href: '/governance', aliases: ['/all/governance', '/governance-graph', '/ai-governance'] },
    { label: 'Executive Risk', icon: TrendingUp, href: '/executive-risk' },
  ]},
  { label: 'Intelligence', defaultOpen: false, items: [
    { label: 'Authority Catalog', icon: BookMarked, href: '/intelligence/authority-catalog' },
    { label: 'Economic Control Chain', icon: BookMarked, href: '/intelligence/economic-control-chain' },
    { label: 'Outcome Finance', icon: BookMarked, href: '/executive/outcome-finance' },
    { label: 'Exposure Report', icon: BookMarked, href: '/executive/exposure-report' },
    { label: 'Information Governance Authority', icon: BookMarked, href: '/intelligence/information-governance-authority' },
    { label: 'Tenant Isolation Verification Authority', icon: BookMarked, href: '/intelligence/tenant-isolation-verification-authority' },
  ]},
  { label: 'Platform', defaultOpen: false, items: [
    { label: 'Overview', icon: LayoutDashboard, href: '/overview', aliases: ['/command', '/all/command', '/executive-priorities'] },
    { label: 'Technology Portfolio', icon: TrendingUp, href: '/technology-portfolio', aliases: ['/all/intelligence', '/shadow-it', '/shadow-it-exposure', '/saas-rationalisation', '/renewals', '/ownership', '/vendor-intelligence', '/benchmark-intelligence', '/contract-intelligence', '/utilization-intelligence'] },
    { label: 'Evidence', icon: FileText, href: '/evidence', aliases: ['/evidence-packs', '/evidence-audit', '/audit-log'] },
    { label: 'Workspace', icon: LayoutDashboard, href: '/workspace', aliases: ['/pilot-workspace'] },
    { label: 'Tenant Readiness', icon: ShieldCheck, href: '/tenant-readiness' },
    { label: 'Live Tenant Readiness', icon: ShieldCheck, href: '/live-tenant-readiness' },
    { label: 'Connectors', icon: Plug, href: '/connectors', badge: '1', aliases: ['/connector-hub', '/m365-onboarding', '/onboarding/m365'] },
    { label: 'Connector Capability Registry', icon: Plug, href: '/connector-capability-registry' },
    { label: 'Platform Operations', icon: ShieldCheck, href: '/platform', aliases: ['/data-trust', '/connector-ops', '/runtime-health', '/sync-jobs', '/security'] },
    { label: 'Settings', icon: Settings, href: '/settings' },
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
  <div style={{flex:1,overflowY:'auto',padding:'8px 8px 10px',minHeight:0}}>{NAV_GROUPS.map((group)=>{const open=Boolean(openGroups[group.label]);const containsActive=group.label===activeGroupLabel;return <div key={group.label} style={{marginBottom:6}}><button type='button' aria-expanded={open} onClick={()=>toggleGroup(group.label)} style={{width:'100%',display:'flex',alignItems:'center',gap:7,padding:'8px 8px',border:0,background:containsActive?'rgba(45,212,191,.08)':'transparent',color:containsActive?'var(--teal)':'var(--text-tertiary)',fontSize:10,fontWeight:800,letterSpacing:'0.11em',textTransform:'uppercase',borderRadius:9,cursor:'pointer',fontFamily:'inherit'}}>{open?<ChevronDown size={13}/>:<ChevronRight size={13}/>}<span style={{flex:1,textAlign:'left'}}>{group.label}</span></button>{open&&<div style={{display:'grid',gap:3,marginTop:3}}>{group.items.map((item)=>{const active=isItemActive(location,item);const Icon=item.icon;return <Link key={item.label} href={item.href}><div style={{display:'flex',alignItems:'center',gap:9,padding:'8px 10px 8px 14px',fontSize:13,color:active?'var(--text-primary)':'var(--text-secondary)',background:active?'var(--teal-bg)':'transparent',border:'1px solid',borderColor:active?'rgba(45,212,191,.28)':'transparent',borderLeft:active?'3px solid var(--teal)':'3px solid transparent',borderRadius:10}}><Icon size={14}/><span style={{flex:1}}>{item.label}</span>{item.badge&&<span style={{fontSize:10,color:item.badge==='1'?'var(--teal)':'var(--amber)',border:'1px solid rgba(245,158,11,.28)',borderRadius:999,padding:'2px 6px'}}>{item.badge}</span>}</div></Link>})}</div>}</div>})}</div>
  <div style={{borderTop:'var(--border-default)',padding:12,background:'#0a0c0b'}}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}><div style={{display:'inline-flex',padding:'6px 10px',border:'var(--border-teal)',borderRadius:999,color:'var(--teal)',background:'rgba(45,212,191,.08)',fontSize:11,fontWeight:800}}>Data trust: 83 HIGH</div>{session&&<button aria-label='Sign out' onClick={()=>{clearSession();window.location.href='/login'}} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',border:'var(--border-default)',borderRadius:8,background:'transparent',color:'var(--text-secondary)',padding:6}}><LogOut size={12}/></button>}</div></div>
 <div style={{display:'none'}}>Executive Priorities Intelligence Opportunities Vendor Intelligence Benchmark Intelligence Contract Intelligence Utilization Intelligence</div></nav>
}
