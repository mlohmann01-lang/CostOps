import { Link, useLocation } from 'wouter'
import {
  ShieldCheck, LayoutDashboard, Award, Play, TrendingUp,
  Activity, FileText, Settings, Plug
} from 'lucide-react'

const NAV_PLATFORM = [
  { label: 'Connector hub', icon: Plug, href: '/connectors', badge: 1, badgeType: 'warn' as const },
  { label: 'Command', icon: LayoutDashboard, href: '/all/command' },
  { label: 'Governance', icon: Award, href: '/all/governance' },
  { label: 'Execution', icon: Play, href: '/all/execution' },
  { label: 'Intelligence', icon: TrendingUp, href: '/all/intelligence' },
]

const NAV_SYSTEM = [
  { label: 'Sync jobs', icon: Activity, href: '/sync-jobs', badge: 2, badgeType: 'error' as const },
  { label: 'Audit log', icon: FileText, href: '/audit-log' },
  { label: 'Settings', icon: Settings, href: '/settings' },
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
          padding: '7px 18px',
          fontSize: 12,
          cursor: 'pointer',
          borderLeft: active ? '2px solid var(--c-teal-400)' : '2px solid transparent',
          color: active ? 'var(--c-teal-600)' : 'var(--text-secondary)',
          background: active ? 'var(--c-teal-50)' : 'transparent',
          fontWeight: active ? 500 : 400,
          transition: 'background 0.1s',
          textDecoration: 'none',
        }}
        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)' }}
        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        <Icon size={15} />
        <span style={{ flex: 1 }}>{label}</span>
        {badge !== undefined && (
          <span style={{
            fontSize: 10,
            fontWeight: 500,
            padding: '1px 6px',
            borderRadius: 10,
            background: badgeType === 'error' ? 'var(--c-red-50)' : 'var(--c-amber-50)',
            color: badgeType === 'error' ? 'var(--c-red-600)' : 'var(--c-amber-600)',
          }}>
            {badge}
          </span>
        )}
      </div>
    </Link>
  )
}

export function Sidebar() {
  const [location] = useLocation()

  function isActive(href: string) {
    if (href === '/connectors') return location === '/connectors'
    const base = href.split('/').slice(2).join('/')
    return location.includes(base) && base !== ''
  }

  return (
    <nav
      style={{
        width: 188,
        minWidth: 188,
        background: 'var(--surface-0)',
        borderRight: '0.5px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Logo */}
      <div style={{
        padding: '18px 18px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderBottom: '0.5px solid var(--border-subtle)',
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: 6,
          background: 'var(--c-teal-400)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ShieldCheck size={14} color="#fff" />
        </div>
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Certen</span>
      </div>

      {/* Platform section */}
      <div style={{ paddingTop: 8 }}>
        <div style={{
          fontSize: 10, color: 'var(--text-tertiary)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
          padding: '10px 18px 4px',
        }}>
          Platform
        </div>
        {NAV_PLATFORM.map(item => (
          <NavItem
            key={item.href}
            {...item}
            active={item.href === '/connectors' ? location === '/connectors' : location.includes(item.href.split('/').slice(2).join('/')) && item.href.split('/').slice(2).join('/') !== ''}
          />
        ))}
      </div>

      {/* System section */}
      <div style={{ marginTop: 8 }}>
        <div style={{
          fontSize: 10, color: 'var(--text-tertiary)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
          padding: '10px 18px 4px',
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
      <div style={{
        marginTop: 'auto',
        padding: '12px 18px',
        borderTop: '0.5px solid var(--border-subtle)',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 11, color: 'var(--c-teal-600)',
          background: 'var(--c-teal-50)',
          padding: '4px 9px', borderRadius: 20,
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--c-teal-400)' }} />
          Data trust: 91%
        </div>
      </div>
    </nav>
  )
}
