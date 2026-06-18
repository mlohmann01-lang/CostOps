import type {GovernedExecutionEvidenceBinding} from './governed-execution-types';
export function evidenceRef(planId:string,type:string,demo=false){return `gexec-${demo?'demo-':''}${type.toLowerCase()}-${planId}-${Date.now()}`}
export function buildEvidenceBinding(tenantId:string,planId:string,type:GovernedExecutionEvidenceBinding['evidenceType'],demo=false):GovernedExecutionEvidenceBinding{const now=new Date().toISOString();return {id:`${planId}-evidence-${type}-${Date.now()}`,tenantId,planId,evidenceRef:evidenceRef(planId,type,demo),evidenceType:type,demo,createdAt:now,updatedAt:now}}
