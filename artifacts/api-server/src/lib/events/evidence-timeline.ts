import type { UnifiedGovernanceEvent } from './types';

const mem = new Map<string, UnifiedGovernanceEvent[]>();
const key = (tenantId:string)=>tenantId;

export function appendUnifiedEvent(event: UnifiedGovernanceEvent) { const k=key(event.tenantId); mem.set(k,[...(mem.get(k)??[]),event]); }
export function listUnifiedEvents(tenantId:string) { return [...(mem.get(key(tenantId))??[])].sort((a,b)=>new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime() || a.eventId.localeCompare(b.eventId)); }
export function getEntityTimeline(tenantId:string, entityType:string, entityId:string) { return listUnifiedEvents(tenantId).filter((e)=>e.entityType===entityType && e.entityId===entityId); }
