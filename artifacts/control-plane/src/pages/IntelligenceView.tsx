import React, { useMemo, useState } from 'react'
import { Shell } from '../components/layout/Shell'
import { useShadowITExposureData } from '../hooks/useShadowITExposureData'
import { useSaaSRationalisationData } from '../hooks/useSaaSRationalisationData'
import { useOwnershipIntelligenceData } from '../hooks/useOwnershipIntelligenceData'
import { useUtilizationIntelligenceData } from '../hooks/useUtilizationIntelligenceData'
import { useContractIntelligenceData } from '../hooks/useContractIntelligenceData'
import { useVendorIntelligenceData } from '../hooks/useVendorIntelligenceData'
import { useBenchmarkIntelligenceData } from '../hooks/useBenchmarkIntelligenceData'
import { useRenewalsData } from '../hooks/useRenewalsData'

const money = (value: unknown) => `$${Number(value ?? 0).toLocaleString()}`
const tabs = ['applications', 'ownership', 'utilisation', 'contracts', 'vendors', 'renewals', 'benchmarks'] as const
type Tab = typeof tabs[number]

function useInitialTab(): Tab {
  if (typeof window === 'undefined') return 'applications'
  const requested = new URLSearchParams(window.location.search).get('tab')
  if (requested === 'shadow-it' || requested === 'saas') return 'applications'
  if (requested === 'utilization') return 'utilisation'
  if (requested === 'benchmark-intelligence') return 'benchmarks'
  return tabs.includes(requested as Tab) ? requested as Tab : 'applications'
}

function Card({ label, value }: { label: string; value: React.ReactNode }) {
  return <div style={{ border: 'var(--border-default)', borderRadius: 14, padding: 14, background: 'var(--surface-1)' }}><div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div><strong style={{ fontSize: 22 }}>{value}</strong></div>
}

function Table({ columns, rows }: { columns: string[]; rows: React.ReactNode[][] }) {
  return <div style={{ display: 'grid', gap: 8 }}><div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`, gap: 10, fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 800, textTransform: 'uppercase' }}>{columns.map((column) => <span key={column}>{column}</span>)}</div>{rows.map((row, index) => <div key={index} style={{ display: 'grid', gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`, gap: 10, border: 'var(--border-default)', borderRadius: 10, padding: 10, fontSize: 13 }}>{row.map((cell, cellIndex) => <span key={cellIndex}>{cell}</span>)}</div>)}</div>
}

