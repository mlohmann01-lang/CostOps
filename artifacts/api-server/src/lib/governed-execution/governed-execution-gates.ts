import type {GovernedExecutionGateCheck,GovernedExecutionPlan,GateKey} from './governed-execution-types';
const gate=(p:GovernedExecutionPlan,key:GateKey,pass:boolean,required:boolean,reason:string):GovernedExecutionGateCheck=>{const now=new Date().toISOString();return {id:`${p.id}-gate-${key}`,tenantId:p.tenantId,planId:p.id,gateKey:key,status:required?(pass?'PASS':'FAIL'):(pass?'PASS':'WARN'),severity:pass?'LOW':(required?'CRITICAL':'MEDIUM'),reason:pass?'Gate satisfied':reason,nextStep:pass?undefined:'Resolve gate before execution.',evidenceRefs:p.evidenceRefs,createdAt:now,updatedAt:now}};
export function evaluateGates(p:GovernedExecutionPlan,opts:any={}){return [
 gate(p,'APPROVAL_PRESENT',!p.requiresApproval||opts.allowPendingApproval===true||p.approverUserIds.length>0||p.status==='APPROVED',p.requiresApproval,'Approval is required.'),
 gate(p,'OWNER_PRESENT',!p.requiresOwnership||!!p.ownerUserId,p.requiresOwnership,'Owner is required.'),
 gate(p,'COST_CENTRE_PRESENT',!p.requiresFinanceVerification||!!p.costCentreId,p.requiresFinanceVerification,'Cost centre is required for finance verification.'),
 gate(p,'EVIDENCE_PRESENT',!p.requiresEvidence||p.evidenceRefs.length>0,p.requiresEvidence,'Evidence is required.'),
 gate(p,'LIVE_TENANT_READY',!p.requiresLiveReadiness||opts.liveTenantReady===true,p.requiresLiveReadiness,'Live tenant readiness is blocked.'),
 gate(p,'CONNECTOR_READY',opts.connectorReady!==false,true,'Connector readiness is blocked.'),
 gate(p,'ACTION_SUPPORTED',opts.actionSupported!==false,true,'Action is not supported by governed execution.'),
 gate(p,'DESTRUCTIVE_ACTION_ALLOWED',!p.destructive||opts.allowDestructiveActions===true,p.destructive,'Destructive actions are disabled by default.'),
 gate(p,'ROLLBACK_AVAILABLE',!p.destructive||p.reversible===true,p.destructive,'Rollback must be available for destructive actions.'),
 gate(p,'FINANCE_VERIFICATION_AVAILABLE',!p.requiresFinanceVerification||opts.financeVerificationAvailable===true,p.requiresFinanceVerification,'Finance verification is missing.'),
 gate(p,'GRAPH_READY',opts.graphReady!==false,false,'Graph integration unavailable.')
]}
export const hasCriticalGateFailure=(checks:GovernedExecutionGateCheck[])=>checks.some(c=>c.status==='FAIL'&&c.severity==='CRITICAL');
