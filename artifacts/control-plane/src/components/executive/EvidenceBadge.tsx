import { StatusBadge } from './StatusBadge'
export function EvidenceBadge({ confidence }: { confidence:'HIGH'|'MEDIUM'|'LOW'|'UNKNOWN'|string }) {
  const tone = confidence === 'HIGH' ? 'good' : confidence === 'MEDIUM' ? 'warning' : confidence === 'LOW' ? 'danger' : 'neutral'
  return <StatusBadge status={`Evidence confidence: ${confidence}`} tone={tone} />
}
