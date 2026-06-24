import React, { useEffect, useState } from 'react'
import { EXPOSURE_REVIEW_CONNECT, getExposureReviewSessionId } from '../lib/website/exposureReviewJourney'
import {
  getExposureReviewConfigured,
  startExposureReviewConnect,
  getExposureReviewConnectStatus,
  handleExposureReviewConnectCallback,
} from '../lib/website/exposure-review-client'

// Program 11 — real M365 connection step. Replaces the Program 10 simulated
// setTimeout state machine with a real call to the api-server, which wires
// to MicrosoftOAuthService / EncryptedMicrosoftTokenStore. This page never
// fabricates a CONNECTED state: it only reaches CONNECTED after the backend
// confirms a real OAuth callback succeeded (see ExposureReviewConnectCallback
// handling below, driven by the ?state=&code= query params on return from
// Microsoft's consent screen).

type PageState = 'NOT_CONNECTED' | 'CONNECTING' | 'CONNECTED' | 'DISCOVERY_READY' | 'ERROR'

const NOT_CONFIGURED_MESSAGE = 'Microsoft 365 connection is not configured for this environment.'

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
  const [state, setState] = useState<PageState>('NOT_CONNECTED')
  const [configured, setConfigured] = useState<boolean | undefined>(undefined)
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
  const tenantId = getExposureReviewSessionId()

  useEffect(() => {
    let cancelled = false
    getExposureReviewConfigured()
      .then((result) => {
        if (!cancelled) setConfigured(result.configured)
      })
      .catch(() => {
        if (!cancelled) setConfigured(false)
      })

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code') ?? undefined
    const oauthState = params.get('state')
    const oauthError = params.get('error') ?? undefined

    if (oauthState) {
      setState('CONNECTING')
      handleExposureReviewConnectCallback(tenantId, { code, state: oauthState, error: oauthError })
        .then((result) => {
          if (cancelled) return
          if ('error' in result) {
            setState('ERROR')
            setErrorMessage(result.reason)
            return
          }
          setState('CONNECTED')
          window.history.replaceState({}, '', window.location.pathname)
        })
        .catch((error) => {
          if (cancelled) return
          setState('ERROR')
          setErrorMessage(error instanceof Error ? error.message : 'Microsoft 365 Exposure Review could not be completed.')
        })
      return () => {
        cancelled = true
      }
    }

    getExposureReviewConnectStatus(tenantId)
      .then((result) => {
        if (cancelled) return
        if (result.connection?.status === 'CONNECTED') setState('CONNECTED')
        else if (result.connection?.status === 'ERROR') {
          setState('ERROR')
          setErrorMessage(result.connection.failureReason)
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [tenantId])

  async function handleConnect() {
    setState('CONNECTING')
    setErrorMessage(undefined)
    try {
      const result = await startExposureReviewConnect(tenantId)
      if (!result.configured) {
        setState('ERROR')
        setErrorMessage(result.reason)
        return
      }
      if ('error' in result) {
        setState('ERROR')
        setErrorMessage('Required read-only permission is missing.')
        return
      }
      window.location.href = result.authorizationUrl
    } catch (error) {
      setState('ERROR')
      setErrorMessage(error instanceof Error ? error.message : 'Microsoft 365 Exposure Review could not be completed.')
    }
  }

  if (configured === false) {
    return (
      <div style={pageStyle}>
        <section style={sectionStyle}>
          <a href="/welcome" style={{ textDecoration: 'none', color: 'inherit', fontSize: 14, fontWeight: 500 }}>
            ← Certen
          </a>
          <h1 style={{ fontSize: 30, fontWeight: 800, margin: '24px 0 0' }}>Connect Microsoft 365</h1>
          <p style={{ fontSize: 15, color: 'var(--text-secondary, #b7bcc4)', marginTop: 12, lineHeight: 1.65 }}>
            Live Microsoft 365 connection is not enabled in this environment.
          </p>
          <p style={{ fontSize: 14, color: 'var(--text-secondary, #b7bcc4)', marginTop: 8, lineHeight: 1.65 }}>
            You can continue with demo data or request a live onboarding session.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 28 }}>
            <a
              href="/exposure-review/report?mode=demo"
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '13px 0',
                borderRadius: 8,
                background: TEAL,
                color: '#06201c',
                fontWeight: 500,
                fontSize: 15,
                textDecoration: 'none',
              }}
            >
              View Demo Exposure Report
            </a>
            <a
              href="mailto:onboarding@certen.io?subject=Live%20Onboarding%20Request"
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '13px 0',
                borderRadius: 8,
                background: 'transparent',
                color: 'var(--text-primary, #f5f5f5)',
                fontWeight: 500,
                fontSize: 15,
                textDecoration: 'none',
                border: '0.5px solid rgba(255,255,255,0.25)',
              }}
            >
              Request Live Onboarding
            </a>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary, #8a8f99)', marginTop: 20 }}>
            Read-only review · No licence changes · No automated execution · Access revocable at any time
          </p>
        </section>
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <section style={sectionStyle}>
        <a href="/exposure-review" style={{ textDecoration: 'none', color: 'inherit', fontSize: 14, fontWeight: 500 }}>
          ← Certen
        </a>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: '24px 0 0' }}>Connect Microsoft 365</h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary, #b7bcc4)', marginTop: 12 }}>
          Certen requests read-only access to your Microsoft 365 tenant for the duration of this Exposure Review.
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

          {state === 'ERROR' && (
            <div>
              <div style={{ fontSize: 15, color: '#e5484d', fontWeight: 500, marginBottom: 18 }}>
                {errorMessage ?? 'Microsoft 365 Exposure Review could not be completed.'}
              </div>
              <button
                type="button"
                onClick={handleConnect}
                style={{
                  padding: '13px 28px',
                  borderRadius: 8,
                  border: '0.5px solid rgba(255,255,255,0.25)',
                  background: 'transparent',
                  color: 'inherit',
                  fontSize: 15,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Try Again
              </button>
            </div>
          )}

          {(state === 'CONNECTED' || state === 'DISCOVERY_READY') && (
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
