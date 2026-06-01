import { Shell } from '../components/layout/Shell'
import { EmptyState, MetricCard, SectionLabel, StatusPill, LiveDataError } from '../components/shared/Foundation'
import { useRuntimeHealthData } from '../hooks/useRuntimeHealthData'
import { useOutcomesData } from '../hooks/useOutcomesData'
import { useTrustAccountabilityData } from '../hooks/useTrustAccountabilityData'
import { useVendorIntelligenceData } from '../hooks/useVendorIntelligenceData'
import { useBenchmarkIntelligenceData } from '../hooks/useBenchmarkIntelligenceData'
import { useContractIntelligenceData } from '../hooks/useContractIntelligenceData'
import { useExecutivePrioritiesData } from '../hooks/useExecutivePrioritiesData'
import { useUtilizationIntelligenceData } from '../hooks/useUtilizationIntelligenceData'
import { simulateConnectorRetry } from '../lib/demoRuntimeStore'
import { useWorkspace } from '../lib/workspaceContext'

type PillStatus = Parameters<typeof StatusPill>[0]['status']
const pill = (status: string): PillStatus => status === 'degraded' ? 'degraded' : status === 'testing' ? 'testing' : status === 'pending' ? 'pending' : status === 'blocked' ? 'blocked' : status === 'active' ? 'active' : 'ready'
function money(value: number) { return value >= 1000000 ? `$${(value / 1000000).toFixed(1)}M` : `$${Math.round(value / 1000)}k` }

