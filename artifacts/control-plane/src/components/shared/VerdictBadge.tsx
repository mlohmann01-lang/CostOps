import { Check, Clock, Hand, Ban } from 'lucide-react'
import type { Verdict } from '../../types/governance'

const CONFIG: Record<Verdict, { label: string; icon: React.ElementType; bg: string; text: string }> = {
  GOVERNED_EXECUTION_ELIGIBLE: { label: 'Eligible',          icon: Check, bg: 'var(--c-teal-50)',   text: 'var(--c-teal-600)' },
  APPROVAL_REQUIRED:           { label: 'Approval required', icon: Clock, bg: 'var(--c-amber-50)',  text: 'var(--c-amber-600)' },
  MANUAL_ONLY:                 { label: 'Manual only',       icon: Hand,  bg: 'var(--c-gray-50)',   text: 'var(--c-gray-600)' },
  NEVER_ELIGIBLE:              { label: 'Never eligible',    icon: Ban,   bg: 'var(--c-red-50)',    text: 'var(--c-red-600)' },
}

interface VerdictBadgeProps {
  verdict: Verdict
}

export function VerdictBadge({ verdict }: VerdictBadgeProps) {
  const { label, icon: Icon, bg, text } = CONFIG[verdict]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, fontWeight: 500,
      padding: '2px 7px', borderRadius: 10,
      background: bg, color: text,
    }}>
      <Icon size={10} />
      {label}
    </span>
  )
}
