import React, { useEffect, useRef, useState } from 'react'
import {
  DISCOVERY_COMPLETE_HEADLINE,
  DISCOVERY_COMPLETE_SUBHEADLINE,
  DISCOVERY_VIEW_REPORT_CTA,
  DISCOVERY_VIEW_REPORT_HREF,
  getExposureReviewSessionId,
} from '../lib/website/exposureReviewJourney'
import {
  getExposureReviewConfigured,
  runExposureReviewDiscovery,
  getExposureReviewDiscoveryStatus,
  type ExposureReviewDiscoveryRun,
} from '../lib/website/exposure-review-client'

// Program 11 — real read-only Microsoft Graph discovery progress. Replaces
// the Program 10 fixed-timer simulation with polling against
// /api/exposure-review/m365/discovery/status, which reflects the actual
// m365-discovery-service.ts run state.

const NOT_CONFIGURED_MESSAGE = 'Discovery is not configured for this environment.'
const POLL_INTERVAL_MS = 1500

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
}

function statusColor(status: string): string {
  if (status === 'COMPLETED') return TEAL
  if (status === 'RUNNING') return 'var(--text-primary, #f5f5f5)'
  if (status === 'FAILED') return '#e5484d'
  return 'var(--text-tertiary, #8a8f99)'
}

function statusLabel(status: string): string {
  switch (status) {
    case 'QUEUED':
      return 'Queued'
    case 'RUNNING':
      return 'Running'
    case 'COMPLETED':
      return 'Completed'
    case 'FAILED':
      return 'Failed'
    default:
      return status
  }
}

export default function ExposureReviewDiscovery() {
  const [configured, setConfigured] = useState<boolean | undefined>(undefined)
  const [run, setRun] = useState<ExposureReviewDiscoveryRun | undefined>(undefined)
  const tenantId = getExposureReviewSessionId()
  const startedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    getExposureReviewConfigured()
      .then((result) => {
        if (!cancelled) setConfigured(result.configured)
      })
      .catch(() => {
        if (!cancelled) setConfigured(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (configured !== true || startedRef.current) return
    startedRef.current = true
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    async function poll() {
      try {
        const status = await getExposureReviewDiscoveryStatus(tenantId)
        if (cancelled) return
        if (status.run) {
          setRun(status.run)
          if (status.run.status === 'RUNNING' || status.run.status === 'NOT_STARTED') {
            timer = setTimeout(poll, POLL_INTERVAL_MS)
          }
          return
        }
      } catch {
        // fall through to attempt a run
      }
      try {
        const started = await runExposureReviewDiscovery(tenantId)
        if (cancelled) return
        setRun(started.run)
        if (started.run.status === 'RUNNING') timer = setTimeout(poll, POLL_INTERVAL_MS)
      } catch {
        if (!cancelled) {
          setRun({
            id: 'client-error',
            tenantId,
            status: 'FAILED',
            steps: [],
            lastUpdatedAt: new Date().toISOString(),
            errors: ['Microsoft 365 Exposure Review could not be completed.'],
          })
        }
      }
    }

    poll()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [configured, tenantId])

  if (configured === false) {
    return (
      <div style={pageStyle}>
        <section style={sectionStyle}>
          <a href="/exposure-review/connect" style={{ textDecoration: 'none', color: 'inherit', fontSize: 14, fontWeight: 500 }}>
            ← Certen
          </a>
          <h1 style={{ fontSize: 30, fontWeight: 800, margin: '24px 0 0' }}>Running Discovery</h1>
          <p style={{ fontSize: 15, color: 'var(--text-secondary, #b7bcc4)', marginTop: 12 }}>{NOT_CONFIGURED_MESSAGE}</p>
        </section>
      </div>
    )
  }

  const allComplete = run?.status === 'COMPLETED' || run?.status === 'PARTIAL'
  const failed = run?.status === 'FAILED'

  return (
    <div style={pageStyle}>
      <section style={sectionStyle}>
        <a href="/exposure-review/connect" style={{ textDecoration: 'none', color: 'inherit', fontSize: 14, fontWeight: 500 }}>
          ← Certen
        </a>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: '24px 0 0' }}>Running Discovery</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary, #b7bcc4)', marginTop: 8 }}>
          Read-only Microsoft Graph discovery in progress.
        </p>

        <div
          style={{
            border: BORDER_DEFAULT,
            borderRadius: 14,
            background: 'var(--surface-card, rgba(255,255,255,0.03))',
            marginTop: 28,
            overflow: 'hidden',
          }}
        >
          {(run?.steps ?? []).map((step, idx) => (
            <div
              key={step.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                borderTop: idx === 0 ? 'none' : '0.5px solid rgba(255,255,255,0.08)',
              }}
            >
              <span style={{ fontSize: 14 }}>
                Step {idx + 1} {step.label}
              </span>
              <span style={{ fontSize: 13, fontWeight: 500, color: statusColor(step.status) }}>{statusLabel(step.status)}</span>
            </div>
          ))}
        </div>

        {failed && (
          <div style={{ marginTop: 28, fontSize: 14, color: '#e5484d' }}>
            {run?.errors?.[0] ?? 'Microsoft 365 Exposure Review could not be completed.'}
          </div>
        )}

        {allComplete && (
          <div style={{ marginTop: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{DISCOVERY_COMPLETE_HEADLINE}</div>
            <div style={{ fontSize: 15, color: TEAL, marginTop: 6 }}>{DISCOVERY_COMPLETE_SUBHEADLINE}</div>
            <a
              href={DISCOVERY_VIEW_REPORT_HREF}
              style={{
                display: 'inline-block',
                marginTop: 22,
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
              {DISCOVERY_VIEW_REPORT_CTA}
            </a>
          </div>
        )}
      </section>
    </div>
  )
}
