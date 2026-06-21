import React from 'react'
import { getDefaultExposureReport } from '../lib/exposureReport/defaultExposureReport'
import { formatDate, formatCurrency } from '../lib/display/formatters'
import {
  EXPOSURE_REPORT_TRUST_STATEMENT,
  EXPOSURE_REPORT_BOOK_REVIEW_CTA,
  EXPOSURE_REPORT_BOOK_REVIEW_HREF,
  EXPOSURE_REPORT_EXPLORE_PLATFORM_CTA,
  EXPOSURE_REPORT_EXPLORE_PLATFORM_HREF,
} from '../lib/website/exposureReviewJourney'

// Program 10, Part 4 — Exposure Report delivery experience. Reuses
// defaultExposureReport.ts directly (the canonical report model from
// Program 8) rather than creating a parallel report model.

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

export default function ExposureReviewReport() {
  const report = getDefaultExposureReport()
  const summary = report.summary
  const findings = report.keyFindings

  return (
    <div style={pageStyle}>
      <section style={sectionStyle}>
        <a href="/exposure-review/discovery" style={{ textDecoration: 'none', color: 'inherit', fontSize: 14, fontWeight: 500 }}>
          ← Certen
        </a>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: '24px 0 0' }}>{report.title}</h1>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary, #8a8f99)', marginTop: 6 }}>
          Generated {formatDate(report.generatedAt ?? new Date())}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginTop: 28 }}>
          <div style={cardStyle}>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary, #8a8f99)' }}>Potential Annual Value</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>{formatCurrency(summary.potentialAnnualValue)}</div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary, #8a8f99)' }}>Inactive Licences</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>{summary.inactiveLicences ?? 'Not available'}</div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary, #8a8f99)' }}>Ownerless Licences</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>{summary.ownerlessLicences ?? 'Not available'}</div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary, #8a8f99)' }}>Governance Findings</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>{summary.governanceFindings ?? 'Not available'}</div>
          </div>
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 40 }}>Top Findings</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
          {findings.map((finding, idx) => (
            <div key={finding.finding} style={cardStyle}>
              <div style={{ fontSize: 13, fontWeight: 700, color: TEAL }}>Finding {idx + 1}</div>
              <div style={{ fontSize: 14, marginTop: 6 }}>{finding.finding}</div>
              <div style={{ fontSize: 13, marginTop: 6, color: 'var(--text-secondary, #b7bcc4)' }}>{finding.impact}</div>
              <div style={{ fontSize: 13, marginTop: 6, color: 'var(--text-secondary, #b7bcc4)' }}>
                Recommended: {finding.recommendedAction}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 32,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 16,
            fontSize: 13,
            color: 'var(--text-secondary, #b7bcc4)',
            textAlign: 'center',
          }}
        >
          {EXPOSURE_REPORT_TRUST_STATEMENT.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 32, flexWrap: 'wrap' }}>
          <a
            href={EXPOSURE_REPORT_BOOK_REVIEW_HREF}
            style={{
              display: 'inline-block',
              padding: '13px 28px',
              borderRadius: 8,
              border: 'none',
              background: TEAL,
              color: '#06201c',
              fontSize: 15,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              textDecoration: 'none',
            }}
          >
            {EXPOSURE_REPORT_BOOK_REVIEW_CTA}
          </a>
          <a
            href={EXPOSURE_REPORT_EXPLORE_PLATFORM_HREF}
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
            {EXPOSURE_REPORT_EXPLORE_PLATFORM_CTA}
          </a>
        </div>
      </section>
    </div>
  )
}
