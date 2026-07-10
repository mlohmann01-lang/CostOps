import React from 'react'
import { CONVERSION_STAGES, CONVERSION_INTRO } from '../lib/website/exposureReviewJourney'

// Program 10, Part 6 — Conversion Bridge. Purely descriptive/illustrative
// copy explaining how the Exposure Report expands into the full Certen
// platform. Does not deep-link into or redesign the actual internal pages.

const BORDER_DEFAULT = 'var(--border-default, 0.5px solid rgba(255,255,255,0.08))'
const TEAL = 'var(--teal, #1D9E75)'

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--bg-page, #0b0d10)',
  color: 'var(--text-primary, #f5f5f5)',
  fontFamily: 'inherit',
}

const sectionStyle: React.CSSProperties = {
  maxWidth: 760,
  margin: '0 auto',
  padding: '5rem 2rem',
}

const cardStyle: React.CSSProperties = {
  border: BORDER_DEFAULT,
  borderRadius: 14,
  padding: 20,
  background: 'var(--surface-card, rgba(255,255,255,0.03))',
}

export default function ExposureReviewConversion() {
  return (
    <div style={pageStyle}>
      <section style={sectionStyle}>
        <a href="/exposure-review/report" style={{ textDecoration: 'none', color: 'inherit', fontSize: 14, fontWeight: 500 }}>
          ← Certen
        </a>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '24px 0 0' }}>What Happens Next</h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary, #b7bcc4)', marginTop: 12, maxWidth: 640 }}>
          {CONVERSION_INTRO}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 28 }}>
          {CONVERSION_STAGES.map((stage) => (
            <div key={stage.stage} style={cardStyle}>
              <div style={{ fontSize: 12, color: TEAL, fontWeight: 700 }}>Stage {stage.stage}</div>
              <div style={{ fontSize: 17, fontWeight: 700, marginTop: 4 }}>{stage.title}</div>
              <div style={{ fontSize: 14, marginTop: 6, color: 'var(--text-secondary, #b7bcc4)' }}>{stage.description}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 36 }}>
          <a
            href="/welcome"
            style={{
              display: 'inline-block',
              padding: '13px 28px',
              borderRadius: 8,
              border: '0.5px solid rgba(255,255,255,0.25)',
              background: 'transparent',
              color: 'inherit',
              fontSize: 15,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              textDecoration: 'none',
            }}
          >
            Back to Certen
          </a>
        </div>
      </section>
    </div>
  )
}
