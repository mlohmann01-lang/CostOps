import type { CommandViewRuntimeOptions } from './commandViewData'
import { seededLineage } from './semantics'

export interface IntelligenceState {
  summary: { opportunityType: string; confidence: number; sourceCoverage: number; forecastConfidence: number; optimisationScenario: string; graphEvidenceReference: string }
  recommendations: Array<{ id: string; title: string; confidence: number; recurrence: 'Low'|'Medium'|'High'; savingAmount: number; lineage: ReturnType<typeof seededLineage> }>
}

export async function loadIntelligenceState(_runtime: CommandViewRuntimeOptions): Promise<IntelligenceState> {
  return {
    summary: { opportunityType: 'License Optimization', confidence: 89, sourceCoverage: 92, forecastConfidence: 86, optimisationScenario: 'Governed reclaim with staged enforcement', graphEvidenceReference: 'graph://ops/m365/license-reclaim' },
    recommendations: [
      { id: 'intel-1', title: 'Reclaim inactive E5 seats', confidence: 90, recurrence: 'Low', savingAmount: 12400, lineage: seededLineage('intel-1') },
      { id: 'intel-2', title: 'Downgrade low-usage Visio plans', confidence: 79, recurrence: 'Medium', savingAmount: 3800, lineage: seededLineage('intel-2') },
    ],
  }
}
