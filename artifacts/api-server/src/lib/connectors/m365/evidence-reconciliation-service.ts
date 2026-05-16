import { db, evidenceReconciliationFindingsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

export class EvidenceReconciliationService {
  async reconcileM365Evidence(tenantId: string, evidenceRecords: Record<string, any>[]) {
    const findings: any[] = [];
    for (const e of evidenceRecords) {
      const mk = (findingType: string, severity: "WARNING"|"CRITICAL", description: string, recommendedResolution: string) => findings.push({ tenantId, connectorType: "M365", sourceSystem: e.sourceSystem ?? "M365_GRAPH", entityType: "USER", entityId: e.userId ?? e.userPrincipalName ?? "unknown", findingType, severity, status: "OPEN", description, evidenceSnapshot: e, recommendedResolution });
      if (!e.userId || !e.userPrincipalName) mk("M365_LICENSE_ASSIGNMENT_CONFLICT", "CRITICAL", "Identity/licensing association is incomplete.", "Provide normalized userId+UPN with assigned SKU mappings.");
      if (e.copilotUsage === "UNKNOWN") mk("M365_COPILOT_USAGE_UNAVAILABLE", "WARNING", "Copilot usage evidence unavailable.", "Enable Copilot telemetry and refresh sync.");
      if (e.desktopAppUsage === "UNKNOWN" || e.webUsage === "UNKNOWN") mk("M365_USAGE_EVIDENCE_MISSING", "WARNING", "Usage evidence missing for one or more required workload signals.", "Populate workload usage sources.");
      if (e.mailboxStorageBytes === "UNKNOWN" && e.oneDriveStorageBytes === "UNKNOWN" && e.sharePointStorageBytes === "UNKNOWN") mk("M365_STORAGE_EVIDENCE_UNAVAILABLE", "WARNING", "Storage evidence unavailable.", "Load mailbox/OneDrive/SharePoint storage metrics.");
      if (e.overlappingSkuDetected === true) mk("M365_SKU_OVERLAP_CONFLICT", "WARNING", "Overlapping SKU entitlement suspected.", "Reconcile assigned SKUs against service-plan overlap map.");
      if (e.isSharedMailbox === "UNKNOWN") mk("M365_SHARED_MAILBOX_CONFIDENCE_LOW", "WARNING", "Shared mailbox confidence is low.", "Validate mailbox type from Exchange evidence.");
      if (e.isServiceAccount === "UNKNOWN") mk("M365_SERVICE_ACCOUNT_CONFIDENCE_LOW", "WARNING", "Service account confidence is low.", "Validate account classification evidence.");
      if (e.isPrivileged === true) mk("M365_PRIVILEGED_ACCOUNT_EXCLUSION", "WARNING", "Privileged account requires governance review.", "Route recommendation to governance review.");
      if (e.retentionPolicy === "UNKNOWN") mk("M365_RETENTION_POLICY_UNKNOWN", "WARNING", "Retention policy evidence is unknown.", "Load retention policy metadata.");
      if (e.legalHold === true) mk("M365_LEGAL_HOLD_BLOCKER", "CRITICAL", "Legal hold blocks storage-modifying recommendation.", "Suppress storage action recommendation.");
      if (e.evidenceFreshness === "STALE") mk("M365_CONNECTOR_FRESHNESS_DEGRADED", "WARNING", "Connector freshness degraded (stale evidence).", "Refresh connector sync.");
      if (e.evidenceFreshness === "EXPIRED") mk("M365_USAGE_DATA_STALE", "CRITICAL", "Usage evidence is expired.", "Collect fresh usage evidence before recommendation.");
      if ((e.pricingConfidence ?? 0) < 0.5) mk("M365_PRICING_EVIDENCE_UNAVAILABLE", "WARNING", "Pricing evidence unavailable or low confidence.", "Load tenant SKU pricing.");
    }
    if (findings.length) await db.insert(evidenceReconciliationFindingsTable).values(findings);
    return findings;
  }

  async listFindings(tenantId: string) { return db.select().from(evidenceReconciliationFindingsTable).where(eq(evidenceReconciliationFindingsTable.tenantId, tenantId)).orderBy(desc(evidenceReconciliationFindingsTable.createdAt)); }
  async resolveFinding(findingId: number) { const [r] = await db.update(evidenceReconciliationFindingsTable).set({ status: "RESOLVED", resolvedAt: new Date() }).where(eq(evidenceReconciliationFindingsTable.id, findingId)).returning(); return r; }
  async suppressFinding(findingId: number) { const [r] = await db.update(evidenceReconciliationFindingsTable).set({ status: "SUPPRESSED", resolvedAt: new Date() }).where(eq(evidenceReconciliationFindingsTable.id, findingId)).returning(); return r; }
}
