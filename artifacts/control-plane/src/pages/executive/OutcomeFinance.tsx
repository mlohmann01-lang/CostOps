import React from 'react'
import { StatusChip, statusToneFor } from '../../components/executive/StatusChip'
import { formatCurrency, formatDate, formatPercent } from '../../lib/display/formatters'
import { getDefaultOutcomeFinance, type OutcomeFinanceState } from '../../lib/outcomeFinance/defaultOutcomeFinance'

function stateLabel(state: OutcomeFinanceState): string {
  if (state === 'active') return 'Active'
  if (state === 'partial') return 'Partial'
  return 'No Data'
}

function stateTone(state: OutcomeFinanceState) {
  if (state === 'active') return 'success'
  if (state === 'partial') return 'warning'
  return statusToneFor('NOT_CONFIGURED')
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: 'var(--border-default)', borderRadius: 14, padding: 16, background: 'var(--surface-card)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>{value}</div>
    </div>
  )
}

function FunnelStage({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: 'var(--border-default)', borderRadius: 14, padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'var(--surface-card)' }}>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{label}</h3>
      <div style={{ fontSize: 18, fontWeight: 800 }}>{value}</div>
    </div>
  )
}

export default function OutcomeFinance() {
  const summary = getDefaultOutcomeFinance()
  const { metrics, reconciliation, links, state, narrative, executiveNarrative } = summary

  const hasReconciliationData =
    reconciliation.reconciliations !== undefined ||
    reconciliation.linkedOutcomes !== undefined ||
    reconciliation.varianceRecords !== undefined ||
    reconciliation.confidence !== undefined

  const hasVarianceData = metrics.identifiedValue !== undefined && metrics.financeVerifiedValue !== undefined

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Outcome Finance</h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
          Finance validation of identified, executed and verified technology savings.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        <MetricCard label="Identified Value" value={formatCurrency(metrics.identifiedValue)} />
        <MetricCard label="Executed Value" value={formatCurrency(metrics.executedValue)} />
        <MetricCard label="Verified Value" value={formatCurrency(metrics.verifiedValue)} />
        <MetricCard label="Finance Verified Value" value={formatCurrency(metrics.financeVerifiedValue)} />
        <MetricCard label="Variance" value={formatCurrency(metrics.variance)} />
      </div>

      <div style={{ border: 'var(--border-default)', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--surface-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>CFO Narrative</h2>
          <StatusChip label={stateLabel(state)} tone={stateTone(state)} />
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{narrative}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Finance Validation Funnel</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <FunnelStage label="Identified" value={formatCurrency(metrics.identifiedValue)} />
          <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0', fontSize: 18, color: 'var(--text-tertiary)' }} aria-hidden="true">↓</div>
          <FunnelStage label="Executed" value={formatCurrency(metrics.executedValue)} />
          <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0', fontSize: 18, color: 'var(--text-tertiary)' }} aria-hidden="true">↓</div>
          <FunnelStage label="Verified" value={formatCurrency(metrics.verifiedValue)} />
          <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0', fontSize: 18, color: 'var(--text-tertiary)' }} aria-hidden="true">↓</div>
          <FunnelStage label="Finance Verified" value={formatCurrency(metrics.financeVerifiedValue)} />
        </div>
      </div>

      <div style={{ border: 'var(--border-default)', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--surface-card)' }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Reconciliation Summary</h2>
        {hasReconciliationData ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Reconciliations</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{reconciliation.reconciliations ?? 'Not available'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Linked Outcomes</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{reconciliation.linkedOutcomes ?? 'Not available'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Variance Records</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{reconciliation.varianceRecords ?? 'Not available'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Confidence</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{formatPercent(reconciliation.confidence)}</div>
            </div>
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)' }}>Finance reconciliation will appear once outcomes are linked to financial evidence.</p>
        )}
      </div>

      <div style={{ border: 'var(--border-default)', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--surface-card)' }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Variance</h2>
        {hasVarianceData ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Projected Value</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{formatCurrency(metrics.identifiedValue)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Finance Verified Value</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{formatCurrency(metrics.financeVerifiedValue)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Variance</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{formatCurrency(metrics.variance)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Confidence</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{formatPercent(reconciliation.confidence)}</div>
            </div>
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)' }}>No finance variance records exist yet.</p>
        )}
      </div>

      <div style={{ border: 'var(--border-default)', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--surface-card)' }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Reconciliation Links</h2>
        {links.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)' }}>No reconciled outcomes yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr .8fr 1.2fr .7fr .8fr', gap: 8, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--text-tertiary)' }}>
              <span>Outcome</span>
              <span>Status</span>
              <span>Finance Evidence</span>
              <span>Confidence</span>
              <span>Last Updated</span>
            </div>
            {links.map((link) => (
              <div key={link.outcome} style={{ display: 'grid', gridTemplateColumns: '1.4fr .8fr 1.2fr .7fr .8fr', gap: 8, fontSize: 13, borderTop: 'var(--border-default)', padding: '8px 0', alignItems: 'center' }}>
                <span>{link.outcome}</span>
                <span>{link.status}</span>
                <span>{link.financeEvidence}</span>
                <span>{formatPercent(link.confidence)}</span>
                <span>{formatDate(link.lastUpdated)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ border: 'var(--border-default)', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--surface-card)' }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Executive Narrative</h2>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{executiveNarrative}</p>
      </div>
    </div>
  )
}
