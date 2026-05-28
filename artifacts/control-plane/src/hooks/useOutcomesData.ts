import { useWorkspace } from '../lib/workspaceContext'
import { demoConnectors, demoGovernanceAuditLog, demoExecution, demoOutcomes, demoDrift, demoIntelligence } from '../data/demo'

export function useOutcomesData(){
 const w=useWorkspace();
 if(w.mode==='demo') return { isEmptyLive:false, data:demoOutcomes }
 return { isEmptyLive:!w.dataReady, data: !w.dataReady ? {stats:[],ledger:[]} : demoOutcomes }
}
