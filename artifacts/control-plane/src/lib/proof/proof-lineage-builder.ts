import type { GovernanceAction } from '../../types/governance'
import type { ProofLineageNode } from './proof-lineage-types'
import { getFlexeraSignal } from '../authority/flexera-authority-normalizer'

export function buildProofLineage(action: GovernanceAction, isDemo: boolean): ProofLineageNode[] {
  const now = new Date().toISOString()
  const flexera = getFlexeraSignal(action.id)
  const blocked = action.verdict !== 'GOVERNED_EXECUTION_ELIGIBLE'
  return [
    { id:'evidence', type:'Evidence Source', label:'Connector evidence ingested', status:'Complete', source:'OpenAI/AWS/M365 connectors', confidence:0.9, timestamp:now, isSynthetic:isDemo, isEstimated:false, authorityType:'Usage evidence', description:'Base telemetry and billing evidence imported.', children:[] },
    { id:'normalized', type:'Normalized Signal', label:'Signals normalized', status:'Complete', source:'Certen normalizer', confidence:0.88, timestamp:now, isSynthetic:isDemo, isEstimated:true, authorityType:'Cost evidence', description:'Signals normalized into governance model.', children:[] },
    { id:'recommendation', type:'Recommendation', label:action.name, status:'Complete', source:'Recommendation engine', confidence:0.86, timestamp:now, isSynthetic:isDemo, isEstimated:true, authorityType:'Cost evidence', description:action.description, children:[] },
    { id:'readiness', type:'Readiness Gate', label:'Governance readiness', status:blocked?'Warning':'Complete', source:'Policy gates', confidence:blocked?0.7:0.9, timestamp:now, isSynthetic:isDemo, isEstimated:false, authorityType:'Approval evidence', description:blocked?'Approval/readiness gate still active.':'Readiness gate passed.', children:[] },
    { id:'authority', type:'Authority Evidence', label:'Flexera authority evidence', status:flexera? 'Complete':'Pending', source:'Flexera authority', confidence:flexera?0.91:0.45, timestamp:now, isSynthetic:true, isEstimated:!flexera, authorityType:'Entitlement evidence', description:flexera?.reason ?? 'Authority evidence unavailable — configure Flexera to validate entitlement position.', children:[] },
    { id:'approval', type:'Approval', label:'Approval state', status:blocked?'Pending':'Complete', source:'Approvals policy', confidence:blocked?0.6:0.9, timestamp:now, isSynthetic:isDemo, isEstimated:false, authorityType:'Approval evidence', description:'Approval and segregation checks.', children:[] },
    { id:'execution', type:'Execution', label:'Execution lifecycle', status:blocked?'Blocked':'Pending', source:'Execution orchestration', confidence:blocked?0.4:0.8, timestamp:now, isSynthetic:isDemo, isEstimated:true, authorityType:'Execution evidence', description:'Execution progression and queue state.', children:[] },
    { id:'verification', type:'Verification', label:'Verification maturity', status:blocked?'Pending':'Warning', source:'Outcome verification', confidence:0.72, timestamp:now, isSynthetic:isDemo, isEstimated:true, authorityType:'Verification evidence', description:'Pending verification until evidence re-check completes.', children:[] },
    { id:'drift', type:'Drift Monitor', label:'Drift stability monitor', status:'Warning', source:'Drift monitor', confidence:0.68, timestamp:now, isSynthetic:isDemo, isEstimated:true, authorityType:'Drift evidence', description:'Recurrence risk monitored continuously.', children:[] },
    { id:'rollback', type:'Rollback', label:`Rollback ${action.rollback}`, status: action.rollback==='NONE'?'Blocked':'Complete', source:'Rollback policy', confidence: action.rollback==='NONE'?0.3:0.85, timestamp:now, isSynthetic:isDemo, isEstimated:false, authorityType:'Execution evidence', description:'Rollback availability and safety constraints.', children:[] },
  ]
}
