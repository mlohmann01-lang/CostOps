import { useWorkspace } from '../lib/workspaceContext'
import { demoConnectors, demoGovernanceAuditLog, demoExecution, demoOutcomes, demoDrift, demoIntelligence } from '../data/demo'

export function useConnectorHubData(){
 const w=useWorkspace();
 if(w.mode==='demo') return { isEmptyLive:false, data:demoConnectors }
 return { isEmptyLive:!w.dataReady, data: !w.dataReady ? [] : demoConnectors }
}
