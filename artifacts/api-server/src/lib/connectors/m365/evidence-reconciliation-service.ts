import { db, evidenceReconciliationFindingsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

export class EvidenceReconciliationService {
  async reconcileM365Evidence(tenantId: string, evidenceRecords: Record<string, any>[]) {
    const findings: any[] = [];
    for (const e of evidenceRecords) {
      const mk = (findingType: string, severity: "WARNING"|"CRITICAL", description: string, recommendedResolution: string) => findings.push({ tenantId, connectorType: "M365", sourceSystem: e.sourceSystem ?? "M365_GRAPH", entityType: "USER", entityId: e.userId ?? e.userPrincipalName ?? "unknown", findingType, severity, status: "OPEN", description, evidenceSnapshot: e, recommendedResolution });
      if (!e.userId && !e.userPrincipalName) mk("MISSING_REQUIRED_FIELD", "CRITICAL", "User identity missing", "Provide userId/userPrincipalName in evidence normalization.");
      if (!e.assignedLicences && !e.assignedLicenses) mk("MISSING_REQUIRED_FIELD", "WARNING", "Assigned licenses missing", "Populate assignedLicences from Graph assignments.");
      if (!e.costCentre) mk("UNKNOWN_COST_CENTRE", "WARNING", "Cost centre is unknown", "Enrich identity source with cost centre mapping.");
      if ((e.monthlyLicenceCost ?? e.cost ?? 0) <= 0 && ((e.assignedLicences ?? e.assignedLicenses ?? []).length > 0)) mk("SKU_COST_MISSING", "WARNING", "SKU cost missing for licensed user", "Load SKU catalogue pricing before evaluation.");
      const lastTs = e.lastSignInAt ? new Date(e.lastSignInAt).getTime() : 0;
      if (lastTs > 0 && Date.now() - lastTs > 90 * 86400000) mk("STALE_EVIDENCE", "WARNING", "Sign-in evidence is stale (>90 days)", "Run sync and verify Graph activity signals.");
      if ((e.mailboxType === "shared" && e.accountStatus === "ACTIVE") || (e.mailboxType === "user" && e.isSharedMailbox === true)) mk("MAILBOX_TYPE_CONFLICT", "CRITICAL", "Mailbox evidence conflicts with account signal", "Reconcile mailbox type from Exchange and user profile.");
    }
    if (findings.length) await db.insert(evidenceReconciliationFindingsTable).values(findings);
    return findings;
  }

  async listFindings(tenantId: string) { return db.select().from(evidenceReconciliationFindingsTable).where(eq(evidenceReconciliationFindingsTable.tenantId, tenantId)).orderBy(desc(evidenceReconciliationFindingsTable.createdAt)); }
  async resolveFinding(findingId: number) { const [r] = await db.update(evidenceReconciliationFindingsTable).set({ status: "RESOLVED", resolvedAt: new Date() }).where(eq(evidenceReconciliationFindingsTable.id, findingId)).returning(); return r; }
  async suppressFinding(findingId: number) { const [r] = await db.update(evidenceReconciliationFindingsTable).set({ status: "SUPPRESSED", resolvedAt: new Date() }).where(eq(evidenceReconciliationFindingsTable.id, findingId)).returning(); return r; }
}
