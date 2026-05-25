import { Shell } from '../components/layout/Shell'
import { DomainTabs } from '../components/layout/DomainTabs'
import { CommandBar } from '../components/layout/CommandBar'
import { DemoWorkspaceGuide } from '../components/layout/DemoWorkspaceGuide'
import { MetricStrip } from '../components/command/MetricStrip'
import { ScenarioLauncher } from '../components/layout/ScenarioLauncher'
import { useRuntimeSummary } from '../lib/operations/operation-store'
import { ActionTable } from '../components/command/ActionTable'
import { OperationalFeed } from '../components/runtime/OperationalFeed'
import { CONNECTORS, GOVERNANCE_ACTIONS } from '../lib/mockData'
import type { Domain } from '../types/connector'

interface CommandViewProps {
  params?: { domain?: string }
}

export default function CommandView({ params }: CommandViewProps) {
  const domain = (params?.domain ?? 'all') as Domain
  const actions = domain === 'all' ? GOVERNANCE_ACTIONS : GOVERNANCE_ACTIONS.filter(a => a.domain === domain)
  const runtime = useRuntimeSummary()

  const totalIdentified = actions.reduce((s, a) => s + a.savingAmount, 0)
  const eligibleNow     = actions.filter(a => a.verdict === 'GOVERNED_EXECUTION_ELIGIBLE').reduce((s, a) => s + a.savingAmount, 0)
  const pendingApproval = actions.filter(a => a.verdict === 'APPROVAL_REQUIRED').reduce((s, a) => s + a.savingAmount, 0)
  const blockedManual   = actions.filter(a => a.verdict === 'MANUAL_ONLY' || a.verdict === 'NEVER_ELIGIBLE').reduce((s, a) => s + a.savingAmount, 0)

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
        <DemoWorkspaceGuide />
        <ScenarioLauncher />
        <OperationalFeed />
        <div style={{display:'flex',gap:8,marginBottom:10,fontSize:11,color:'var(--text-secondary)'}}><span>Operational pulse:</span><span>Queued executions {runtime.verificationPendingCount}</span><span>• Connector issues {runtime.connectorIssuesCount}</span><span>• Governance events {runtime.approvedCount + runtime.executionCompletedCount}</span></div>
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

        {actions.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
No governed actions are currently available for this domain. Impact: no immediate savings can be executed. Next step: activate connector evidence and reload this scenario.
            </p>
          </div>
        ) : (
          <ActionTable actions={actions} />
        )}
      </div>

      <CommandBar />
    </Shell>
  )
}
