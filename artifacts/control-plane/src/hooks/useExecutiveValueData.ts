import { useCallback, useEffect, useMemo, useState } from 'react'
import { demoExecutiveValueBlockers, demoExecutiveValueDomains, demoExecutiveValueSummary, demoExecutiveValueTopDrivers } from '../data/demo'
import { liveFetch, normalizeApiError } from '../lib/liveApi'
import { useWorkspace } from '../lib/workspaceContext'

export type FinancialGovernanceScenario = { id:string; investmentIdentifier:string; assetOrInitiative:string; businessObjective:string; investmentOwner?:string; spendBasis?:number; budgetBasis?:number; costCentre?:string; financialPeriod?:string; expectedOutcome?:string; measuredOutcome?:string; protectedOutcome?:string; valueRealised?:number; leakage?:number; sourceSystems:string[]; lineage?:string; timestamp?:string; outcomeLinkage?:string; financeConfirmationStatus:'CONFIRMED'|'NOT_CONFIRMED'|'ESTIMATED'|'BLOCKED'; verification:'VERIFIED'|'ESTIMATED'|'MISSING_EVIDENCE'; confidence?:number; decision:any; decisionReason:string; category:string; roi?:number }

export const emptyFinancialGovernanceData = { scenarios: [] as FinancialGovernanceScenario[], summary: { technologyInvestment: undefined as number|undefined, financeConfirmedValue: undefined as number|undefined, protectedValue: undefined as number|undefined, valueLeakage: undefined as number|undefined, valueUnderReview: undefined as number|undefined, budgetUnderGovernance: undefined as number|undefined, investmentConfidence: undefined as number|undefined, verifiedOutcomes: 0, evidenceCompleteness: undefined as number|undefined } }

