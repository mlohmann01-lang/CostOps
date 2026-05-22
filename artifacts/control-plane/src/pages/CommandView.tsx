import { useState, useEffect } from 'react'
import { Shell } from '../components/layout/Shell'
import { DomainTabs } from '../components/layout/DomainTabs'
import { CommandBar } from '../components/layout/CommandBar'
import { MetricStrip } from '../components/command/MetricStrip'
import { ActionTable } from '../components/command/ActionTable'
import { CONNECTORS } from '../lib/mockData'
import type { Domain } from '../types/connector'

interface CommandViewProps {
  params?: { domain?: string }
}

interface Recommendation {
  id: number
  name: string
  description: string
  domain: string
  savingAmount: number
  verdict: string
  blastRadius: string
  rollback: boolean
  certId?: string
  confidence: number
  recurrence: string
  proofChain: any[]
}

export default function CommandView({ params }: CommandViewProps) {
  const domain = (params?.domain ?? 'all') as Domain
  const [actions, setActions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const res = await fetch('/api/recommendations/enhanced')
        if (!res.ok) throw new Error('Failed to fetch recommendations')
        const data = await res.json()
        setActions(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    fetchRecommendations()
  }, [])

  const filteredActions = domain === 'all' ? actions : actions.filter(a => a.domain === domain)

  const totalIdentified = filteredActions.reduce((s, a) => s + a.savingAmount, 0)
  const eligibleNow     = filteredActions.filter(a => a.verdict === 'GOVERNED_EXECUTION_ELIGIBLE').reduce((s, a) => s + a.savingAmount, 0)
  const pendingApproval = filteredActions.filter(a => a.verdict === 'APPROVAL_REQUIRED').reduce((s, a) => s + a.savingAmount, 0)
  const blockedManual   = filteredActions.filter(a => a.verdict === 'MANUAL_ONLY' || a.verdict === 'NEVER_ELIGIBLE').reduce((s, a) => s + a.savingAmount, 0)

  return (
    <Shell>
      <div style={{
        padding: '16px 20px 0',
        borderBottom: '0.5px solid var(--border-subtle)',
        background: 'var(--surface-0)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h1 style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>Command</h1>
          <span style={{
            fontSize: 11, padding: '3px 9px',
            background: 'var(--surface-2)', border: '0.5px solid var(--border-subtle)',
            borderRadius: 6, color: 'var(--text-tertiary)',
          }}>
            Q2 2026
          </span>
        </div>
        <DomainTabs connectors={CONNECTORS} currentDomain={domain} basePath="/:domain/command" />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
        {error && (
          <div style={{
            padding: '12px 16px', marginBottom: 16,
            background: 'var(--c-red-50)', border: '0.5px solid var(--c-red-200)',
            borderRadius: 8, color: 'var(--c-red-700)', fontSize: 12
          }}>
            Error: {error}
          </div>
        )}
        {loading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading recommendations...
          </div>
        ) : (
          <>
            <MetricStrip
              totalIdentified={totalIdentified}
              eligibleNow={eligibleNow}
              pendingApproval={pendingApproval}
              blockedManual={blockedManual}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Actions ready
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                Click any row to expand governance proof
              </span>
            </div>

            {filteredActions.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  No governance actions for this domain. Connect a data source to start.
                </p>
              </div>
            ) : (
              <ActionTable actions={filteredActions} />
            )}
          </>
        )}
      </div>

      <CommandBar />
    </Shell>
  )
}
