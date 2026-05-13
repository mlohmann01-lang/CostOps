import { ingestM365Tenant } from "../connectors/m365-ingestion";
import { ingestFlexeraTenant } from "../connectors/flexera/flexera-ingestion";
import { ingestServiceNowTenant } from "../connectors/servicenow/servicenow-ingestion";
import { runReconciliation } from "../reconciliation/reconciliation-engine";
import { checkM365LicenceReclaimDrift } from "../monitoring/drift-monitor";
import { db, outcomeLedgerTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { resolveProjectedSavings } from "../pricing/pricing-engine";

export const JOB_HANDLERS: Record<string, (input:any)=>Promise<any>> = {
  M365_SYNC: async ({tenantId}:any)=>ingestM365Tenant(tenantId),
  FLEXERA_SYNC: async ({tenantId}:any)=>ingestFlexeraTenant(tenantId),
  SERVICENOW_SYNC: async ({tenantId}:any)=>ingestServiceNowTenant(tenantId),
  PLAYBOOK_EVALUATION: async ({tenantId,runPlaybookEvaluation}:any)=>runPlaybookEvaluation?.(tenantId) ?? {status:"SKIPPED",reason:"evaluation route binding not configured"},
  RECONCILIATION_RUN: async ({tenantId}:any)=>runReconciliation(tenantId),
  DRIFT_SCAN: async ({tenantId}:any)=>{ const rows=await db.select().from(outcomeLedgerTable).where(and(eq(outcomeLedgerTable.tenantId,tenantId),eq(outcomeLedgerTable.executionStatus,"EXECUTED"))).orderBy(desc(outcomeLedgerTable.createdAt)).limit(10); let c=0; for(const r of rows){ await checkM365LicenceReclaimDrift({tenantId,recommendationId:r.recommendationId,action:r.action,outcomeLedgerRow:r}); c++; } return {rows:c};},
  PRICING_REFRESH: async ({tenantId}:any)=>resolveProjectedSavings(tenantId,"E5",1),
  PRICING_DRIFT_DETECTION: async ()=>({status:"SKIPPED",reason:"pricing drift detector not configured"}),
  OUTCOME_VERIFICATION: async ()=>({status:"SKIPPED",reason:"verification connector not configured"}),
};
