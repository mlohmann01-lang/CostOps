import { useWorkspace } from '../lib/workspaceContext'
import { demoConnectors, demoGovernanceAuditLog, demoExecution, demoOutcomes, demoDrift, demoIntelligence } from '../data/demo'

export function useIntelligenceData(){
 const w=useWorkspace();
 if(w.mode==='demo') return { isEmptyLive:false, data:demoIntelligence }
 return { isEmptyLive:!w.dataReady, data: !w.dataReady ? {funnel:{identified:0,eligible:0,pending:0,realised:0}} : demoIntelligence }
}
