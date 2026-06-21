import React from 'react'
import { EXPOSURE_REVIEW_START } from '../lib/website/exposureReviewJourney'

// Program 10, Part 1 — public, unauthenticated entry point into the M365
// Exposure Review journey. Reached via the website's "Run Free Exposure
// Review" CTA. Like LandingPage.tsx, this is NOT wrapped in <Shell> and is
// NOT behind RequireRuntime — it is reachable by anonymous prospects.

const BORDER_DEFAULT = 'var(--border-default, 0.5px solid rgba(255,255,255,0.08))'
const TEAL = 'var(--teal, #1D9E75)'

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--bg-page, #0b0d10)',
  color: 'var(--text-primary, #f5f5f5)',
  fontFamily: 'inherit',
  display: 'flex',
  flexDirection: 'column',
}

const sectionStyle: React.CSSProperties = {
  maxWidth: 760,
  margin: '0 auto',
  padding: '5rem 2rem',
  textAlign: 'center',
  flex: 1,
}

export default function ExposureReviewStart() {
  const content = EXPOSURE_REVIEW_START

  return (
    <div style={pageStyle}>
      <section style={sectionStyle}>
        <a href="/welcome" style={{ textDecoration: 'none', color: 'inherit', fontSize: 14, fontWeight: 500 }}>
          ← Certen
        </a>
        <h1 style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.25, margin: '28px 0 0' }}>{content.headline}</h1>
        <p style={{ fontSize: 17, color: 'var(--text-secondary, #b7bcc4)', maxWidth: 620, margin: '20px auto 0' }}>
          {content.subheadline}
        </p>
        <div
          style={{
            border: BORDER_DEFAULT,
            borderRadius: 12,
            background: 'var(--surface-card, rgba(255,255,255,0.03))',
            marginTop: 32,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            fontSize: 12,
            color: 'var(--text-secondary, #b7bcc4)',
          }}
        >
          {content.trustBanner.map((assurance, idx) => (
            <span
              key={assurance}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                borderLeft: idx === 0 ? 'none' : '0.5px solid rgba(255,255,255,0.12)',
              }}
            >
              <span style={{ color: TEAL }}>✓</span> {assurance}
            </span>
          ))}
        </div>
        <div style={{ marginTop: 32 }}>
          <a
            href={content.primaryCtaHref}
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
            {content.primaryCta}
          </a>
        </div>
      </section>
    </div>
  )
}
