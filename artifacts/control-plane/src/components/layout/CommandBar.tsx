import { useEffect, useMemo, useState, useCallback } from 'react'
import { Terminal, X } from 'lucide-react'
import { useLocation } from 'wouter'
import { useRuntimeSummary } from '../../lib/operations/operation-store'

const QUERIES = [
  'What changed today?',
  'Where is drift increasing?',
  'What is my highest-confidence saving?',
  'Which actions are blocked?',
  'What is awaiting verification?',
  'Which connectors need attention?',
  'How would Flexera improve confidence?',
  'Are there entitlement mismatches?',
  'Which recommendations need authority evidence?',
  'Why is confidence 91%?',
  'What would improve authority coverage?',
]

export function CommandBar() {
  const [q, setQ] = useState('')
  const [answer, setAnswer] = useState<Record<string, string> | null>(null)
  const [focused, setFocused] = useState(false)
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const [, nav] = useLocation()
  const runtime = useRuntimeSummary()

  const replyFor = useCallback((query: string) => ({
    summary: query === 'What changed today?'
      ? `${runtime.approvedCount} approvals · ${runtime.executionCompletedCount} executions · ${runtime.verificationPendingCount} pending verification.`
      : query.toLowerCase().includes('flexera') || query.toLowerCase().includes('entitlement')
        ? 'Flexera acts as entitlement authority. In this workspace it is demo authority evidence (synthetic) unless configured.'
        : 'Narrative insight generated from synthetic demo telemetry.',
    domain: query.toLowerCase().includes('connector') ? 'Cloud' : 'AI / SaaS',
    nextAction: query.toLowerCase().includes('blocked')
      ? 'Open Governance and clear readiness blockers.'
      : query.toLowerCase().includes('authority')
        ? 'Configure Flexera authority evidence and reconcile entitlement exports.'
        : 'Review recommendation details and continue governed simulation.',
    jump: query.toLowerCase().includes('connector')
      ? '/connectors'
      : query.toLowerCase().includes('verification')
        ? '/all/execution'
        : '/all/command',
  }), [runtime])

  useEffect(() => {
    const id = window.setInterval(() => setPlaceholderIdx(x => (x + 1) % QUERIES.length), 3800)
    return () => window.clearInterval(id)
  }, [])

  const suggestions = useMemo(
    () => q ? QUERIES.filter(x => x.toLowerCase().includes(q.toLowerCase())).slice(0, 5) : [],
    [q],
  )

  const showDropdown = (focused && q) || (focused && suggestions.length > 0)

  return (
    <div style={{
      padding: '10px 20px',
      borderTop: '0.5px solid rgba(255,255,255,0.07)',
      background: '#0a0c0b',
      flexShrink: 0,
    }}>
      {/* Input row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Terminal size={14} color="rgba(255,255,255,0.25)" strokeWidth={1.5} />
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            value={q}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 160)}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && q.trim()) {
                const matched = QUERIES.find(x => x.toLowerCase().includes(q.toLowerCase()))
                const query = matched ?? q
                setAnswer(replyFor(query))
                setFocused(false)
              }
              if (e.key === 'Escape') { setQ(''); setAnswer(null); setFocused(false) }
            }}
            placeholder={QUERIES[placeholderIdx]}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 12,
              color: '#e8e6e0',
              fontFamily: 'inherit',
              caretColor: '#1D9E75',
            }}
          />
          {/* Suggestion dropdown */}
          {showDropdown && q && (
            <div style={{
              position: 'absolute',
              bottom: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              background: '#131716',
              border: '0.5px solid rgba(255,255,255,0.10)',
              borderRadius: 8,
              overflow: 'hidden',
              zIndex: 100,
            }}>
              {suggestions.map(s => (
                <button
                  key={s}
                  onMouseDown={() => { setQ(s); setAnswer(replyFor(s)) }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    padding: '8px 14px',
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.55)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    display: 'block',
                    borderBottom: '0.5px solid rgba(255,255,255,0.05)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* KBD hint */}
        <kbd style={{
          fontSize: 10, color: 'rgba(255,255,255,0.20)',
          background: 'rgba(255,255,255,0.05)',
          border: '0.5px solid rgba(255,255,255,0.10)',
          borderRadius: 4, padding: '2px 5px',
          fontFamily: 'inherit',
        }}>
          ⌘K
        </kbd>
      </div>

      {/* Answer panel */}
      {answer && (
        <div style={{
          marginTop: 10,
          background: 'rgba(29,158,117,0.06)',
          border: '0.5px solid rgba(29,158,117,0.18)',
          borderRadius: 8,
          padding: '10px 14px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr auto',
          gap: '4px 20px',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Summary</div>
            <div style={{ fontSize: 12, color: '#e8e6e0' }}>{answer.summary}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Domain</div>
            <div style={{ fontSize: 12, color: '#e8e6e0' }}>{answer.domain}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Next action</div>
            <div style={{ fontSize: 12, color: '#e8e6e0' }}>{answer.nextAction}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              onClick={() => nav(answer.jump)}
              style={{
                padding: '5px 12px',
                background: 'rgba(29,158,117,0.15)',
                border: '0.5px solid rgba(29,158,117,0.30)',
                borderRadius: 6,
                fontSize: 11,
                color: '#1D9E75',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              Jump →
            </button>
            <button
              onClick={() => { setAnswer(null); setQ('') }}
              style={{
                background: 'none', border: 'none', padding: 4,
                cursor: 'pointer', color: 'rgba(255,255,255,0.25)',
                display: 'flex', alignItems: 'center',
              }}
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
