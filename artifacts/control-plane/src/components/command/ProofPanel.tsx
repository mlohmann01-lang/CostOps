import { CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import { truncateHash } from '../../lib/formatters'
import type { ProofStep } from '../../types/governance'

const STEP_CFG = {
  PASS: { Icon: CheckCircle, color: 'var(--c-teal-400)' },
  WARN: { Icon: AlertCircle, color: 'var(--c-amber-400)' },
  FAIL: { Icon: XCircle,     color: 'var(--c-red-400)' },
}

interface ProofPanelProps {
  steps: ProofStep[]
  certId: string | null
  onApprove?: () => void
  verdict: string
}

export function ProofPanel({ steps, certId, onApprove, verdict }: ProofPanelProps) {
  return (
    <div style={{
      background: 'var(--surface-1)',
      borderTop: '0.5px solid var(--border-subtle)',
      padding: '14px 16px',
    }}>
      <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 12 }}>
        Governance proof chain
      </p>

      <div style={{ position: 'relative' }}>
        {steps.map((step, i) => {
          const { Icon, color } = STEP_CFG[step.status]
          return (
            <div key={step.id} style={{ display: 'flex', gap: 10, marginBottom: i < steps.length - 1 ? 0 : 0 }}>
              {/* Timeline line + icon */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <Icon size={18} color={color} style={{ zIndex: 1 }} />
                {i < steps.length - 1 && (
                  <div style={{ width: 1, flex: 1, background: 'var(--border-subtle)', margin: '3px 0 3px' }} />
                )}
              </div>
              {/* Content */}
              <div style={{ paddingBottom: i < steps.length - 1 ? 12 : 0 }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 1 }}>
                  {step.label}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: step.proofHash ? 3 : 0 }}>
                  {step.detail}
                </p>
                {step.proofHash && (
                  <p style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-tertiary)' }}>
                    {truncateHash(step.proofHash)}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 12, paddingTop: 12,
        borderTop: '0.5px solid var(--border-subtle)',
      }}>
        <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-tertiary)' }}>
          {certId ?? 'No cert — pending approval'}
        </span>
        {verdict === 'GOVERNED_EXECUTION_ELIGIBLE' && onApprove && (
          <button
            onClick={onApprove}
            style={{
              fontSize: 11, padding: '5px 12px',
              background: 'var(--c-teal-400)', color: '#fff',
              border: 'none', borderRadius: 8, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Approve
          </button>
        )}
        {verdict === 'APPROVAL_REQUIRED' && (
          <button style={{
            fontSize: 11, padding: '5px 12px',
            background: 'none', color: 'var(--c-amber-600)',
            border: '0.5px solid var(--c-amber-400)', borderRadius: 8, cursor: 'pointer',
            fontFamily: 'inherit',
          }}>
            Request approval
          </button>
        )}
      </div>
    </div>
  )
}
