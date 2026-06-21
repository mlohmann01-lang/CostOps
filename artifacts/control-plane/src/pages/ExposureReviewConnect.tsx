import React, { useState } from 'react'
import {
  EXPOSURE_REVIEW_CONNECT,
  CONNECT_SIMULATED_DELAY_MS,
  type ConnectState,
} from '../lib/website/exposureReviewJourney'

// Program 10, Part 2 — simulated M365 connection step. This is NOT
// production OAuth: there is no redirect to a real Microsoft identity
// endpoint, no application secret, no real auth library call. It is a local
// state machine (NOT_CONNECTED -> CONNECTING -> CONNECTED) driven by a
// button click and a fixed deterministic delay, purely to demonstrate the
// workflow.

const BORDER_DEFAULT = 'var(--border-default, 0.5px solid rgba(255,255,255,0.08))'
const TEAL = 'var(--teal, #1D9E75)'

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--bg-page, #0b0d10)',
  color: 'var(--text-primary, #f5f5f5)',
  fontFamily: 'inherit',
}

const sectionStyle: React.CSSProperties = {
  maxWidth: 620,
  margin: '0 auto',
  padding: '5rem 2rem',
  textAlign: 'center',
}

const cardStyle: React.CSSProperties = {
  border: BORDER_DEFAULT,
  borderRadius: 14,
  padding: 24,
  background: 'var(--surface-card, rgba(255,255,255,0.03))',
  textAlign: 'left',
  marginTop: 28,
}

export default function ExposureReviewConnect() {
  const content = EXPOSURE_REVIEW_CONNECT
  const [state, setState] = useState<ConnectState>('NOT_CONNECTED')

  function handleConnect() {
    setState('CONNECTING')
    setTimeout(() => {
      setState('CONNECTED')
    }, CONNECT_SIMULATED_DELAY_MS)
  }

  return (
    <div style={pageStyle}>
      <section style={sectionStyle}>
        <a href="/exposure-review" style={{ textDecoration: 'none', color: 'inherit', fontSize: 14, fontWeight: 500 }}>
          ← Certen
        </a>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: '24px 0 0' }}>Connect Microsoft 365</h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary, #b7bcc4)', marginTop: 12 }}>
          This is a simulated connection for the purposes of the Exposure Review demonstration. No real Microsoft
          authentication is performed.
        </p>

        <div style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--text-tertiary, #8a8f99)' }}>
            Requested permissions
          </div>
          <ul style={{ margin: '12px 0 0', paddingLeft: 18, fontSize: 14, lineHeight: 1.8 }}>
            {content.permissions.map((permission) => (
              <li key={permission} style={{ fontFamily: 'monospace' }}>
                {permission}
              </li>
            ))}
          </ul>
        </div>

        <div style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--text-tertiary, #8a8f99)' }}>
            Security statement
          </div>
          <ul style={{ margin: '12px 0 0', paddingLeft: 18, fontSize: 14, lineHeight: 1.8, color: 'var(--text-secondary, #b7bcc4)' }}>
            {content.securityStatement.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>

        <div style={{ marginTop: 32 }}>
          {state === 'NOT_CONNECTED' && (
            <button
              type="button"
              onClick={handleConnect}
              style={{
                padding: '13px 28px',
                borderRadius: 8,
                border: 'none',
                background: TEAL,
                color: '#06201c',
                fontSize: 16,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {content.connectCta}
            </button>
          )}

          {state === 'CONNECTING' && (
            <div style={{ fontSize: 15, color: 'var(--text-secondary, #b7bcc4)' }}>Connecting to Microsoft 365…</div>
          )}

          {state === 'CONNECTED' && (
            <>
              <div style={{ fontSize: 15, color: TEAL, fontWeight: 500, marginBottom: 18 }}>
                ✓ Microsoft 365 connected (read-only)
              </div>
              <a
                href={content.beginDiscoveryHref}
                style={{
                  display: 'inline-block',
                  padding: '13px 28px',
                  borderRadius: 8,
                  border: 'none',
                  background: TEAL,
                  color: '#06201c',
                  fontSize: 16,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textDecoration: 'none',
                }}
              >
                {content.beginDiscoveryCta}
              </a>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
