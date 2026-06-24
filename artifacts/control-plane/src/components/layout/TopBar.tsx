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
      height: 44,
      borderBottom: 'var(--border-default)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <ShieldCheck size={14} />
        <strong style={{ fontSize: 13 }}>Certen</strong>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 11, color: workspace.runtimeState === 'LIVE_UNCONNECTED' ? 'var(--text-secondary)' : 'var(--teal)' }}>
          {workspace.runtimeState === 'LIVE_UNCONNECTED' ? 'Data trust N/A' : `Data trust ${workspace.connectedCount > 0 ? Math.min(70 + workspace.connectedCount * 7, 97) : 91}%`}
        </span>

        {/* Environment selector */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(o => !o)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11,
              fontWeight: 600,
              color: isDemo ? 'var(--teal, #1D9E75)' : '#f59e0b',
              background: isDemo ? 'rgba(29,158,117,0.1)' : 'rgba(245,158,11,0.1)',
              border: `0.5px solid ${isDemo ? 'rgba(29,158,117,0.35)' : 'rgba(245,158,11,0.35)'}`,
              borderRadius: 20,
              padding: '3px 10px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {envLabel}
            <ChevronDown size={10} />
          </button>

          {dropdownOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              background: 'var(--surface-2, #161a20)',
              border: '0.5px solid rgba(255,255,255,0.12)',
              borderRadius: 10,
              minWidth: 180,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              zIndex: 100,
              overflow: 'hidden',
            }}>
              <div style={{ padding: '6px 12px 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-tertiary, #8a8f99)' }}>
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
                    padding: '9px 14px',
                    fontSize: 13,
                    fontWeight: runtime.environment === env ? 600 : 400,
                    color: runtime.environment === env ? 'var(--teal, #1D9E75)' : 'var(--text-primary, #f5f5f5)',
                    background: runtime.environment === env ? 'rgba(29,158,117,0.08)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {env === 'DEMO' ? 'Demo Workspace' : 'Live Workspace'}
                </button>
              ))}
              <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
              <button
                onClick={handleSignOut}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  width: '100%',
                  textAlign: 'left',
                  padding: '9px 14px',
                  fontSize: 13,
                  color: 'var(--text-secondary, #b7bcc4)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <LogOut size={12} /> Sign out
              </button>
            </div>
          )}
        </div>

        <Bell size={14} style={{ cursor: 'pointer', color: 'var(--text-secondary, #b7bcc4)' }} />
        <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--teal-bg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>D</span>
      </div>
    </header>
  )
}
