import React, { useState, useRef, useEffect } from 'react'
import { ShieldCheck, Bell, ChevronDown, LogOut } from 'lucide-react'
import { useRuntimeContext } from '../../lib/runtimeContext'
import { clearSession } from '../../lib/auth/session'
import { useWorkspace } from '../../lib/workspaceContext'

export function TopBar() {
  const runtime = useRuntimeContext()
  const workspace = useWorkspace()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSignOut() {
    clearSession()
    localStorage.removeItem('certen.workspace')
    localStorage.removeItem('certen.workspace.mode')
    window.location.href = '/'
  }

  function handleSwitchEnv(env: 'DEMO' | 'LIVE') {
    runtime.selectEnvironment(env)
    localStorage.setItem('certen.workspace.mode', env)
    setDropdownOpen(false)
  }

  const envLabel = runtime.hasSelectedEnvironment ? runtime.environment : 'DEMO'
  const isDemo = envLabel !== 'LIVE'

  return (
    <header style={{
      height: 52,
      borderBottom: 'var(--border-default)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      background: 'var(--surface-0)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <ShieldCheck size={18} color="var(--accent)" />
        <strong style={{ fontSize: 14, letterSpacing: '0.5px' }}>Certen</strong>
        <span style={{ margin: '0 8px', color: 'var(--border-default)' }}>|</span>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Enterprise Console</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingRight: 16, borderRight: 'var(--border-default)' }}>
           <span style={{ width: 6, height: 6, borderRadius: '50%', background: workspace.runtimeState === 'LIVE_UNCONNECTED' ? 'var(--text-muted)' : 'var(--success)' }} />
           <span style={{ fontSize: 12, fontWeight: 500, color: workspace.runtimeState === 'LIVE_UNCONNECTED' ? 'var(--text-secondary)' : 'var(--success)' }}>
             {workspace.runtimeState === 'LIVE_UNCONNECTED' ? 'System Offline' : `Data Trust ${workspace.connectedCount > 0 ? Math.min(70 + workspace.connectedCount * 7, 97) : 91}%`}
           </span>
        </div>

        {/* Environment selector */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(o => !o)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              color: isDemo ? 'var(--text-secondary)' : 'var(--accent-bright)',
              background: isDemo ? 'rgba(255,255,255,0.04)' : 'var(--accent-soft)',
              border: `0.5px solid ${isDemo ? 'rgba(255,255,255,0.1)' : 'var(--border-gold)'}`,
              borderRadius: 20,
              padding: '4px 12px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.2s'
            }}
          >
            {envLabel}
            <ChevronDown size={12} />
          </button>

          {dropdownOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              background: 'var(--surface-1)',
              border: '1px solid var(--border-default)',
              borderRadius: 12,
              minWidth: 200,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              zIndex: 100,
              overflow: 'hidden',
            }}>
              <div style={{ padding: '8px 14px 6px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-muted)' }}>
                Environment
              </div>
              {(['DEMO', 'LIVE'] as const).map(env => (
                <button
                  key={env}
                  onClick={() => handleSwitchEnv(env)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 14px',
                    fontSize: 13,
                    fontWeight: runtime.environment === env ? 600 : 400,
                    color: runtime.environment === env ? 'var(--accent-bright)' : 'var(--text-primary)',
                    background: runtime.environment === env ? 'var(--accent-soft)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {env === 'DEMO' ? 'Demo Workspace' : 'Live Workspace'}
                </button>
              ))}
              <div style={{ height: '1px', background: 'var(--border-default)', margin: '4px 0' }} />
              <button
                onClick={handleSignOut}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 14px',
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>

        <button style={{ background:'transparent', border:'none', padding:6, color:'var(--text-secondary)', cursor:'pointer' }}>
          <Bell size={16} />
        </button>
        <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent-bright)', border: '1px solid var(--border-gold)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>D</span>
      </div>
    </header>
  )
}