export function demoFinancialGovernanceData() {
  const scenarios: FinancialGovernanceScenario[] = [
    { id:'fg-m365', investmentIdentifier:'inv-m365-optimisation', assetOrInitiative:'M365 licence recovery', businessObjective:'Reduce unused E5 spend while protecting productivity', investmentOwner:'CIO', spendBasis:850000, budgetBasis:900000, costCentre:'IT-100', financialPeriod:'FY2026-Q3', expectedOutcome:'Recover inactive licences', measuredOutcome:'$96,000 finance-confirmed annual value', protectedOutcome:'Policy prevents licence drift', valueRealised:96000, leakage:0, sourceSystems:['M365','ERP','Outcome Ledger'], lineage:'finance/m365/licence-recovery', timestamp:'2026-07-05T00:00:00.000Z', outcomeLinkage:'outcome:m365:reclaim', financeConfirmationStatus:'CONFIRMED', verification:'VERIFIED', confidence:94, decision:'KEEP', decisionReason:'Finance-confirmed verified value supports keeping the optimisation motion.', category:'Licence recovery', roi:0.11 },
    { id:'fg-saas-dup', investmentIdentifier:'inv-saas-consolidation', assetOrInitiative:'Duplicate capability removal', businessObjective:'Consolidate overlapping collaboration spend', investmentOwner:'COO', spendBasis:390000, budgetBasis:420000, costCentre:'OPS-210', financialPeriod:'FY2026-Q3', expectedOutcome:'Remove duplicate capability', measuredOutcome:'Estimated $180,000 opportunity', protectedOutcome:'Pending consolidation decision', valueRealised:0, leakage:24000, sourceSystems:['Contracts','Usage','Technology Portfolio'], lineage:'finance/saas/duplicate-collab', timestamp:'2026-07-05T00:00:00.000Z', outcomeLinkage:'outcome:collab:pending', financeConfirmationStatus:'ESTIMATED', verification:'ESTIMATED', confidence:68, decision:'CONSOLIDATE', decisionReason:'Duplicate spend evidence supports consolidation.', category:'SaaS consolidation', roi:0.46 },
    { id:'fg-ai-route', investmentIdentifier:'inv-ai-optimisation', assetOrInitiative:'AI model routing optimisation', businessObjective:'Lower AI run-rate while preserving service quality', investmentOwner:'CTO', spendBasis:168000, budgetBasis:200000, costCentre:'AI-500', financialPeriod:'FY2026-Q3', expectedOutcome:'Reduce expensive model calls', measuredOutcome:'Partial value measured; finance not confirmed', protectedOutcome:'Policy guardrail protects optimised routing', valueRealised:64000, leakage:12000, sourceSystems:['AI Gateway','ERP','Outcome Ledger'], lineage:'finance/ai/model-routing', timestamp:'2026-07-05T00:00:00.000Z', outcomeLinkage:'outcome:ai:routing', financeConfirmationStatus:'NOT_CONFIRMED', verification:'ESTIMATED', confidence:72, decision:'OPTIMISE', decisionReason:'Under-performing investment evidence supports optimisation.', category:'AI optimisation', roi:0.38 },
    { id:'fg-cloud-neg', investmentIdentifier:'inv-cloud-resize', assetOrInitiative:'Cloud optimisation pilot', businessObjective:'Reduce compute cost without service impact', investmentOwner:'VP Infrastructure', spendBasis:312000, budgetBasis:300000, costCentre:'CLOUD-700', financialPeriod:'FY2026-Q3', expectedOutcome:'Rightsize compute', measuredOutcome:'Negative ROI after rollback and re-provisioning', protectedOutcome:'No protected value', valueRealised:-18000, leakage:60000, sourceSystems:['Cloud Billing','ERP','Execution Center'], lineage:'finance/cloud/rightsizing', timestamp:'2026-07-05T00:00:00.000Z', outcomeLinkage:'outcome:cloud:drifted', financeConfirmationStatus:'CONFIRMED', verification:'VERIFIED', confidence:81, decision:'RETIRE', decisionReason:'Negative ROI evidence supports retirement.', category:'Cloud optimisation', roi:-0.06 },
    { id:'fg-renewal-blocked', investmentIdentifier:'inv-renewal-avoidance', assetOrInitiative:'Legacy CRM renewal avoidance', businessObjective:'Avoid low-value renewal', investmentOwner:'Revenue Operations', spendBasis:400000, budgetBasis:400000, costCentre:'REV-220', financialPeriod:'FY2026-Q3', expectedOutcome:'Avoid renewal', measuredOutcome:undefined, protectedOutcome:undefined, valueRealised:undefined, leakage:400000, sourceSystems:['Contracts'], lineage:'finance/renewal/legacy-crm', timestamp:'2026-07-05T00:00:00.000Z', outcomeLinkage:undefined, financeConfirmationStatus:'BLOCKED', verification:'MISSING_EVIDENCE', confidence:22, decision:'BLOCKED', decisionReason:'No financial evidence is available to support an investment decision.', category:'Renewal avoidance', roi:undefined },
    { id:'fg-growth', investmentIdentifier:'inv-data-product', assetOrInitiative:'Customer data product expansion', businessObjective:'Expand proven analytics capability', investmentOwner:'CFO', spendBasis:220000, budgetBasis:250000, costCentre:'DATA-400', financialPeriod:'FY2026-Q3', expectedOutcome:'Scale finance analytics outcome', measuredOutcome:'Verified $310,000 business value', protectedOutcome:'Protected by outcome monitoring', valueRealised:310000, leakage:0, sourceSystems:['ERP','Analytics','Outcome Ledger'], lineage:'finance/data/growth', timestamp:'2026-07-05T00:00:00.000Z', outcomeLinkage:'outcome:data:growth', financeConfirmationStatus:'CONFIRMED', verification:'VERIFIED', confidence:91, decision:'EXPAND', decisionReason:'Verified growth evidence supports expansion.', category:'Growth opportunity', roi:1.41 },
  ]
  return { scenarios, summary: { technologyInvestment: 2340000, financeConfirmedValue: 388000, protectedValue: 406000, valueLeakage: 496000, valueUnderReview: 244000, budgetUnderGovernance: 2470000, investmentConfidence: 71, verifiedOutcomes: 3, evidenceCompleteness: 67 } }
}

export type ExecutiveValueDataState = 'LIVE' | 'DEMO' | 'NOT_CONNECTED' | 'NO_DATA'
const emptyExecutiveValueSummary: any = { valueMetrics: {}, confidence: {}, counts: {} }