export default function RuntimeHealthView() {
  const workspace = useWorkspace()
  const { data, isEmptyLive, error, refresh } = useRuntimeHealthData()
  const trustAccountability = useTrustAccountabilityData()
  const outcomes = useOutcomesData()
  const vendorIntel = useVendorIntelligenceData()
  const benchmarkIntel = useBenchmarkIntelligenceData()
  const contractIntel = useContractIntelligenceData()
  const priorities = useExecutivePrioritiesData()
  const utilization = useUtilizationIntelligenceData()
  const trustRollup = trustAccountability.accountability?.rollup ?? { openTasks: 0, overdueTasks: 0, highestEscalationLevel: 'NONE' }
  const trustBacklogState = trustRollup.highestEscalationLevel === 'EXECUTIVE' || trustRollup.openTasks > 25 || trustRollup.overdueTasks > 3 ? 'CRITICAL' : trustRollup.openTasks >= 10 || trustRollup.overdueTasks > 0 ? 'WARNING' : 'HEALTHY'
  const verificationPending = outcomes.data?.stats?.[3] ?? 0
  const verificationFailures = outcomes.data?.stats?.[4] ?? 0
  const verificationPipelineState = verificationFailures > 0 || verificationPending > 10 ? 'CRITICAL' : verificationPending > 0 ? 'WARNING' : 'HEALTHY'
  const proofSummary = outcomes.data?.proofSummary ?? {}
  const outcomeProofEngineState = outcomes.error ? 'FAILED' : outcomes.isEmptyLive ? 'STALE' : (proofSummary.verificationFailedCount > 0 || proofSummary.verificationBacklogCount > 0 || proofSummary.driftedOutcomeCount > 0) ? 'DEGRADED' : 'HEALTHY'
  const vendorPipelineState = vendorIntel.error ? 'FAILED' : vendorIntel.isEmptyLive ? 'STALE' : (vendorIntel.data.summary?.highImpact ?? 0) > 0 ? 'WARNING' : 'HEALTHY'
  const benchmarkPipelineState = benchmarkIntel.error ? 'FAILED' : benchmarkIntel.isEmptyLive ? 'STALE' : (benchmarkIntel.data.summary?.highImpactGaps ?? 0) > 0 ? 'DEGRADED' : 'HEALTHY'
  const contractPipelineState = contractIntel.error ? 'FAILED' : contractIntel.isEmptyLive ? 'STALE' : (contractIntel.data.summary?.atRisk ?? 0) > 0 ? 'DEGRADED' : 'HEALTHY'
  const prioritizationEngineState = priorities.error ? 'FAILED' : priorities.isEmptyLive ? 'STALE' : priorities.summary?.generatedAt ? 'HEALTHY' : 'DEGRADED'
  const utilizationPipelineState = utilization.error ? 'FAILED' : utilization.isEmptyLive ? 'STALE' : (utilization.data.summary?.lowUtilization ?? 0) > 0 ? 'DEGRADED' : 'HEALTHY'
  if (error) return <Shell><LiveDataError error={error} onRetry={refresh} /></Shell>
  if (isEmptyLive) return <Shell><EmptyState title='No runtime health data yet' description='Runtime Health will populate after live runtime telemetry starts reporting.' /></Shell>

  return <Shell><div style={{ padding: 20, display: 'grid', gap: 16 }}>
    <div><SectionLabel>Platform administration</SectionLabel><h1>Runtime Health</h1><p style={{ color: 'var(--text-secondary)' }}>Governance runtime operational</p></div>
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 12 }}>
      <MetricCard label='Overall health score' value={`${data.overallScore}%`} delta={data.summary} hero />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10 }} data-testid='runtime-component-grid'>
        {data.components.map((component:any) => <div key={component.id} style={{ border: 'var(--border-default)', background: 'var(--bg-card)', borderRadius: 10, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><strong>{component.name}</strong><StatusPill status={pill(component.status)} /></div>
          <div style={{ marginTop: 8 }}>{component.wording}</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{component.detail}</p>
        </div>)}
      </div>
    </div>
    <section data-testid='trust-resolution-backlog' style={{ border: 'var(--border-default)', background: 'var(--bg-card)', borderRadius: 10, padding: 12 }}><SectionLabel>Trust Resolution Backlog</SectionLabel><div style={{ display:'flex', gap:12, alignItems:'center' }}><span><StatusPill status={trustBacklogState === 'CRITICAL' ? 'blocked' : trustBacklogState === 'WARNING' ? 'degraded' : 'ready'} /> {trustBacklogState}</span><span>{trustRollup.openTasks} open tasks</span><span>{trustRollup.overdueTasks} overdue</span><span>Highest escalation {trustRollup.highestEscalationLevel}</span></div></section>
    <section data-testid='outcome-proof-engine' style={{ border: 'var(--border-default)', background: 'var(--bg-card)', borderRadius: 10, padding: 12 }}><SectionLabel>Outcome Proof Engine</SectionLabel><div style={{ display:'flex', gap:12, alignItems:'center' }}><span><StatusPill status={outcomeProofEngineState === 'FAILED' ? 'blocked' : outcomeProofEngineState === 'STALE' || outcomeProofEngineState === 'DEGRADED' ? 'degraded' : 'ready'} /> {outcomeProofEngineState}</span><span>Projected {money(proofSummary.projectedMonthlySavings ?? 0)}</span><span>Verified {money(proofSummary.verifiedMonthlySavings ?? 0)}</span><span>Retained {money(proofSummary.retainedMonthlySavings ?? 0)}</span><span>Protected {money(proofSummary.protectedMonthlySavings ?? 0)}</span></div></section>
    <section data-testid='verification-pipeline' style={{ border: 'var(--border-default)', background: 'var(--bg-card)', borderRadius: 10, padding: 12 }}><SectionLabel>Verification Pipeline</SectionLabel><div style={{ display:'flex', gap:12, alignItems:'center' }}><span><StatusPill status={verificationPipelineState === 'CRITICAL' ? 'blocked' : verificationPipelineState === 'WARNING' ? 'degraded' : 'ready'} /> {verificationPipelineState}</span><span>{verificationPending} verification backlog</span><span>{verificationFailures} verification failures</span><span>Stale outcomes monitored</span></div></section>
    <section data-testid='vendor-intelligence-pipeline' style={{ border: 'var(--border-default)', background: 'var(--bg-card)', borderRadius: 10, padding: 12 }}><SectionLabel>Vendor Intelligence Pipeline</SectionLabel><div style={{ display:'flex', gap:12, alignItems:'center' }}><span><StatusPill status={vendorPipelineState === 'FAILED' ? 'blocked' : vendorPipelineState === 'STALE' || vendorPipelineState === 'WARNING' ? 'degraded' : 'ready'} /> {vendorPipelineState}</span><span>{vendorIntel.data.summary?.vendorChangesDetected ?? 0} vendor changes detected</span><span>{vendorIntel.data.summary?.highImpact ?? 0} high impact</span></div></section>
    <section data-testid='benchmark-intelligence-pipeline' style={{ border: 'var(--border-default)', background: 'var(--bg-card)', borderRadius: 10, padding: 12 }}><SectionLabel>Benchmark Intelligence Pipeline</SectionLabel><div style={{ display:'flex', gap:12, alignItems:'center' }}><span><StatusPill status={benchmarkPipelineState === 'FAILED' ? 'blocked' : benchmarkPipelineState === 'STALE' || benchmarkPipelineState === 'DEGRADED' ? 'degraded' : 'ready'} /> {benchmarkPipelineState}</span><span>{benchmarkIntel.data.summary?.benchmarksEvaluated ?? 0} benchmarks evaluated</span><span>{benchmarkIntel.data.summary?.highImpactGaps ?? 0} high impact gaps</span></div></section>
    <section data-testid='contract-intelligence-pipeline' style={{ border: 'var(--border-default)', background: 'var(--bg-card)', borderRadius: 10, padding: 12 }}><SectionLabel>Contract Intelligence Pipeline</SectionLabel><div style={{ display:'flex', gap:12, alignItems:'center' }}><span><StatusPill status={contractPipelineState === 'FAILED' ? 'blocked' : contractPipelineState === 'STALE' || contractPipelineState === 'DEGRADED' ? 'degraded' : 'ready'} /> {contractPipelineState}</span><span>{contractIntel.data.summary?.contracts ?? 0} contracts evaluated</span><span>{contractIntel.data.summary?.atRisk ?? 0} at risk</span></div></section>
    <section data-testid='utilization-intelligence-pipeline' style={{ border: 'var(--border-default)', background: 'var(--bg-card)', borderRadius: 10, padding: 12 }}><SectionLabel>Utilization Intelligence Pipeline</SectionLabel><div style={{ display:'flex', gap:12, alignItems:'center' }}><span><StatusPill status={utilizationPipelineState === 'FAILED' ? 'blocked' : utilizationPipelineState === 'STALE' || utilizationPipelineState === 'DEGRADED' ? 'degraded' : 'ready'} /> {utilizationPipelineState}</span><span>{utilization.data.summary?.assetsAnalysed ?? 0} assets analysed</span><span>{money(utilization.data.summary?.unusedValue ?? 0)} unused value</span></div></section>
    <section data-testid='prioritization-engine' style={{ border: 'var(--border-default)', background: 'var(--bg-card)', borderRadius: 10, padding: 12 }}><SectionLabel>Prioritization Engine</SectionLabel><div style={{ display:'flex', gap:12, alignItems:'center' }}><span><StatusPill status={prioritizationEngineState === 'FAILED' ? 'blocked' : prioritizationEngineState === 'STALE' || prioritizationEngineState === 'DEGRADED' ? 'degraded' : 'ready'} /> {prioritizationEngineState}</span><span>{priorities.summary?.totalOpportunities ?? 0} opportunities scored</span><span>{money(priorities.summary?.topFiveMonthlySavings ?? 0)} top five monthly value</span></div></section>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <section style={{ border: 'var(--border-default)', borderRadius: 10, padding: 12 }}><SectionLabel>Active issues</SectionLabel>{data.activeIssues.map((issue:any) => <div key={issue.id} style={{ padding: '10px 0', borderTop: 'var(--border-subtle)' }}><StatusPill status={pill(issue.severity)} /> <strong>{issue.title}</strong><div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{issue.owner} · {issue.nextStep}</div>{issue.owner === 'Connector Ops' && <button onClick={() => workspace.mode === 'demo' && simulateConnectorRetry('m365')}>Retry connector</button>}</div>)}</section>
      <section style={{ border: 'var(--border-default)', borderRadius: 10, padding: 12 }}><SectionLabel>Recent events</SectionLabel>{data.recentEvents.map((event:any) => <div key={event.id} style={{ padding: '10px 0', borderTop: 'var(--border-subtle)' }}><span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{event.at}</span> <strong>{event.event}</strong><div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{event.detail}</div></div>)}</section>
    </div>
  </div></Shell>
}
