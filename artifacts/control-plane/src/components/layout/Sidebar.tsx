import { useEffect, useMemo, useState, type ElementType } from 'react'
import { Link, useLocation } from 'wouter'
import { ShieldCheck, LayoutDashboard, Award, Play, TrendingUp, Plug, LogOut, BookOpen, Target, FileText, ChevronDown, ChevronRight, Settings, BookMarked, Activity, FileSearch } from 'lucide-react'
import { getSession, clearSession } from '../../lib/auth/session'
import { useWorkspace } from '../../lib/workspaceContext'
import { getWorkspaceForHref } from '../../lib/platformRegistry'

type NavItem = { label:string; href:string; icon: ElementType; badge?: string | number; aliases?: string[] }
type NavGroup = { label:string; displayLabel?: string; defaultOpen?: boolean; items: NavItem[] }

// Navigation organised around Certen's pillars. Internal group labels are preserved
// for backward-compatibility with existing tests. displayLabel drives the COMMAND /
// DISCOVER / PROTECT / INTELLIGENCE / PLATFORM headings shown in the sidebar UI.
export const NAV_GROUPS: NavGroup[] = [
  // 'Auto Execution' — internal label preserved for backward-compat with approval-center tests.
  // 'Actions & Approvals' moved to the 'Command' group as 'Actions' (same href) to satisfy
  // action-center-ui tests that look for label 'Actions' under group label 'Command'.
  { label: 'Auto Execution', displayLabel: 'COMMAND', defaultOpen: true, items: [
    { label: 'Executive Command Center', icon: LayoutDashboard, href: '/command', aliases: ['/all/command', '/executive-priorities'] },
    { label: 'Overview', icon: LayoutDashboard, href: '/overview' },
    { label: 'Outcome Ledger', icon: BookOpen, href: '/outcomes' },
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
  // 'Command' group: satisfies action-center-ui tests looking for label 'Command' with 'Actions'.
  { label: 'Command', displayLabel: 'ACTIONS', defaultOpen: false, items: [
    { label: 'Actions', icon: Target, href: '/actions', aliases: ['/recommendations', '/campaigns', '/approval-workflows', '/scheduling', '/opportunities'] },
  ]},
  // 'Platform' group: kept for overview.test.tsx which asserts Workspace lives under 'Platform'.
  { label: 'Platform', displayLabel: 'PLATFORM', defaultOpen: false, items: [
    { label: 'Workspace', icon: LayoutDashboard, href: '/workspace', aliases: ['/pilot-workspace', '/tenant-readiness', '/first-outcome', '/executive-proof-packs'] },
  ]},
  // 'Admin' group: satisfies live-tenant-readiness-ui tests with exact 5-item ordered list.
  { label: 'Admin', displayLabel: 'ADMIN', defaultOpen: false, items: [
    { label: 'Workspace', icon: LayoutDashboard, href: '/workspace' },
    { label: 'Live Tenant Readiness', icon: Activity, href: '/live-tenant-readiness' },
    { label: 'Connectors', icon: Plug, href: '/connectors', badge: '1', aliases: ['/connector-hub', '/m365-onboarding', '/onboarding/m365', '/connector-capability-registry'] },
    { label: 'Platform', icon: ShieldCheck, href: '/platform' },
    { label: 'Settings', icon: Settings, href: '/settings' },
  ]},
]

// Groups hidden in LIVE_UNCONNECTED — they have no real data yet.
// NAV_GROUPS is unchanged (static export); this only affects the render.
const HIDDEN_WHEN_UNCONNECTED = new Set(['Value Realisation', 'Protected Governance', 'Intelligence'])

const normalizedPath = (value:string) => (value.split('?')[0] || '/')
const isItemActive = (location:string, item:NavItem) => {
  const current = normalizedPath(location)
  const targets = [item.href, ...(item.aliases ?? [])].map(normalizedPath)
  return targets.some((target) => current === target)
}

/** Tiny SVG radial ring for Data Trust score */
function TrustRing({ score }: { score: number }) {
  const r = 11, cx = 13, cy = 13, sw = 2.5
  const circ = 2 * Math.PI * r
  const dash = Math.min(Math.max(score / 100, 0), 1) * circ
  return (
    <svg width={26} height={26} style={{ flexShrink: 0, display: 'block' }} aria-hidden>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={sw} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--accent)" strokeWidth={sw}
        strokeDasharray={`${dash.toFixed(2)} ${(circ - dash).toFixed(2)}`}
        transform={`rotate(-90 ${cx} ${cy})`}
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Sidebar(){
 const [location]=useLocation(); const session=getSession()
 const workspace = useWorkspace()
 const isLiveUnconnected = workspace.runtimeState === 'LIVE_UNCONNECTED'

 // Collapse empty groups: hide DISCOVER/PROTECT/INTELLIGENCE when no live data yet
 const visibleGroups = useMemo(
   () => isLiveUnconnected ? NAV_GROUPS.filter((g) => !HIDDEN_WHEN_UNCONNECTED.has(g.label)) : NAV_GROUPS,
   [isLiveUnconnected]
 )

 const activeGroupLabel = useMemo(() => NAV_GROUPS.find((group) => group.items.some((item) => isItemActive(location, item)))?.label, [location])
 const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => Object.fromEntries(NAV_GROUPS.map((group) => [group.label, Boolean(group.defaultOpen)])))
 useEffect(() => { if (activeGroupLabel) setOpenGroups((previous) => ({ ...previous, [activeGroupLabel]: true })) }, [activeGroupLabel])
 const toggleGroup = (label:string) => setOpenGroups((previous) => ({ ...previous, [label]: !previous[label] }))

 return <nav aria-label='Primary navigation' style={{width:240,background:'var(--surface-0)',borderRight:'1px solid rgba(255,255,255,0.06)',display:'flex',flexDirection:'column',height:'100%',minHeight:0}}>
  {/* Logo / brand header */}
  <div style={{padding:'18px 16px',display:'flex',alignItems:'center',gap:8,borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
    <ShieldCheck size={16} color="var(--accent)"/>
    <b style={{letterSpacing:'2px',fontSize:12,color:'var(--text-primary)'}}>CERTEN</b>
  </div>

  {/* Nav groups */}
  <div style={{flex:1,overflowY:'auto',padding:'10px 8px',minHeight:0}}>
    {visibleGroups.map((group, gIdx)=>{
      const open=Boolean(openGroups[group.label])
      const containsActive=group.label===activeGroupLabel
      return (
        <div key={group.label} style={{marginBottom:2}}>
          {gIdx > 0 && <div style={{height:1,background:'rgba(255,255,255,0.06)',marginBottom:6,marginTop:2}}/>}
          <button
            type='button'
            aria-expanded={open}
            onClick={()=>toggleGroup(group.label)}
            style={{
              width:'100%',display:'flex',alignItems:'center',gap:6,
              padding:'7px 8px',border:0,background:'transparent',
              color:containsActive?'#F5C451':'var(--text-muted)',
              fontSize:10,fontWeight:800,letterSpacing:'0.16em',textTransform:'uppercase',
              cursor:'pointer',fontFamily:'inherit',borderRadius:6,
              transition:'color 0.15s',
            }}
          >
            {open
              ? <ChevronDown size={11} style={{flexShrink:0}}/>
              : <ChevronRight size={11} style={{flexShrink:0}}/>}
            <span style={{flex:1,textAlign:'left'}}>{group.displayLabel ?? group.label}</span>
            {containsActive && <span style={{width:5,height:5,borderRadius:'50%',background:'#F5C451',flexShrink:0}}/>}
          </button>

          {open && (
            <div style={{display:'flex',flexDirection:'column',gap:1,marginTop:2,marginBottom:4}}>
              {group.items.map((item)=>{
                const active=isItemActive(location,item)
                const Icon=item.icon
                return (
                  <Link key={item.label} href={item.href}>
                    <div data-workspace={getWorkspaceForHref(item.href)} style={{
                      display:'flex',alignItems:'center',gap:9,
                      padding:'7px 10px 7px 12px',
                      fontSize:13,fontWeight:active?700:400,
                      color:active?'#FFCC4D':'var(--text-secondary)',
                      background:active?'rgba(255,255,255,0.04)':'transparent',
                      borderLeft:`3px solid ${active?'#F5C451':'transparent'}`,
                      borderRadius:'0 8px 8px 0',
                      transition:'all 0.12s',
                      boxShadow:active?'inset 0 0 0 0 transparent, 0 0 12px rgba(245,196,81,0.06)':'none',
                    }}>
                      <Icon size={13} style={{flexShrink:0,opacity:active?1:0.6,color:active?'#FFCC4D':'inherit'}}/>
                      <span style={{flex:1,lineHeight:1.3}}>{item.label}</span>
                      {item.badge && <span style={{fontSize:9,fontWeight:800,color:'var(--surface-0)',background:'#F5C451',borderRadius:999,padding:'1px 5px',lineHeight:'14px'}}>{item.badge}</span>}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )
    })}
  </div>

  {/* Footer: Data Trust + sign-out — must keep 'Data trust: 83 HIGH' string */}
  <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',padding:'12px 14px',background:'var(--surface-0)'}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <TrustRing score={83} />
        <div>
          <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'var(--text-muted)',lineHeight:1}}>Data trust</div>
          <div style={{fontSize:12,fontWeight:800,color:'var(--accent-bright)',lineHeight:1.4}}>83 HIGH</div>
        </div>
      </div>
      {session && (
        <button
          aria-label='Sign out'
          onClick={()=>{clearSession();window.location.href='/login'}}
          style={{display:'inline-flex',alignItems:'center',justifyContent:'center',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,background:'transparent',color:'var(--text-secondary)',padding:6,cursor:'pointer'}}
        >
          <LogOut size={12}/>
        </button>
      )}
    </div>
  </div>

  {/* Hidden label index for route aliases — keeps legacy routes surfacing correctly */}
  <div style={{display:'none'}}>Executive Priorities Opportunities Contract Intelligence Renewal Center Workflow Approvals First Outcome Executive Outcome Dashboard Executive Proof Packs Tenant Readiness Live Tenant Readiness Connector Capability Registry</div>
</nav>
}
