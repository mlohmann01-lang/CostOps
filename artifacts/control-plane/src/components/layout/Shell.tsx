import { type ReactNode } from 'react'
import { useLocation } from 'wouter'
import { Sidebar } from './Sidebar'
import { useRuntimeContext } from '../../lib/runtimeContext'

interface ShellProps {
  children: ReactNode
}

export function Shell({ children }: ShellProps) {
  const [, navigate] = useLocation()
  const runtime = useRuntimeContext()
  const isDemo = runtime.environment === 'DEMO'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0d0f0e', overflow: 'hidden' }}>
      {/* Demo amber banner — always visible at top in demo mode */}
      {isDemo && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '6px 20px',
          background: 'rgba(239,159,39,0.08)',
          borderBottom: '0.5px solid rgba(239,159,39,0.22)',
          flexShrink: 0,
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '2px 8px',
            background: 'rgba(239,159,39,0.15)',
            border: '0.5px solid rgba(239,159,39,0.30)',
            borderRadius: 20,
            fontSize: 10,
            fontWeight: 600,
            color: '#EF9F27',
            letterSpacing: '0.06em',
            textTransform: 'uppercase' as const,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#EF9F27', display: 'inline-block' }} />
            Demo
          </div>
          <span style={{ fontSize: 12, color: 'rgba(239,159,39,0.65)' }}>
            Synthetic evidence only · No production systems connected · Live execution disabled
          </span>
          <span style={{ fontSize: 11, color: 'rgba(239,159,39,0.35)', marginLeft: 6 }}>
            tenant {runtime.tenantId}
          </span>
          <button
            onClick={() => navigate('/workspace')}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: '0.5px solid rgba(239,159,39,0.25)',
              borderRadius: 5,
              fontSize: 11,
              color: 'rgba(239,159,39,0.60)',
              cursor: 'pointer',
              padding: '3px 9px',
              fontFamily: 'inherit',
            }}
          >
            Switch workspace
          </button>
        </div>
      )}

      {/* Main layout: sidebar + content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
