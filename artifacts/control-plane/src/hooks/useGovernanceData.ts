import { useWorkspace } from '../lib/workspaceContext'
import { demoConnectors, demoGovernanceAuditLog, demoExecution, demoOutcomes, demoDrift, demoIntelligence } from '../data/demo'

export function useGovernanceData(){
 const w=useWorkspace();
 if(w.mode==='demo') return { isEmptyLive:false, data:demoGovernanceAuditLog }
 return { isEmptyLive:!w.dataReady, data: !w.dataReady ? [] : demoGovernanceAuditLog }
}
