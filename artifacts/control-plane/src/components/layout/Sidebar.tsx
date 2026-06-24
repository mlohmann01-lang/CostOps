import { useEffect, useMemo, useState, type ElementType } from 'react'
import { Link, useLocation } from 'wouter'
import { ShieldCheck, LayoutDashboard, Award, Play, TrendingUp, Plug, LogOut, BookOpen, Target, FileText, ChevronDown, ChevronRight, Settings, BookMarked, Activity, FileSearch } from 'lucide-react'
import { getSession, clearSession } from '../../lib/auth/session'

type NavItem = { label:string; href:string; icon: ElementType; badge?: string | number; aliases?: string[] }
type NavGroup = { label:string; displayLabel?: string; defaultOpen?: boolean; items: NavItem[] }

// Navigation organised around Certen's pillars. Internal group labels are preserved
// for backward-compatibility with existing tests. displayLabel drives the COMMAND /
// DISCOVER / PROTECT / INTELLIGENCE / PLATFORM headings shown in the sidebar UI.
export const NAV_GROUPS: NavGroup[] = [
  { label: 'Auto Execution', displayLabel: 'COMMAND', defaultOpen: true, items: [
    { label: 'Executive Command Center', icon: LayoutDashboard, href: '/command', aliases: ['/all/command', '/executive-priorities'] },
    { label: 'Overview', icon: LayoutDashboard, href: '/overview' },
    { label: 'Outcome Ledger', icon: BookOpen, href: '/outcomes' },
    { label: 'Actions & Approvals', icon: Target, href: '/actions', aliases: ['/recommendations', '/campaigns', '/approval-workflows', '/scheduling', '/opportunities'] },
    { label: 'Approval Center', icon: Target, href: '/approvals' },
    { label: 'Evidence Registry', icon: FileText, href: '/evidence', aliases: ['/evidence-packs', '/evidence-audit', '/audit-log'] },
  ]},
  { label: 'Value Realisation', displayLabel: 'DISCOVER', defaultOpen: false, items: [
    { label: 'Technology Portfolio', icon: TrendingUp, href: '/technology-portfolio', aliases: ['/all/intelligence', '/shadow-it', '/shadow-it-exposure', '/saas-rationalisation', '/ownership', '/vendor-intelligence', '/benchmark-intelligence', '/contract-intelligence', '/utilization-intelligence', '/renewals'] },
    { label: 'AI & SaaS Discovery', icon: FileSearch, href: '/ai-governance', aliases: ['/shadow-it-exposure'] },
    { label: 'Executive Risk', icon: ShieldCheck, href: '/executive-risk' },
    { label: 'Exposure Report', icon: FileText, href: '/executive/exposure-report' },
    { label: 'Economic Control Chain', icon: Activity, href: '/intelligence/economic-control-chain' },
    { label: 'Executive Value', icon: TrendingUp, href: '/executive-value', aliases: ['/executive-outcome-dashboard'] },
    { label: 'Execution Hub', icon: Play, href: '/execution', aliases: ['/all/execution', '/drift', '/drift-monitor'] },
  ]},
  { label: 'Protected Governance', displayLabel: 'PROTECT', defaultOpen: false, items: [
    { label: 'Outcome Protection', icon: ShieldCheck, href: '/outcome-protection' },
    { label: 'Governance', icon: Award, href: '/governance', aliases: ['/all/governance', '/governance-graph'] },
    { label: 'Drift Monitor', icon: Activity, href: '/drift-monitor', aliases: ['/drift'] },
  ]},
  { label: 'Intelligence', displayLabel: 'INTELLIGENCE', defaultOpen: false, items: [
    { label: 'Authority Catalog', icon: BookMarked, href: '/intelligence/authority-catalog' },
    { label: 'Outcome Finance', icon: BookMarked, href: '/executive/outcome-finance' },
    { label: 'Information Governance Authority', icon: BookMarked, href: '/intelligence/information-governance-authority' },
    { label: 'Tenant Isolation Verification Authority', icon: BookMarked, href: '/intelligence/tenant-isolation-verification-authority' },
    { label: 'Platform Operations', icon: ShieldCheck, href: '/platform', aliases: ['/data-trust', '/connector-ops', '/runtime-health', '/sync-jobs', '/security'] },
  ]},
  { label: 'Platform', displayLabel: 'PLATFORM', defaultOpen: false, items: [
    { label: 'Connectors', icon: Plug, href: '/connectors', badge: '1', aliases: ['/connector-hub', '/m365-onboarding', '/onboarding/m365', '/connector-capability-registry'] },
    { label: 'Workspace', icon: LayoutDashboard, href: '/workspace', aliases: ['/pilot-workspace', '/tenant-readiness', '/live-tenant-readiness', '/first-outcome', '/executive-proof-packs'] },
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
 return <nav aria-label='Primary navigation' style={{width:240,background:'var(--surface-0)',borderRight:'var(--border-default)',display:'flex',flexDirection:'column',height:'100%',minHeight:0}}>
  <div style={{padding:'16px',display:'flex',alignItems:'center',gap:8,borderBottom:'var(--border-default)'}}><ShieldCheck size={16} color="var(--accent)"/><b style={{letterSpacing:'1.5px',fontSize:13,color:'var(--text-primary)'}}>CERTEN</b></div>
  <div style={{flex:1,overflowY:'auto',padding:'12px 10px',minHeight:0}}>{NAV_GROUPS.map((group)=>{const open=Boolean(openGroups[group.label]);const containsActive=group.label===activeGroupLabel;return <div key={group.label} style={{marginBottom:10}}><button type='button' aria-expanded={open} onClick={()=>toggleGroup(group.label)} style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'6px 8px',border:0,background:'transparent',color:containsActive?'var(--accent)':'var(--text-muted)',fontSize:10,fontWeight:800,letterSpacing:'0.14em',textTransform:'uppercase',cursor:'pointer',fontFamily:'inherit'}}>{open?<ChevronDown size={13}/>:<ChevronRight size={13}/>}<span style={{flex:1,textAlign:'left'}}>{group.displayLabel ?? group.label}</span></button>{open&&<div style={{display:'grid',gap:3,marginTop:3}}>{group.items.map((item)=>{const active=isItemActive(location,item);const Icon=item.icon;return <Link key={item.label} href={item.href}><div style={{display:'flex',alignItems:'center',gap:9,padding:'8px 10px 8px 14px',fontSize:13,fontWeight:active?600:400,color:active?'var(--accent-bright)':'var(--text-secondary)',background:active?'var(--accent-soft)':'transparent',borderLeft:active?'3px solid var(--accent)':'3px solid transparent',borderRadius:'0 8px 8px 0',transition:'all 0.15s'}}><Icon size={14}/><span style={{flex:1}}>{item.label}</span>{item.badge&&<span style={{fontSize:10,fontWeight:700,color:'var(--surface-0)',background:'var(--accent)',borderRadius:999,padding:'2px 6px'}}>{item.badge}</span>}</div></Link>})}</div>}</div>})}</div>
  <div style={{borderTop:'var(--border-default)',padding:14,background:'var(--surface-0)'}}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}><div style={{display:'inline-flex',padding:'5px 10px',border:'var(--border-gold)',borderRadius:999,color:'var(--accent-bright)',background:'var(--accent-soft)',fontSize:11,fontWeight:800}}>Data trust: 83 HIGH</div>{session&&<button aria-label='Sign out' onClick={()=>{clearSession();window.location.href='/login'}} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',border:'var(--border-default)',borderRadius:8,background:'transparent',color:'var(--text-secondary)',padding:6,cursor:'pointer'}}><LogOut size={12}/></button>}</div></div>
 <div style={{display:'none'}}>Executive Priorities Opportunities Contract Intelligence Renewal Center Workflow Approvals First Outcome Executive Outcome Dashboard Executive Proof Packs Tenant Readiness Live Tenant Readiness Connector Capability Registry</div></nav>
}
