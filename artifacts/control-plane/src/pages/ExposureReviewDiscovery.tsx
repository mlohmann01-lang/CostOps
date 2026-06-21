import React, { useEffect, useState } from 'react'
import {
  DISCOVERY_STEPS,
  DISCOVERY_STEP_DURATION_MS,
  DISCOVERY_SAMPLE_LABEL,
  DISCOVERY_COMPLETE_HEADLINE,
  DISCOVERY_COMPLETE_SUBHEADLINE,
  DISCOVERY_VIEW_REPORT_CTA,
  DISCOVERY_VIEW_REPORT_HREF,
  type DiscoveryStepStatus,
} from '../lib/website/exposureReviewJourney'

// Program 10, Part 3 — simulated, deterministic discovery progress
// experience. On mount, each of the 6 steps advances Queued -> Running ->
// Completed sequentially on a fixed timer (DISCOVERY_STEP_DURATION_MS per
// step). No randomness, no live telemetry — explicitly labelled as a sample
// discovery experience.

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

function statusLabel(status: DiscoveryStepStatus): string {
  return status
}

function statusColor(status: DiscoveryStepStatus): string {
  if (status === 'Completed') return TEAL
  if (status === 'Running') return 'var(--text-primary, #f5f5f5)'
  return 'var(--text-tertiary, #8a8f99)'
}

export default function ExposureReviewDiscovery() {
  const [statuses, setStatuses] = useState<DiscoveryStepStatus[]>(() => DISCOVERY_STEPS.map(() => 'Queued'))
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (currentIndex >= DISCOVERY_STEPS.length) return

    setStatuses((prev) => {
      const next = [...prev]
      next[currentIndex] = 'Running'
      return next
    })

    const timer = setTimeout(() => {
      setStatuses((prev) => {
        const next = [...prev]
        next[currentIndex] = 'Completed'
        return next
      })
      setCurrentIndex((idx) => idx + 1)
    }, DISCOVERY_STEP_DURATION_MS)

    return () => clearTimeout(timer)
  }, [currentIndex])

  const allComplete = statuses.every((status) => status === 'Completed')

  return (
    <div style={pageStyle}>
      <section style={sectionStyle}>
        <a href="/exposure-review/connect" style={{ textDecoration: 'none', color: 'inherit', fontSize: 14, fontWeight: 500 }}>
          ← Certen
        </a>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: '24px 0 0' }}>Running Discovery</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary, #b7bcc4)', marginTop: 8 }}>{DISCOVERY_SAMPLE_LABEL}</p>

        <div
          style={{
            border: BORDER_DEFAULT,
            borderRadius: 14,
            background: 'var(--surface-card, rgba(255,255,255,0.03))',
            marginTop: 28,
            overflow: 'hidden',
          }}
        >
          {DISCOVERY_STEPS.map((step, idx) => (
            <div
              key={step.step}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                borderTop: idx === 0 ? 'none' : '0.5px solid rgba(255,255,255,0.08)',
              }}
            >
              <span style={{ fontSize: 14 }}>
                Step {step.step} {step.label}
              </span>
              <span style={{ fontSize: 13, fontWeight: 500, color: statusColor(statuses[idx]) }}>
                {statusLabel(statuses[idx])}
              </span>
            </div>
          ))}
        </div>

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
