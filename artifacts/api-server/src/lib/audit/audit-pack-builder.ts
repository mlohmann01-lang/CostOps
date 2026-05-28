import { randomUUID } from 'crypto';
import type { AuditExportFormat, AuditPack } from './audit-pack-types';

export function buildAuditPack(input:{tenantId:string; entityType:string; entityId:string; generatedBy:string; format:AuditExportFormat; timeline:any[]; approvals?:any[]; policy?:any[]; execution?:any[]; outcomes?:any[]; drift?:any[]; savings?:{monthly:number;annual:number};}): AuditPack {
  const generatedAt = new Date().toISOString();
  const savings = input.savings ?? { monthly:0, annual:0 };
  const base: AuditPack = { auditPackId:`ap_${randomUUID()}`, tenantId:input.tenantId, entityType:input.entityType, entityId:input.entityId, generatedAt, generatedBy:input.generatedBy, summary:`Audit pack for ${input.entityType} ${input.entityId}`, stateTimeline:input.timeline, evidenceSnapshots:input.timeline.map((t)=>t.evidenceSnapshot).filter(Boolean), governanceEvents:input.timeline, approvalHistory:input.approvals ?? [], policyDecisions:input.policy ?? [], executionEvidence:input.execution ?? [], outcomeEvidence:input.outcomes ?? [], driftEvidence:input.drift ?? [], savingsSummary:savings, exportFormat:input.format, content:{} };
  if (input.format === 'Markdown') {
    base.content = `# Executive summary\n\n${base.summary}\n\n## Entity details\n- Type: ${base.entityType}\n- Id: ${base.entityId}\n\n## Current state\n- Timeline events: ${base.stateTimeline.length}\n\n## Economic impact\n- Monthly savings: ${savings.monthly}\n- Annual savings: ${savings.annual}\n\n## Governance timeline\n${base.governanceEvents.map((e:any)=>`- ${e.createdAt}: ${e.eventType}`).join('\n')}\n\n## Approval history\n${base.approvalHistory.length}\n\n## Policy decisions\n${base.policyDecisions.length}\n\n## Execution/dry-run evidence\n${base.executionEvidence.length}\n\n## Outcome verification\n${base.outcomeEvidence.length}\n\n## Drift status\n${base.driftEvidence.length}\n\n## Evidence appendix\n${JSON.stringify(base.evidenceSnapshots, null, 2)}`;
  } else {
    base.content = { ...base };
  }
  return base;
}
