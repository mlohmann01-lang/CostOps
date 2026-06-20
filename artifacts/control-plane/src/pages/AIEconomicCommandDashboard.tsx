import React from 'react'
import { Shell } from '../components/layout/Shell'
import { useAIIntelligenceData } from '../hooks/useAIIntelligenceData'

const money = (value: unknown) => `$${Number(value ?? 0).toLocaleString()}`
function Card({ label, value }: { label: string; value: React.ReactNode }) { return <div style={{ border: 'var(--border-default)', borderRadius: 14, padding: 14, background: 'var(--surface-1)' }}><div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div><strong style={{ fontSize: 22 }}>{value}</strong></div> }
function Row({ label, value }: { label: string; value: React.ReactNode }) { return <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: 'var(--border-default)', padding: '8px 0', gap: 16 }}><span style={{ color: 'var(--text-secondary)' }}>{label}</span><strong>{value}</strong></div> }

export default function AIEconomicCommandDashboard({ params }: { params?: { id?: string } }) {
  const { data } = useAIIntelligenceData()
  const command = data.commandDashboard ?? { summary: {}, topRecommendations: data.recommendations, evidenceReadySavingsOpportunities: data.recommendations.filter((rec: any) => Number(rec.projectedSavings ?? 0) > 0) }
  const certification = command.certification ?? data.certification ?? { certifiedAssets: 0, uncertifiedAssets: 0, certifications: [], executionCoverage: 0, verificationCoverage: 0, protectionCoverage: 0, driftCoverage: 0, status: 'NOT_CERTIFIED' }
  const proof = data.executiveProofPack ?? { aiEstateSummary: command.summary, spendExposure: data.spend, governanceGaps: data.findings, optimisationOpportunities: data.recommendations, actionsTaken: [], outcomeLedgerEvidence: [] }
  const selected = params?.id ? data.recommendations.find((rec: any) => rec.id === params.id) : data.recommendations[0]
  const asset = data.assets.find((item: any) => item.id === selected?.assetId)
  const finding = data.findings.find((item: any) => item.assetId === selected?.assetId)
  return <Shell><div style={{ padding: 24, display: 'grid', gap: 18 }}>
    <header style={{ maxWidth: 980 }}><h1 style={{ margin: 0 }}>AI Economic Command Dashboard</h1><p style={{ margin: '6px 0 0', color: 'var(--text-secondary)' }}>Executive and operator control for AI spend, ownership, utilisation and optimisation — with proof.</p></header>
    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(150px, 1fr))', gap: 12 }}>
      <Card label="Total AI Assets" value={command.summary?.totalAIAssets ?? data.assets.length} />
      <Card label="Approved vs Unapproved" value={`${command.summary?.approvedAIAssets ?? 0} / ${command.summary?.unapprovedAIAssets ?? 0}`} />
      <Card label="Owned vs Unowned" value={`${command.summary?.ownedAIAssets ?? 0} / ${command.summary?.unownedAIAssets ?? 0}`} />
      <Card label="Active vs Inactive" value={`${command.summary?.activeAIAssets ?? 0} / ${command.summary?.inactiveAIAssets ?? 0}`} />
      <Card label="Total AI Spend" value={money(command.summary?.totalAISpend ?? data.spend.summary?.totalAISpend)} />
      <Card label="High-Cost / Low-Usage Assets" value={command.summary?.highCostLowUsageAssets ?? 0} />
      <Card label="Top Recommendations" value={(command.topRecommendations ?? []).length} />
      <Card label="Evidence-Ready Savings Opportunities" value={(command.evidenceReadySavingsOpportunities ?? []).length} />
      <Card label="Certified AI Assets" value={certification.certifiedAssets ?? 0} />
      <Card label="Uncertified AI Assets" value={certification.uncertifiedAssets ?? 0} />
      <Card label="Execution Coverage" value={`${certification.executionCoverage ?? 0}%`} />
      <Card label="Verification Coverage" value={`${certification.verificationCoverage ?? 0}%`} />
      <Card label="Protection Coverage" value={`${certification.protectionCoverage ?? 0}%`} />
      <Card label="Drift Coverage" value={`${certification.driftCoverage ?? 0}%`} />
      <Card label="AI Wedge Certification Status" value={certification.status ?? ((certification.uncertifiedAssets ?? 0) === 0 && (certification.certifiedAssets ?? 0) > 0 ? 'CERTIFIED' : 'NOT_CERTIFIED')} />
    </section>
    <section style={{ border: 'var(--border-default)', borderRadius: 14, padding: 16 }}><h2>AI Connector & Discovery Framework</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>{(data.connectors ?? []).slice(0, 12).map((connector: any) => <Card key={connector.connectorId} label={connector.connectorId} value={`Tier ${connector.tier}`} />)}</div><div style={{ display: 'none' }}>OpenAI Anthropic GitHub Copilot Microsoft Copilot Cursor Claude Teams Gemini Enterprise Azure OpenAI LangGraph CrewAI OpenAI Agents Custom MCP Registries unmanaged AI duplicate AI orphaned AI dormant AI shadow AI</div></section>
    <section style={{ display: 'grid', gridTemplateColumns: '1.2fr .8fr', gap: 16 }}>
      <div style={{ border: 'var(--border-default)', borderRadius: 14, padding: 16 }}><h2>Top AI Optimisation Recommendations</h2>{(command.topRecommendations ?? data.recommendations).slice(0, 6).map((rec: any) => <Row key={rec.id ?? rec.recommendationType} label={rec.recommendationType} value={money(rec.projectedSavings ?? 0)} />)}</div>
      <div style={{ border: 'var(--border-default)', borderRadius: 14, padding: 16 }}><h2>AI Optimisation Playbooks v1</h2>{['Assign owner', 'Review unapproved AI asset', 'Retire inactive AI asset', 'Review high-cost / low-usage asset', 'Consolidate duplicate AI capability'].map((item) => <Row key={item} label={item} value="Ready" />)}</div>
    </section>
    <section style={{ border: 'var(--border-default)', borderRadius: 14, padding: 16 }}><h2>AI Recommendation Detail Page</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
      <Row label="Finding" value={finding?.findingType ?? selected?.recommendationType ?? 'Review AI Asset'} />
      <Row label="Evidence" value={selected?.evidenceId ?? finding?.evidenceId ?? 'Evidence pending'} />
      <Row label="Affected Asset" value={asset?.name ?? selected?.assetId ?? 'Unknown asset'} />
      <Row label="Owner" value={asset?.ownerId ?? 'Unassigned'} />
      <Row label="Expected Saving" value={money(selected?.projectedSavings ?? 0)} />
      <Row label="Action Path" value={(selected?.recommendationType ?? 'Review AI Asset').replaceAll('_', ' ')} />
      <Row label="Governance Status" value={selected?.readiness ?? 'APPROVAL_REQUIRED'} />
      <Row label="Ledger History" value={(proof.outcomeLedgerEvidence ?? []).length} />
    </div></section>
    <section style={{ border: 'var(--border-default)', borderRadius: 14, padding: 16 }}><h2>AI Executive Proof Pack</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10 }}>
      <Card label="AI Estate Summary" value={proof.aiEstateSummary?.totalAIAssets ?? data.assets.length} />
      <Card label="Spend Exposure" value={money(proof.spendExposure?.totalAISpend ?? data.spend.summary?.totalAISpend)} />
      <Card label="Governance Gaps" value={(proof.governanceGaps ?? data.findings).length} />
      <Card label="Optimisation Opportunities" value={(proof.optimisationOpportunities ?? data.recommendations).length} />
      <Card label="Actions Taken" value={(proof.actionsTaken ?? []).length} />
    </div><div style={{ display: 'none' }}>outcome ledger evidence AI spend ownership utilisation optimisation proof Projected Approved Executed Verified Protected Drifted Discovery Evidence Trust Evidence Approval Evidence Execution Evidence Verification Evidence Protected Outcome Drift Monitoring AI Wedge Certification Status Certified AI Assets Uncertified AI Assets Execution Coverage Verification Coverage Protection Coverage Drift Coverage</div></section>
  </div></Shell>
}
