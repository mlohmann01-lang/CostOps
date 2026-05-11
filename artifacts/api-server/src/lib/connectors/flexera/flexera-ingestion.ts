import { randomUUID } from 'node:crypto';
import { fetchFlexeraEntitlements } from './flexera-client';
import { normalizeFlexeraEntitlements } from './flexera-normalizer';
export async function ingestFlexeraTenant(tenantId:string){ const sourceTimestamp=new Date().toISOString(); const ingestionRunId=randomUUID(); const raw=await fetchFlexeraEntitlements(); const records=normalizeFlexeraEntitlements(tenantId,raw.items,sourceTimestamp,ingestionRunId,'HEALTHY'); return {records,metadata:{tenantId,connector:'FLEXERA',connectorHealth:'HEALTHY',lastSyncTime:sourceTimestamp,dataFreshnessScore:1,freshnessBand:'0_7',partialData:false,requestId:raw.requestId},warnings:[],ingestionRunId}; }
