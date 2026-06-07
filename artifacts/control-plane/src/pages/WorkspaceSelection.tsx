import { useLocation } from 'wouter'
import { ShieldCheck, FlaskConical, Zap, CheckCircle } from 'lucide-react'
import { useRuntimeContext } from '../lib/runtimeContext'

const card: React.CSSProperties = {
  background: 'var(--surface-0)',
  border: '0.5px solid var(--border-subtle)',
  borderRadius: 14,
  padding: '28px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  transition: 'border-color 0.15s',
}

const pill: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.06em',
  padding: '3px 8px',
  borderRadius: 20,
  textTransform: 'uppercase' as const,
}

const feature: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 12,
  color: 'var(--text-secondary)',
}

export default function WorkspaceSelection() {
  const [, navigate] = useLocation()
  const runtime = useRuntimeContext()

  function enter(env: 'DEMO' | 'LIVE') {
    runtime.selectEnvironment(env)
    navigate('/workspace')
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--surface-1)',
      padding: '32px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 860 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: 'var(--c-teal-400)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <ShieldCheck size={19} color="#fff" />
          </div>
          <span style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-primary)' }}>Certen</span>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }}>
          Choose your overview mode
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 28px' }}>
          Select whether you want to explore Certen safely with synthetic data, or connect to a live governed tenant.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Demo Mode */}
          <div
            style={card}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-medium)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'rgba(20,184,166,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <FlaskConical size={20} color="var(--c-teal-400)" />
              </div>
              <span style={{ ...pill, background: 'rgba(20,184,166,0.12)', color: 'var(--c-teal-400)' }}>
                Safe · Synthetic
              </span>
            </div>

            <div>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                Demo Mode
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Explore Certen using deterministic synthetic evidence, simulated execution, governed approvals, and drift scenarios. No production systems are connected.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                'Synthetic evidence & connectors',
                'Live execution disabled',
                'Simulated approvals & drift',
                'Safe to explore — no production impact',
              ].map(f => (
                <div key={f} style={feature}>
                  <CheckCircle size={13} color="var(--c-teal-400)" style={{ flexShrink: 0 }} />
                  {f}
                </div>
              ))}
            </div>

            <button
              onClick={() => enter('DEMO')}
              style={{
                marginTop: 4,
                padding: '10px 0',
                background: 'var(--c-teal-400)',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                color: '#fff',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Enter Demo Mode
            </button>
          </div>

          {/* Live Tenant */}
          <div
            style={card}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-medium)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'rgba(245,158,11,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Zap size={20} color="var(--c-amber-400)" />
              </div>
              <span style={{ ...pill, background: 'rgba(245,158,11,0.12)', color: 'var(--c-amber-400)' }}>
                Live · Governed
              </span>
            </div>

            <div>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                Live Tenant
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Connect to real tenant data, live connectors, governance controls, approvals, dry-runs, outcome ledgering, and drift monitoring.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                'Real tenant data via live connectors',
                'Approval-gated governed actions',
                'Dry-run & read-only by default',
                'Outcome ledgering & drift monitoring',
              ].map(f => (
                <div key={f} style={feature}>
                  <CheckCircle size={13} color="var(--c-amber-400)" style={{ flexShrink: 0 }} />
                  {f}
                </div>
              ))}
            </div>

            <button
              onClick={() => enter('LIVE')}
              style={{
                marginTop: 4,
                padding: '10px 0',
                background: 'transparent',
                border: '0.5px solid var(--c-amber-400)',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--c-amber-400)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              Enter Live Tenant
            </button>
          </div>

        </div>

        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 24, textAlign: 'center' }}>
          You can switch modes at any time from platform settings.
        </p>
      </div>
    </div>
  )
}
