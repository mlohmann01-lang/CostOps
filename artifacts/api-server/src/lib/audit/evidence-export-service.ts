import { buildAuditPack } from './audit-pack-builder';
import type { AuditExportFormat, AuditPack } from './audit-pack-types';
import { getEntityTimeline } from '../events/evidence-timeline';

const mem = new Map<string, AuditPack>();
const key = (tenantId:string, id:string)=>`${tenantId}:${id}`;

export function generateAuditPack(input:{tenantId:string; entityType:string; entityId:string; generatedBy:string; format:AuditExportFormat; approvals?:any[]; policy?:any[]; execution?:any[]; outcomes?:any[]; drift?:any[]; savings?:{monthly:number;annual:number};}) {
  const timeline = getEntityTimeline(input.tenantId, input.entityType, input.entityId);
  const pack = buildAuditPack({ ...input, timeline });
  mem.set(key(input.tenantId, pack.auditPackId), pack);
  return pack;
}
export function getAuditPack(tenantId:string, auditPackId:string) { return mem.get(key(tenantId, auditPackId)) ?? null; }
