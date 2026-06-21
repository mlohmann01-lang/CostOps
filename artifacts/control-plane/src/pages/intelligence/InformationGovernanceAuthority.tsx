import React from 'react'
import { Shell } from '../../components/layout/Shell'
import { StatusChip, statusToneFor } from '../../components/executive/StatusChip'
import { getInformationGovernanceAuthority } from '../../lib/informationGovernance/information-governance-authority'

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

function readinessTone(status: string) {
  if (status === 'READY') return 'success'
  if (status === 'PARTIAL') return 'warning'
  if (status === 'MISSING') return 'danger'
  return statusToneFor(status)
}

export default function InformationGovernanceAuthority() {
  const authority = getInformationGovernanceAuthority()
  const { dataInventory, classificationRules, retentionPolicies, accessGovernance, encryptionGovernance, exportGovernance, privacyPosture, readiness } = authority

  return (
    <Shell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Information Governance Authority</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
            The authoritative source of truth for what data Certen collects, why, how it is classified, protected,
            retained, accessed and exported — across the platform's existing architecture.
          </p>
        </div>

        {/* Section 1 — Governance Readiness */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>1. Governance Readiness</h2>
            <StatusChip label={readiness.status} tone={readinessTone(readiness.status)} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>Score: {readiness.score} / 100</div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)' }}>
            Weighted equally (20% each) across Classification, Retention, Access, Encryption and Privacy.
          </p>
        </div>

        {/* Section 2 — Data Inventory */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>2. Data Inventory</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {dataInventory.map((item) => (
              <div key={item.name} style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{item.name}</div>
                  <StatusChip label={item.classification} tone={statusToneFor(item.classification)} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Source: {item.source}</div>
                <div style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
                  <span>PII: {item.containsPII ? 'Yes' : 'No'}</span>
                  <span>Sensitive: {item.containsSensitiveData ? 'Yes' : 'No'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3 — Classification Coverage */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>3. Classification Coverage</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {classificationRules.map((rule) => (
              <MetricCard key={rule.category} label={rule.category} value={rule.classification} />
            ))}
          </div>
        </div>

        {/* Section 4 — Retention Policies */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>4. Retention Policies</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {retentionPolicies.map((policy) => (
              <div key={policy.category} style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{policy.category}</div>
                  <StatusChip label={policy.status} tone={readinessTone(policy.status === 'DEFINED' ? 'READY' : policy.status)} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{policy.evidence}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 5 — Access Governance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>5. Access Governance</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {accessGovernance.map((policy) => (
              <div key={policy.area} style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{policy.area}</div>
                  <StatusChip label={policy.status} tone={readinessTone(policy.status)} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{policy.evidence}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 6 — Encryption Governance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>6. Encryption Governance</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {encryptionGovernance.map((item) => (
              <div key={item.area} style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{item.area}</div>
                  <StatusChip label={item.status} tone={readinessTone(item.status)} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{item.evidence}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 7 — Export Governance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>7. Export Governance</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {exportGovernance.map((control) => (
              <div key={control.area} style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{control.area}</div>
                  <StatusChip label={control.status} tone={readinessTone(control.status)} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{control.evidence}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 8 — Privacy Posture */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>8. Privacy Posture</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {privacyPosture.map((attribute) => (
              <div key={attribute.question} style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{attribute.question}</div>
                  <StatusChip label={attribute.answer} tone={attribute.answer === 'NO' ? 'success' : attribute.answer === 'YES' ? 'danger' : 'neutral'} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{attribute.evidence}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 9 — Findings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>9. Findings</h2>
          {readiness.findings.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)' }}>No findings identified.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {readiness.findings.map((finding) => (
                <div key={finding.id} style={cardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{finding.area}</div>
                    <StatusChip label={finding.severity} tone={finding.severity === 'CRITICAL' || finding.severity === 'HIGH' ? 'danger' : 'warning'} />
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{finding.description}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{finding.evidence}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 10 — Recommendations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>10. Recommendations</h2>
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
                    <strong>Rationale: </strong>
                    {recommendation.rationale}
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
      </div>
    </Shell>
  )
}
