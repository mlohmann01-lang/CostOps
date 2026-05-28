import { Link, useLocation } from 'wouter'
import {
  ShieldCheck, LayoutDashboard, Award, Play, TrendingUp,
  Activity, FileText, Settings, Plug, LogOut, BookOpen, Waves,
} from 'lucide-react'
import { getSession, clearSession } from '../../lib/auth/session'

const NAV_PLATFORM = [
  { label: 'Connector hub',  icon: Plug,           href: '/connectors',       badge: 1, badgeType: 'warn' as const },
  { label: 'Command',        icon: LayoutDashboard, href: '/all/command' },
  { label: 'Governance',     icon: Award,           href: '/all/governance' },
  { label: 'Execution',      icon: Play,            href: '/all/execution' },
  { label: 'Intelligence',   icon: TrendingUp,      href: '/all/intelligence' },
  { label: 'Outcomes',       icon: BookOpen,        href: '/outcomes' },
  { label: 'Drift monitor',  icon: Waves,           href: '/drift' },
  { label: 'Campaigns',      icon: BookOpen,         href: '/campaigns' },
  { label: 'Scheduling',     icon: Activity,         href: '/scheduling' },
  { label: 'Approval workflows', icon: Award,       href: '/approval-workflows' },
  { label: 'Runtime health', icon: Activity,        href: '/runtime-health' },
  { label: 'Security', icon: ShieldCheck,           href: '/security' },
]

const NAV_SYSTEM = [
  { label: 'Sync jobs',  icon: Activity,  href: '/sync-jobs',  badge: 2, badgeType: 'error' as const },
  { label: 'Audit log',  icon: FileText,  href: '/audit-log' },
  { label: 'Settings',   icon: Settings,  href: '/settings' },
]

interface NavItemProps {
  label: string
  icon: React.ElementType
  href: string
  badge?: number
  badgeType?: 'warn' | 'error'
  active: boolean
}

function NavItem({ label, icon: Icon, href, badge, badgeType, active }: NavItemProps) {
  return (
    <Link href={href}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          padding: '7px 16px',
          fontSize: 12.5,
          cursor: 'pointer',
          borderLeft: active ? '2px solid #1D9E75' : '2px solid transparent',
          color: active ? '#1D9E75' : 'rgba(255,255,255,0.45)',
          background: active ? 'rgba(29,158,117,0.08)' : 'transparent',
          fontWeight: active ? 500 : 400,
          transition: 'background 0.12s, color 0.12s',
          textDecoration: 'none',
          borderRadius: '0 5px 5px 0',
          marginRight: 8,
        }}
        onMouseEnter={e => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
            ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.70)'
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)'
          }
        }}
      >
        <Icon size={14} strokeWidth={active ? 2 : 1.5} />
        <span style={{ flex: 1 }}>{label}</span>
        {badge !== undefined && (
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            padding: '1px 5px',
            borderRadius: 10,
            background: badgeType === 'error' ? 'rgba(226,75,74,0.18)' : 'rgba(239,159,39,0.18)',
            color: badgeType === 'error' ? '#E24B4A' : '#EF9F27',
          }}>
            {badge}
          </span>
        )}
      </div>
    </Link>
  )
}

function isPathActive(href: string, location: string): boolean {
  if (href === '/connectors') return location === '/connectors'
  if (href === '/outcomes') return location === '/outcomes'
  if (href === '/drift') return location === '/drift'
  const segment = href.split('/').filter(Boolean).pop() ?? ''
  return segment !== '' && location.endsWith(segment)
}

export function Sidebar() {
  const [location] = useLocation()
  const session = getSession()

  function handleLogout() {
    clearSession()
    window.location.href = '/login'
  }

  return (
    <nav
      style={{
        width: 192,
        minWidth: 192,
        background: '#0a0c0b',
        borderRight: '0.5px solid rgba(255,255,255,0.07)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div style={{
        padding: '16px 16px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        borderBottom: '0.5px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: 6,
          background: '#1D9E75',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <ShieldCheck size={13} color="#fff" strokeWidth={2.5} />
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#e8e6e0', letterSpacing: '-0.01em' }}>Certen</span>
      </div>

      {/* Platform section */}
      <div style={{ paddingTop: 10, flex: 1, overflow: 'hidden auto' }}>
        <div style={{
          fontSize: 10, color: 'rgba(255,255,255,0.22)',
          textTransform: 'uppercase', letterSpacing: '0.07em',
          padding: '8px 16px 5px',
          fontWeight: 500,
        }}>
          Platform
        </div>
        {NAV_PLATFORM.map(item => (
          <NavItem
            key={item.href}
            {...item}
            active={isPathActive(item.href, location)}
          />
        ))}

        {/* System section */}
        <div style={{
          fontSize: 10, color: 'rgba(255,255,255,0.22)',
          textTransform: 'uppercase', letterSpacing: '0.07em',
          padding: '16px 16px 5px',
          fontWeight: 500,
        }}>
          System
        </div>
        {NAV_SYSTEM.map(item => (
          <NavItem
            key={item.href}
            {...item}
            active={location === item.href}
          />
        ))}
      </div>

      {/* Footer */}
      <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        {/* Trust pill */}
        <div style={{ padding: '10px 16px 6px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 11, color: '#1D9E75',
            background: 'rgba(29,158,117,0.10)',
            border: '0.5px solid rgba(29,158,117,0.25)',
            padding: '3px 9px', borderRadius: 20,
          }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#1D9E75', flexShrink: 0 }} />
            Data trust: 91%
          </div>
        </div>

        {/* User row */}
        {session && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 16px 14px',
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: 'rgba(29,158,117,0.18)',
              border: '0.5px solid rgba(29,158,117,0.30)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              fontSize: 10, fontWeight: 600,
              color: '#1D9E75',
            }}>
              {session.user.email.charAt(0).toUpperCase()}
            </div>
            <span style={{
              fontSize: 11, color: 'rgba(255,255,255,0.30)',
              flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {session.user.email}
            </span>
            <button
              onClick={handleLogout}
              title="Sign out"
              style={{
                background: 'none', border: 'none', padding: 4,
                cursor: 'pointer', color: 'rgba(255,255,255,0.25)',
                display: 'flex', alignItems: 'center',
                borderRadius: 4,
                transition: 'color 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
            >
              <LogOut size={12} />
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