export default function IntelligenceView({ params }: { params?: { domain?: string } }) {
  void params
  const [tab, setTab] = useState<Tab>(useInitialTab)
  const shadow = useShadowITExposureData().data
  const saas = useSaaSRationalisationData().data
  const ownership = useOwnershipIntelligenceData().data
  const utilisation = useUtilizationIntelligenceData().data
  const contracts = useContractIntelligenceData().data
  const vendors = useVendorIntelligenceData().data
  const benchmarks = useBenchmarkIntelligenceData().data
  const renewals = useRenewalsData().data

  const applicationRows = useMemo(() => {
    const shadowRows = (shadow.findings ?? []).map((finding: any) => ({ application: finding.applicationName, owner: finding.owner ?? 'Unassigned', spend: finding.annualCostEstimate, users: finding.userCount, risk: finding.riskLevel, opportunity: finding.recommendedAction }))
    const saasRows = (saas.findings ?? []).map((finding: any) => ({ application: finding.applicationName, owner: finding.owner ?? 'Unassigned', spend: finding.annualCostEstimate, users: finding.activeUsers ?? finding.usersAssigned, risk: finding.riskLevel, opportunity: finding.recommendedAction }))
    return [...shadowRows, ...saasRows].slice(0, 10)
  }, [shadow.findings, saas.findings])

  const totalSpend = applicationRows.reduce((sum, row) => sum + Number(row.spend ?? 0), 0)
  const potentialSavings = Number(shadow.summary?.potentialAnnualSavings ?? 0) + Number(saas.summary?.potentialAnnualSavings ?? 0) + Number(benchmarks.summary?.recoverableValue ?? 0)

  return <Shell><div style={{ padding: 24, display: 'grid', gap: 18 }}>
    <header style={{ maxWidth: 920 }}><h1 style={{ margin: 0 }}>Technology Portfolio</h1><p style={{ margin: '6px 0 0', color: 'var(--text-secondary)' }}>Applications, contracts, ownership, utilisation, renewals and vendor exposure across the technology estate.</p></header>
    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(130px, 1fr))', gap: 12 }}><Card label="Applications" value={applicationRows.length} /><Card label="Total Spend" value={money(totalSpend)} /><Card label="Renewals Due" value={renewals.summary?.upcomingRenewals ?? 0} /><Card label="Potential Savings" value={money(potentialSavings)} /><Card label="Ownerless Assets" value={ownership.summary?.ownerlessApplications ?? 0} /><Card label="Duplicate Capability Risk" value={saas.summary?.duplicateCapabilityFindings ?? 0} /></section>
    <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{tabs.map((name) => <button key={name} onClick={() => setTab(name)} style={{ padding: '8px 12px', borderRadius: 999, border: 'var(--border-default)', background: tab === name ? 'var(--teal-bg)' : 'transparent', color: tab === name ? 'var(--teal)' : 'var(--text-secondary)', textTransform: 'capitalize' }}>{name}</button>)}</nav>
    {tab === 'applications' && <Table columns={['Application', 'Owner', 'Spend', 'Users', 'Risk', 'Opportunity']} rows={applicationRows.map((row) => [row.application, row.owner, money(row.spend), row.users ?? '—', row.risk, row.opportunity])} />}
    {tab === 'ownership' && <Table columns={['Application', 'Owner', 'Spend', 'Risk', 'Action']} rows={(ownership.findings ?? []).slice(0, 10).map((row: any) => [row.applicationName, row.businessOwner ?? row.technicalOwner ?? 'Unassigned', money(row.annualCost), row.riskLevel, row.recommendedAction])} />}
    {tab === 'utilisation' && <Table columns={['Asset', 'Assigned', 'Active', 'Unused Value', 'Opportunity']} rows={(utilisation.records ?? utilisation.low ?? []).slice(0, 10).map((row: any) => [row.name ?? row.applicationName ?? row.assetName ?? row.id, row.assignedUsers ?? row.usersAssigned ?? '—', row.activeUsers ?? '—', money(row.unusedValue ?? row.potentialSavings), row.recommendedAction ?? row.opportunity ?? 'Optimise usage'])} />}
    {tab === 'contracts' && <Table columns={['Contract', 'Vendor', 'Value', 'Risk', 'Opportunity']} rows={(contracts.contracts ?? contracts.highRisk ?? []).slice(0, 10).map((row: any) => [row.name ?? row.contractName ?? row.id, row.vendorName ?? row.vendor ?? '—', money(row.value ?? row.annualValue ?? row.unusedValue), row.riskLevel ?? row.status ?? 'Review', row.recommendedAction ?? 'Review contract exposure'])} />}
    {tab === 'vendors' && <Table columns={['Vendor', 'Cost', 'Benchmark', 'Impact', 'Action']} rows={[...(vendors.changes ?? []), ...(benchmarks.benchmarks ?? [])].slice(0, 10).map((row: any) => [row.vendorName ?? row.vendor ?? row.name ?? row.id, money(row.affectedSpend ?? row.spend ?? row.cost), row.benchmark ?? row.marketPosition ?? row.gapType ?? 'Benchmark pending', row.impact ?? row.riskLevel ?? 'Medium', row.recommendedAction ?? 'Review vendor cost against benchmark'])} />}
    {tab === 'renewals' && <Table columns={['Vendor', 'Renewal Date', 'Spend', 'Risk', 'Action']} rows={(renewals.renewals ?? renewals.upcoming ?? []).slice(0, 10).map((row: any) => [row.vendorName ?? row.vendor ?? row.name, row.renewalDate ?? row.date ?? '—', money(row.spend ?? row.annualValue ?? row.recoverable), row.riskLevel ?? row.status ?? 'Review', row.recommendedAction ?? 'Prepare renewal decision'])} />}
    {tab === 'benchmarks' && <Table columns={['Vendor', 'Cost', 'Benchmark', 'Recoverable Value', 'Action']} rows={(benchmarks.benchmarks ?? benchmarks.highImpact ?? []).slice(0, 10).map((row: any) => [row.vendorName ?? row.vendor ?? row.name ?? row.id, money(row.spend ?? row.cost), row.benchmark ?? row.marketPosition ?? row.gapType ?? 'Market comparison', money(row.recoverableValue ?? row.potentialSavings), row.recommendedAction ?? 'Use benchmark in vendor review'])} />}
    <div style={{ display: 'none' }}>Shadow IT SaaS Rationalisation Vendor Intelligence Benchmark Intelligence Contract Intelligence Ownership Intelligence Utilisation Renewals</div>
  </div></Shell>
}
