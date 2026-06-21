import React from 'react'
import { Shell } from '../../components/layout/Shell'
import { StatusChip, statusToneFor } from '../../components/executive/StatusChip'
import { getDefaultEconomicControlChain, type ChainStage } from '../../lib/economicControlChain/defaultEconomicControlChain'

function healthTone(healthStatus: string) {
  if (healthStatus === 'Healthy') return 'success'
  if (healthStatus === 'Partial') return 'warning'
  return statusToneFor(healthStatus)
}

function StageCard({ stage }: { stage: ChainStage }) {
  const hasAnyValue = stage.metrics.some((metric) => metric.value !== undefined)
  return (
    <div style={{ border: 'var(--border-default)', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--surface-card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{stage.title}</h3>
        <StatusChip label={stage.active ? 'Active' : 'Pending'} tone={stage.active ? 'success' : 'neutral'} />
      </div>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{stage.description}</p>
      {hasAnyValue ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {stage.metrics.map((metric) => (
            <div key={metric.label}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{metric.label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>{metric.value ?? 'No data available yet.'}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{stage.unavailableMessage}</div>
      )}
    </div>
  )
}

export default function EconomicControlChain() {
  const summary = getDefaultEconomicControlChain()

  return (
    <Shell><div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Economic Control Chain</h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
          See how Certen transforms technology, commercial and financial signals into verified and protected outcomes.
        </p>
      </div>

      <div style={{ border: 'var(--border-default)', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--surface-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Chain Health</h2>
          <StatusChip label={summary.healthStatus} tone={healthTone(summary.healthStatus)} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>{summary.activeStageCount} of 7 stages active</div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{summary.narrative}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {summary.stages.map((stage, index) => (
          <React.Fragment key={stage.key}>
            <StageCard stage={stage} />
            {index < summary.stages.length - 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0', fontSize: 18, color: 'var(--text-tertiary)' }} aria-hidden="true">
                ↓
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div></Shell>
  )
}