export function useExecutiveValueData() {
  const workspace = useWorkspace()
  const [summary, setSummary] = useState<any>(workspace.mode === 'demo' ? demoExecutiveValueSummary : emptyExecutiveValueSummary)
  const [domains, setDomains] = useState<any[]>(workspace.mode === 'demo' ? demoExecutiveValueDomains : [])
  const [topDrivers, setTopDrivers] = useState<any[]>(workspace.mode === 'demo' ? demoExecutiveValueTopDrivers : [])
  const [blockers, setBlockers] = useState<any[]>(workspace.mode === 'demo' ? demoExecutiveValueBlockers : [])
  const [dataState, setDataState] = useState<ExecutiveValueDataState>(workspace.mode === 'demo' ? 'DEMO' : 'NOT_CONNECTED')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [financialGovernance, setFinancialGovernance] = useState<any>(workspace.mode === 'demo' ? demoFinancialGovernanceData() : emptyFinancialGovernanceData)

  const refresh = useCallback(async () => {
    if (workspace.mode === 'demo') { setSummary(demoExecutiveValueSummary); setDomains(demoExecutiveValueDomains); setTopDrivers(demoExecutiveValueTopDrivers); setBlockers(demoExecutiveValueBlockers); setFinancialGovernance(demoFinancialGovernanceData()); setDataState('DEMO'); setError(null); return demoExecutiveValueSummary }
    if (!workspace.dataReady) { setSummary(emptyExecutiveValueSummary); setDomains([]); setTopDrivers([]); setBlockers([]); setFinancialGovernance(emptyFinancialGovernanceData); setDataState('NOT_CONNECTED'); setError(null); return emptyExecutiveValueSummary }
    setLoading(true)
    try {
      const [nextSummary, nextDomains, nextDrivers, nextBlockers]: any[] = await Promise.all([liveFetch('/api/executive-value/summary'), liveFetch('/api/executive-value/domains'), liveFetch('/api/executive-value/top-drivers'), liveFetch('/api/executive-value/blockers')])
      const normalizedDomains = nextDomains.domains ?? []
      const normalizedDrivers = nextDrivers.topDrivers ?? []
      setSummary(nextSummary); setDomains(normalizedDomains); setTopDrivers(normalizedDrivers); setBlockers(nextBlockers.blockers ?? []); setFinancialGovernance((nextSummary as any).financialGovernance ?? emptyFinancialGovernanceData)
      setDataState(normalizedDomains.length === 0 && normalizedDrivers.length === 0 ? 'NO_DATA' : 'LIVE')
      setError(null); return nextSummary
    } catch (err) {
      const next = normalizeApiError(err)
      setSummary(emptyExecutiveValueSummary); setDomains([]); setTopDrivers([]); setBlockers([]); setFinancialGovernance(emptyFinancialGovernanceData)
      setDataState('NO_DATA'); setError(next); throw next
    } finally { setLoading(false) }
  }, [workspace.mode, workspace.dataReady])

  useEffect(() => { void refresh().catch(() => undefined) }, [refresh])

  const generateEvidencePack = useCallback(async () => {
    if (workspace.mode === 'demo') return { evidencePackId: 'ep-executive-demo', scope: 'TENANT', status: 'COMPLETE' }
    if (!workspace.dataReady) return { status: 'UNAVAILABLE' }
    setLoading(true)
    try { const pack = await liveFetch('/api/executive-value/evidence-pack', { method: 'POST' }); await refresh(); return pack } catch (err) { const next = normalizeApiError(err); setError(next); throw next } finally { setLoading(false) }
  }, [workspace.mode, workspace.dataReady, refresh])

  return useMemo(() => ({ summary, domains, topDrivers, blockers, financialGovernance, dataState, loading, error, refresh, generateEvidencePack, isDemo: workspace.mode === 'demo', dataReady: workspace.dataReady }), [summary, domains, topDrivers, blockers, financialGovernance, dataState, loading, error, refresh, generateEvidencePack, workspace.mode, workspace.dataReady])
}
