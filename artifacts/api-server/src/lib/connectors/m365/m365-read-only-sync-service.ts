import { db, m365ConnectorConfigsTable, m365EvidenceRecordsTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { getGraphAccessToken } from "./m365-graph-client";
import { M365GraphReadOnlyClient } from "./m365-graph-read-only-client";
import { M365EvidenceNormalizationService } from "./m365-evidence-normalization-service";
import { EvidenceReconciliationService } from "./evidence-reconciliation-service";
import { ConnectorTrustService } from "./connector-trust-service";

export class M365ReadOnlySyncService {
  private normalizer = new M365EvidenceNormalizationService();
  private reconciliationService = new EvidenceReconciliationService();
  private trustService = new ConnectorTrustService();

  async runReadOnlySync(tenantId: string) {
    const startedAt = new Date().toISOString();
    const [cfg] = await db.select().from(m365ConnectorConfigsTable).where(eq(m365ConnectorConfigsTable.tenantId, tenantId)).limit(1);
    if (!cfg || cfg.mode !== "READ_ONLY") throw new Error("M365 connector not configured in READ_ONLY mode");

    await db.update(m365ConnectorConfigsTable).set({ status: "SYNCING", lastSyncStartedAt: new Date() }).where(eq(m365ConnectorConfigsTable.tenantId, tenantId));
    const token = await getGraphAccessToken();
    if (!token.accessToken) throw new Error(token.error ?? "TOKEN_ERROR");

    const client = new M365GraphReadOnlyClient(token.accessToken);
    await client.validateConnection();
    const users = await client.listUsers();
    const skus = await client.listSubscribedSkus();
    const assigned = await client.listAssignedLicenses();
    const activity = await client.listUserSignInActivity();
    const mailbox = await client.listMailboxSignals();
    const usage = await client.listServiceUsageSignals();

    const records = this.normalizer.normalize({ users, assignedLicences: assigned, skuData: skus, activitySignals: activity, mailboxSignals: mailbox, serviceUsageSignals: usage });
    for (const r of records) {
      await db.insert(m365EvidenceRecordsTable).values({ tenantId, sourceSystem: r.sourceSystem, sourceRecordId: r.userId, userId: r.userId, displayName: r.displayName, department: r.department, costCentre: r.costCentre, assignedLicences: r.assignedLicences, monthlyLicenceCost: String(r.monthlyLicenceCost), lastSignInAt: r.lastSignInAt ? new Date(r.lastSignInAt) : null, lastActivityAt: r.lastActivityAt ? new Date(r.lastActivityAt) : null, accountStatus: r.accountStatus, mailboxType: r.mailboxType, copilotActivity: r.copilotActivity, addOnUsage: r.addOnUsage, desktopAppUsage: r.desktopAppUsage, isAdmin: r.isAdmin, isServiceAccount: r.isServiceAccount, evidenceCompleteness: String(r.evidenceCompleteness), evidenceFreshness: String(r.evidenceFreshness), rawEvidence: r as any });
    }

    const reconciliationFindings = await this.reconciliationService.reconcileM365Evidence(tenantId, records as any[]);
    const trustEval = this.trustService.evaluateM365EvidenceTrust(tenantId, records as any[], reconciliationFindings);
    const trustSnapshot = await this.trustService.createTrustSnapshot(trustEval);

    const completedAt = new Date().toISOString();
    await db.update(m365ConnectorConfigsTable).set({ status: "READY", lastSyncCompletedAt: new Date(), lastError: null }).where(eq(m365ConnectorConfigsTable.tenantId, tenantId));
    return { usersSeen: users.length, usersWithLicences: assigned.length, skusSeen: skus.length, evidenceRecordsCreated: records.length, incompleteEvidenceCount: records.filter((x) => x.evidenceCompleteness < 1).length, syncStatus: "READY", warnings: [], startedAt, completedAt, trustScore: Number(trustSnapshot.trustScore), trustBand: trustSnapshot.trustBand, criticalFindingsCount: (trustSnapshot.criticalFindings as any[]).length, warningFindingsCount: (trustSnapshot.warningFindings as any[]).length, reconciliationFindingsCount: reconciliationFindings.length, connectorTrustSnapshotId: trustSnapshot.id };
  }

  async getSyncStatus(tenantId: string) { const [cfg] = await db.select().from(m365ConnectorConfigsTable).where(eq(m365ConnectorConfigsTable.tenantId, tenantId)).limit(1); return cfg; }
  async listLatestEvidence(tenantId: string) { return db.select().from(m365EvidenceRecordsTable).where(eq(m365EvidenceRecordsTable.tenantId, tenantId)).orderBy(desc(m365EvidenceRecordsTable.updatedAt)).limit(100); }
}
