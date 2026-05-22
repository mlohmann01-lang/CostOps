import { formatCurrency } from '../../lib/formatters'

interface MetricCardProps {
  label: string
  value: string
  subtext: string
  accent?: boolean
}

function MetricCard({ label, value, subtext, accent }: MetricCardProps) {
  return (
    <div style={{
      background: accent ? 'var(--c-teal-50)' : 'var(--surface-2)',
      border: accent ? '0.5px solid var(--c-teal-200)' : '0.5px solid var(--border-subtle)',
      borderRadius: 12, padding: 16,
    }}>
      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        {label}
      </p>
      <p style={{ fontSize: 22, fontWeight: 500, color: accent ? 'var(--c-teal-600)' : 'var(--text-primary)', lineHeight: 1.2 }}>
        {value}
      </p>
      <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
        {subtext}
      </p>
    </div>
  )
}

interface MetricStripProps {
  totalIdentified: number
  eligibleNow: number
  pendingApproval: number
  blockedManual: number
}

export function MetricStrip({ totalIdentified, eligibleNow, pendingApproval, blockedManual }: MetricStripProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
      <MetricCard
        label="Total identified"
        value={formatCurrency(totalIdentified)}
        subtext="across all active domains"
      />
      <MetricCard
        label="Eligible now"
        value={formatCurrency(eligibleNow)}
        subtext="governance-certified, ready to execute"
        accent
      />
      <MetricCard
        label="Pending approval"
        value={formatCurrency(pendingApproval)}
        subtext="awaiting second approver"
      />
      <MetricCard
        label="Blocked / manual"
        value={formatCurrency(blockedManual)}
        subtext="requires manual review or config"
      />
    </div>
  )
}
