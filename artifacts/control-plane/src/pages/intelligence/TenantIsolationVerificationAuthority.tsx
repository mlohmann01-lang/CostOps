import React from 'react'
import { Shell } from '../../components/layout/Shell'
import { StatusChip, statusToneFor } from '../../components/executive/StatusChip'
import { getTenantIsolationAuthority } from '../../lib/tenantIsolation/tenant-isolation-authority'

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

function isolationTone(status: string) {
  if (status === 'VERIFIED' || status === 'READY') return 'success'
  if (status === 'PARTIAL') return 'warning'
  if (status === 'FAILED' || status === 'MISSING') return 'danger'
  return statusToneFor(status) // UNKNOWN falls through to neutral/unknown tone
}

function domainById(domains: ReturnType<typeof getTenantIsolationAuthority>['domains'], id: string) {
  return domains.find((d) => d.id === id)
}

export default function TenantIsolationVerificationAuthority() {
  const authority = getTenantIsolationAuthority()
  const { domains, checks, readiness } = authority

  const storage = domainById(domains, 'storage')!
  const api = domainById(domains, 'api')!
  const connector = domainById(domains, 'connector')!
  const discovery = domainById(domains, 'discovery')!
  const evidence = domainById(domains, 'evidence')!
  const exportDomain = domainById(domains, 'export')!

  const allEvidence = checks.flatMap((check) => check.evidence)

  return (
    <Shell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Tenant Isolation Verification Authority</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
            Answers one question honestly: can Certen prove that one tenant cannot access, modify, discover, export,
            query or infer another tenant's data? Every status below cites real evidence found in the platform's own
            code and tests — nothing here is assumed or fabricated.
          </p>
        </div>

        {/* Section 1 — Isolation Readiness */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>1. Isolation Readiness</h2>
            <StatusChip label={readiness.status} tone={isolationTone(readiness.status)} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>Score: {readiness.score} / 100</div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)' }}>
            Weighted: Storage 20%, API 20%, Connector 15%, Discovery 15%, Evidence 10%, Authority 10%, Export 5%,
            Headless 5%. No domain currently scores VERIFIED, so this score honestly reflects thin/partial
            enforcement evidence rather than a marketing claim of full isolation.
          </p>
        </div>

        {/* Section 2 — Verification Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>2. Verification Summary</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            <MetricCard label="Domains Evaluated" value={String(domains.length)} />
            <MetricCard label="Findings" value={String(readiness.findings.length)} />
            <MetricCard label="Recommendations" value={String(readiness.recommendations.length)} />
            <MetricCard label="Evidence Records" value={String(allEvidence.length)} />
          </div>
        </div>

        {/* Section 3 — Isolation Domains */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>3. Isolation Domains</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {domains.map((domain) => (
              <div key={domain.id} style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{domain.name}</div>
                  <StatusChip label={domain.status} tone={isolationTone(domain.status)} />
                </div>
                <div style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
                  <span>Evidence: {domain.evidenceCount}</span>
                  <span>Findings: {domain.findings.length}</span>
                  <span>Last Verified: {domain.lastVerified}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4 — Storage Verification */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>4. Storage Verification</h2>
          <div style={cardStyle}>
            <StatusChip label={storage.status} tone={isolationTone(storage.status)} />
            {checks.find((c) => c.domainId === 'storage')!.evidence.map((e) => (
              <div key={e.id} style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                <strong>[{e.source}]</strong> {e.description} — <em>{e.reference}</em>
              </div>
            ))}
          </div>
        </div>

        {/* Section 5 — API Verification */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>5. API Verification</h2>
          <div style={cardStyle}>
            <StatusChip label={api.status} tone={isolationTone(api.status)} />
            {checks.find((c) => c.domainId === 'api')!.evidence.map((e) => (
              <div key={e.id} style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                <strong>[{e.source}]</strong> {e.description} — <em>{e.reference}</em>
              </div>
            ))}
          </div>
        </div>

        {/* Section 6 — Connector Verification */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>6. Connector Verification</h2>
          <div style={cardStyle}>
            <StatusChip label={connector.status} tone={isolationTone(connector.status)} />
            {checks.find((c) => c.domainId === 'connector')!.evidence.map((e) => (
              <div key={e.id} style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                <strong>[{e.source}]</strong> {e.description} — <em>{e.reference}</em>
              </div>
            ))}
          </div>
        </div>

        {/* Section 7 — Discovery Verification */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>7. Discovery Verification</h2>
          <div style={cardStyle}>
            <StatusChip label={discovery.status} tone={isolationTone(discovery.status)} />
            {checks.find((c) => c.domainId === 'discovery')!.evidence.map((e) => (
              <div key={e.id} style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                <strong>[{e.source}]</strong> {e.description} — <em>{e.reference}</em>
              </div>
            ))}
          </div>
        </div>

        {/* Section 8 — Evidence Verification */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>8. Evidence Verification</h2>
          <div style={cardStyle}>
            <StatusChip label={evidence.status} tone={isolationTone(evidence.status)} />
            {checks.find((c) => c.domainId === 'evidence')!.evidence.map((e) => (
              <div key={e.id} style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                <strong>[{e.source}]</strong> {e.description} — <em>{e.reference}</em>
              </div>
            ))}
          </div>
        </div>

        {/* Section 9 — Export Verification */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>9. Export Verification</h2>
          <div style={cardStyle}>
            <StatusChip label={exportDomain.status} tone={isolationTone(exportDomain.status)} />
            {checks.find((c) => c.domainId === 'export')!.evidence.map((e) => (
              <div key={e.id} style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                <strong>[{e.source}]</strong> {e.description} — <em>{e.reference}</em>
              </div>
            ))}
          </div>
        </div>

        {/* Section 10 — Findings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>10. Findings</h2>
          {readiness.findings.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)' }}>No findings identified.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {readiness.findings.map((finding) => (
                <div key={finding.id} style={cardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{finding.type.replace(/_/g, ' ')}</div>
                    <StatusChip label={finding.severity} tone={finding.severity === 'CRITICAL' || finding.severity === 'HIGH' ? 'danger' : 'warning'} />
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{finding.rationale}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Evidence: {finding.evidence}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Remediation: {finding.remediation}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 11 — Recommendations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>11. Recommendations</h2>
          {readiness.recommendations.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)' }}>No recommendations at this time.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {readiness.recommendations.map((recommendation) => (
                <div key={recommendation.id} style={cardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{recommendation.type.replace(/_/g, ' ')}</div>
                    <StatusChip label={recommendation.severity} tone={recommendation.severity === 'CRITICAL' || recommendation.severity === 'HIGH' ? 'danger' : 'warning'} />
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    <strong>Owner: </strong>
                    {recommendation.owner}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    <strong>Recommended Action: </strong>
                    {recommendation.recommendedAction}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 12 — Verification Evidence */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>12. Verification Evidence</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {allEvidence.map((e) => (
              <div key={e.id} style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{e.source}</div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{e.description}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{e.reference}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  )
}
