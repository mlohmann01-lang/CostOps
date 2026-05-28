import { useWorkspace } from '../lib/workspaceContext'
import { demoConnectors, demoGovernanceAuditLog, demoExecution, demoOutcomes, demoDrift, demoIntelligence } from '../data/demo'

export function useExecutionData(){
 const w=useWorkspace();
 if(w.mode==='demo') return { isEmptyLive:false, data:demoExecution }
 return { isEmptyLive:!w.dataReady, data: !w.dataReady ? {awaiting:[],completed:[]} : demoExecution }
}
