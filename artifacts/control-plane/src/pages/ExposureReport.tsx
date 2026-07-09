import React from 'react'
import { Shell } from '../components/layout/Shell'
import { StatusChip, statusToneFor } from '../components/executive/StatusChip'
import { formatCurrency, formatPercent } from '../lib/display/formatters'
import { getDefaultExposureReport } from '../lib/exposureReport/defaultExposureReport'

const cardStyle: React.CSSProperties = {
  border: 'var(--border-default)',
  borderRadius: 14,
  padding: 18,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  background: 'var(--surface-card)',
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: 'var(--border-default)', borderRadius: 14, padding: 16, background: 'var(--surface-card)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>{value}</div>
    </div>
  )
}

function formatMaybeValue(value: number | 'Awaiting discovery' | undefined): string {
  if (value === undefined) return 'Not available'
  if (value === 'Awaiting discovery') return 'Awaiting discovery'
  return formatCurrency(value)
}

export default function ExposureReport() {
  const report = getDefaultExposureReport()
  const { summary, keyFindings, domains, economicControlChain, nextSteps, trustAssurances, expansionBlock } = report

  return (
    <Shell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{report.title}</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
            A forwardable executive summary of technology exposure, ownership gaps, governance gaps and value
            opportunities across the organisation.
          </p>
        </div>

        {/* Section 1 — Executive Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>1. Executive Summary</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14 }}>
            <MetricCard label="Potential Annual Value" value={formatCurrency(summary.potentialAnnualValue)} />
            <MetricCard label="Inactive Licences" value={summary.inactiveLicences?.toString() ?? 'Not available'} />
            <MetricCard label="Ownerless Licences" value={summary.ownerlessLicences?.toString() ?? 'Not available'} />
            <MetricCard label="Copilot Exposure" value={summary.copilotExposure?.toString() ?? 'Not available'} />
            <MetricCard label="Governance Findings" value={summary.governanceFindings?.toString() ?? 'Not available'} />
            <MetricCard
              label="Exposure Score"
              value={summary.exposureScore !== undefined ? `${summary.exposureScore} / 100` : 'Not available'}
            />
          </div>
        </div>

        {/* Section 2 — Key Findings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>2. Key Findings</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {keyFindings.map((finding, idx) => (
              <div key={idx} style={cardStyle}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{finding.finding}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  <strong>Impact: </strong>
                  {finding.impact}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  <strong>Recommended Action: </strong>
                  {finding.recommendedAction}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                  <strong>Potential Value: </strong>
                  {finding.potentialValue !== undefined ? formatCurrency(finding.potentialValue) : 'Not available'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3 — Exposure Domains */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>3. Exposure Domains</h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)' }}>
            Certen tracks exposure across technology, AI, ownership, governance and renewals — not just Microsoft 365.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
            {domains.map((domain) => (
              <div key={domain.domain} style={cardStyle}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{domain.domain}</div>
                <StatusChip label={domain.status} tone={statusToneFor(domain.status)} />
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  Issue Count: {domain.issueCount ?? 'Not available'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  Potential Value: {formatMaybeValue(domain.potentialValue)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4 — Economic Control Readiness */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>4. Economic Control Readiness</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
            {economicControlChain.stages.map((stage) => (
              <div key={stage.key} style={{ ...cardStyle, padding: 12, gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{stage.title}</div>
                <StatusChip label={stage.active ? 'Active' : 'Not Active'} tone={stage.active ? 'success' : 'neutral'} />
              </div>
            ))}
          </div>
        </div>

        {/* Section 5 — What Happens Next */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>5. What Happens Next</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {nextSteps.map((step) => (
              <div key={step.step} style={{ display: 'flex', alignItems: 'center', gap: 12, border: 'var(--border-default)', borderRadius: 12, padding: '10px 14px', background: 'var(--surface-card)' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-tertiary)' }}>{step.step}.</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{step.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 6 — About This Review */}
        <div style={cardStyle}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>6. About This Review</h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
            This review was conducted under strict, reversible, non-disruptive controls.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {trustAssurances.map((assurance) => (
              <div key={assurance} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <span aria-hidden="true" style={{ color: 'var(--green)', fontWeight: 800 }}>
                  ✓
                </span>
                {assurance}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Expansion Block */}
        <div style={{ ...cardStyle, background: 'var(--surface-elevated, var(--surface-card))' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Beyond This Report</h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{expansionBlock}</p>
        </div>
      </div>
    </Shell>
  )
}
