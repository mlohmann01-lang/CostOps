import React, { useEffect, useState } from 'react'

const TEAL = 'var(--teal, #1D9E75)'
const BORDER_DEFAULT = 'var(--border-default, 0.5px solid rgba(255,255,255,0.08))'

type WorkspaceMode = 'DEMO' | 'LIVE'

function getStoredMode(): WorkspaceMode {
  const v = localStorage.getItem('certen.workspace.mode')
  return v === 'LIVE' ? 'LIVE' : 'DEMO'
}

export default function ExposureReviewWorkspace() {
  const [mode, setMode] = useState<WorkspaceMode>('DEMO')

  useEffect(() => {
    setMode(getStoredMode())
  }, [])

  function selectMode(m: WorkspaceMode) {
    localStorage.setItem('certen.workspace.mode', m)
    setMode(m)
  }

  const cardBase: React.CSSProperties = {
    borderRadius: 14,
    padding: 24,
    background: 'var(--surface-card, rgba(255,255,255,0.03))',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-page, #0b0d10)',
      color: 'var(--text-primary, #f5f5f5)',
      fontFamily: 'inherit',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{ width: '100%', maxWidth: 680 }}>

        <a href="/welcome" style={{ textDecoration: 'none', color: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 36 }}>
          <span style={{ width: 28, height: 28, borderRadius: 6, background: TEAL, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 600 }}>C</span>
          <span style={{ fontSize: 16, fontWeight: 500 }}>Certen</span>
        </a>

        <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 10px' }}>Choose your workspace</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary, #b7bcc4)', margin: '0 0 28px', lineHeight: 1.65 }}>
          Start with demo data, or connect your Microsoft 365 tenant for a live read-only review.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Demo card */}
          <div
            style={{ ...cardBase, border: mode === 'DEMO' ? `1px solid ${TEAL}` : BORDER_DEFAULT }}
            onClick={() => selectMode('DEMO')}
          >
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: TEAL, marginBottom: 10 }}>Demo Workspace</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>Explore with sample data</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary, #b7bcc4)', margin: '0 0 24px', lineHeight: 1.65, flex: 1 }}>
              Explore Certen with a realistic sample tenant. No connection required. Instant access to the full exposure report, recommendations and value chain.
            </p>
            <a
              href="/exposure-review/report?mode=demo"
              onClick={() => localStorage.setItem('certen.workspace.mode', 'DEMO')}
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '11px 0',
                borderRadius: 8,
                background: TEAL,
                color: '#06201c',
                fontWeight: 500,
                fontSize: 14,
                textDecoration: 'none',
              }}
            >
              Open Demo Report
            </a>
          </div>

          {/* Live card */}
          <div
            style={{ ...cardBase, border: mode === 'LIVE' ? `1px solid ${TEAL}` : BORDER_DEFAULT }}
            onClick={() => selectMode('LIVE')}
          >
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-tertiary, #8a8f99)', marginBottom: 10 }}>Live Workspace</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>Connect Microsoft 365</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary, #b7bcc4)', margin: '0 0 24px', lineHeight: 1.65, flex: 1 }}>
              Connect your Microsoft 365 tenant using read-only permissions. Certen will not modify licences, users, groups or tenant settings.
            </p>
            <a
              href="/exposure-review/connect?mode=live"
              onClick={() => localStorage.setItem('certen.workspace.mode', 'LIVE')}
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '11px 0',
                borderRadius: 8,
                background: 'transparent',
                color: 'var(--text-primary, #f5f5f5)',
                fontWeight: 500,
                fontSize: 14,
                textDecoration: 'none',
                border: '0.5px solid rgba(255,255,255,0.25)',
              }}
            >
              Connect Live Microsoft 365
            </a>
          </div>
        </div>

        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20 }}>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary, #8a8f99)' }}>Current mode:</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: TEAL, border: `1px solid ${TEAL}`, borderRadius: 20, padding: '3px 10px' }}>{mode}</span>
          <button
            onClick={() => selectMode(mode === 'DEMO' ? 'LIVE' : 'DEMO')}
            style={{ fontSize: 11, color: 'var(--text-secondary, #b7bcc4)', background: 'transparent', border: BORDER_DEFAULT, borderRadius: 20, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Switch to {mode === 'DEMO' ? 'Live' : 'Demo'}
          </button>
        </div>

        <p style={{ fontSize: 11, color: 'var(--text-tertiary, #8a8f99)', textAlign: 'center', marginTop: 20 }}>
          Read-only review · No licence changes · No automated execution · Access revocable at any time
        </p>
      </div>
    </div>
  )
}
