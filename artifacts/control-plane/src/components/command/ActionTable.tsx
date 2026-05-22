import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { VerdictBadge } from '../shared/VerdictBadge'
import { ProofPanel } from './ProofPanel'
import { formatCurrency } from '../../lib/formatters'
import type { GovernanceAction, BlastRadius, RollbackClass } from '../../types/governance'

function BlastBadge({ level }: { level: BlastRadius }) {
  const color = level === 'LOW' ? 'var(--c-teal-600)' : level === 'MEDIUM' ? 'var(--c-amber-600)' : 'var(--c-red-600)'
  return <span style={{ fontSize: 12, color, fontWeight: 500 }}>{level.charAt(0) + level.slice(1).toLowerCase()}</span>
}

function RollbackPill({ level }: { level: RollbackClass }) {
  const cfg = {
    FULL:    { bg: 'var(--c-gray-50)',  text: 'var(--c-gray-600)' },
    PARTIAL: { bg: 'var(--c-amber-50)', text: 'var(--c-amber-600)' },
    NONE:    { bg: 'var(--c-red-50)',   text: 'var(--c-red-600)' },
  }[level]
  return (
    <span style={{
      fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 10,
      background: cfg.bg, color: cfg.text,
    }}>
      {level.charAt(0) + level.slice(1).toLowerCase()}
    </span>
  )
}

interface ActionTableProps {
  actions: GovernanceAction[]
}

export function ActionTable({ actions }: ActionTableProps) {
  const [openId, setOpenId] = useState<string | null>(null)

  function toggle(id: string) {
    setOpenId(prev => prev === id ? null : id)
  }

  return (
    <div style={{
      background: 'var(--surface-0)',
      border: '0.5px solid var(--border-subtle)',
      borderRadius: 12, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 0.9fr 1.2fr 0.8fr 0.7fr 0.7fr',
        padding: '8px 16px',
        background: 'var(--surface-2)',
        borderBottom: '0.5px solid var(--border-subtle)',
      }}>
        {['Action', 'Saving', 'Verdict', 'Blast', 'Rollback', ''].map(h => (
          <span key={h} style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {h}
          </span>
        ))}
      </div>

      {actions.map((action, i) => {
        const isOpen = openId === action.id
        return (
          <div key={action.id} style={{ borderBottom: i < actions.length - 1 ? '0.5px solid var(--border-subtle)' : 'none' }}>
            {/* Row */}
            <div
              onClick={() => toggle(action.id)}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 0.9fr 1.2fr 0.8fr 0.7fr 0.7fr',
                padding: '11px 16px',
                cursor: 'pointer',
                background: isOpen ? 'var(--surface-2)' : 'transparent',
                alignItems: 'center',
                transition: 'background 0.1s',
              }}
            >
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>
                  {action.name}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {action.description}
                </p>
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                {formatCurrency(action.savingAmount)}<span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>/mo</span>
              </div>
              <div><VerdictBadge verdict={action.verdict} /></div>
              <div><BlastBadge level={action.blastRadius} /></div>
              <div><RollbackPill level={action.rollback} /></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                {action.verdict === 'GOVERNED_EXECUTION_ELIGIBLE' && (
                  <button
                    onClick={e => { e.stopPropagation() }}
                    style={{
                      fontSize: 11, padding: '4px 10px', marginRight: 8,
                      background: 'var(--c-teal-400)', color: '#fff',
                      border: 'none', borderRadius: 6, cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Approve
                  </button>
                )}
                {action.verdict === 'APPROVAL_REQUIRED' && (
                  <button
                    onClick={e => { e.stopPropagation() }}
                    style={{
                      fontSize: 11, padding: '4px 10px', marginRight: 8,
                      background: 'none', color: 'var(--text-secondary)',
                      border: '0.5px solid var(--border-medium)', borderRadius: 6, cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Review
                  </button>
                )}
                <ChevronDown
                  size={14}
                  color="var(--text-tertiary)"
                  style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                />
              </div>
            </div>

            {/* Proof panel */}
            {isOpen && (
              <ProofPanel
                steps={action.proofChain}
                certId={action.certId}
                verdict={action.verdict}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
