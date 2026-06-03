import { StatusBadge } from './StatusBadge'
export function RiskBadge({ level }: { level:'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'|string }) {
  const tone = level === 'CRITICAL' || level === 'HIGH' ? 'danger' : level === 'MEDIUM' ? 'warning' : 'good'
  return <StatusBadge status={String(level).toLowerCase().replace(/_/g, ' ')} tone={tone} />
}
