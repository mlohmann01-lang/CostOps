import { Router } from "express";
import { db } from "@workspace/db";
import { connectorsTable, connectorSyncStatusTable, m365UsersTable, type Connector } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { checkM365PermissionReadiness } from "../lib/connectors/m365/m365-permission-check";
import { fetchGraphUserActivity, fetchGraphUserLicences, fetchGraphUsersFirstPage, getGraphAccessToken } from "../lib/connectors/m365/m365-graph-client";
import { normalizeM365Users } from "../lib/connectors/m365-normalizer";
import { ingestM365Tenant } from "../lib/connectors/m365-ingestion";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const connectors = await db.select().from(connectorsTable).orderBy(connectorsTable.id);
    return res.json(
      connectors.map((c: Connector) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        status: c.status,
        lastSync: c.lastSync ? c.lastSync.toISOString() : null,
        recordCount: c.recordCount,
        trustScore: c.trustScore,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Error listing connectors");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/sync", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const [connector] = await db.select().from(connectorsTable).where(eq(connectorsTable.id, id));
    if (!connector) return res.status(404).json({ error: "Connector not found" });

    await db
      .update(connectorsTable)
      .set({ status: "syncing", lastSync: new Date() })
      .where(eq(connectorsTable.id, id));

    void setTimeout(async () => {
      await db
        .update(connectorsTable)
        .set({ status: "connected", recordCount: connector.recordCount + Math.floor(Math.random() * 10) })
        .where(eq(connectorsTable.id, id));
    }, 3000);

    const [updated] = await db.select().from(connectorsTable).where(eq(connectorsTable.id, id));
    return res.json({
      id: updated.id,
      name: updated.name,
      type: updated.type,
      status: updated.status,
      lastSync: updated.lastSync ? updated.lastSync.toISOString() : null,
      recordCount: updated.recordCount,
      trustScore: updated.trustScore,
    });
  } catch (err) {
    req.log.error({ err }, "Error syncing connector");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/m365/readiness", async (_req, res) => {
  const readiness = await checkM365PermissionReadiness();
  return res.json(readiness);
});


router.post("/m365/sync", async (req, res) => {
  try {
    const tenantId = (req.query.tenantId as string) ?? "default";
    const ingestion = await ingestM365Tenant(tenantId);

    await db.insert(connectorSyncStatusTable).values({
      tenantId,
      connector: ingestion.metadata.connector,
      lastSyncTime: new Date(ingestion.metadata.lastSyncTime),
      connectorHealth: ingestion.metadata.connectorHealth,
      dataFreshnessScore: ingestion.metadata.dataFreshnessScore,
      freshnessBand: ingestion.metadata.freshnessBand,
      partialData: String(ingestion.metadata.partialData),
      errorCode: ingestion.metadata.errorCode ?? null,
      errorMessage: ingestion.metadata.errorMessage ?? null,
      requestId: ingestion.metadata.requestId,
    });

    for (const user of ingestion.users) {
      await db.insert(m365UsersTable).values({
        tenantId,
        sourceObjectId: user.userPrincipalName,
        userPrincipalName: user.userPrincipalName,
        displayName: user.displayName ?? null,
        accountEnabled: String(user.accountEnabled),
        assignedLicenses: user.assignedLicenses,
        lastLoginDaysAgo: user.lastLoginDaysAgo,
        sourceTimestamp: new Date(user.sourceTimestamp),
        ingestionRunId: ingestion.ingestionRunId,
        connectorHealth: ingestion.metadata.connectorHealth,
        dataFreshnessScore: ingestion.metadata.dataFreshnessScore,
        freshnessBand: ingestion.metadata.freshnessBand,
        partialData: String(ingestion.metadata.partialData),
      }).onConflictDoUpdate({
        target: [m365UsersTable.tenantId, m365UsersTable.sourceObjectId],
        set: {
          userPrincipalName: user.userPrincipalName,
          displayName: user.displayName ?? null,
          accountEnabled: String(user.accountEnabled),
          assignedLicenses: user.assignedLicenses,
          lastLoginDaysAgo: user.lastLoginDaysAgo,
          sourceTimestamp: new Date(user.sourceTimestamp),
          ingestionRunId: ingestion.ingestionRunId,
          connectorHealth: ingestion.metadata.connectorHealth,
          dataFreshnessScore: ingestion.metadata.dataFreshnessScore,
          freshnessBand: ingestion.metadata.freshnessBand,
          partialData: String(ingestion.metadata.partialData),
          updatedAt: new Date(),
        },
      });
    }

    const latest = await db.select().from(m365UsersTable).where(eq(m365UsersTable.tenantId, tenantId)).orderBy(desc(m365UsersTable.updatedAt));
    return res.json({
      tenantId,
      ingestionRunId: ingestion.ingestionRunId,
      connectorHealth: ingestion.metadata.connectorHealth,
      usersSynced: ingestion.users.length,
      canonicalUsers: latest.length,
      warnings: ingestion.warnings,
    });
  } catch (err) {
    req.log.error({ err }, "Error syncing m365 canonical users");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/m365/smoke-test", async (_req, res) => {
  if ((process.env.M365_MODE ?? "MOCK_CONNECTOR") !== "LIVE_GRAPH") {
    return res.status(400).json({ status: "FAIL", errors: ["M365_MODE must be LIVE_GRAPH"], warnings: [] });
  }

  const readiness = await checkM365PermissionReadiness();
  if (readiness.status === "BLOCKED") {
    return res.status(200).json({
      status: "FAIL",
      readiness,
      connectorHealth: "FAILED",
      counts: { usersFetched: 0, licencesFetched: 0, activityFetched: 0, normalizedUsers: 0 },
      sample: [],
      warnings: readiness.warnings,
      errors: ["PERMISSION_BLOCKED"],
      requestIds: [],
    });
  }

  const warnings = [...readiness.warnings];
  const errors: string[] = [];
  const requestIds: string[] = [];
  let connectorHealth: "HEALTHY" | "DEGRADED" | "FAILED" = readiness.status === "DEGRADED" ? "DEGRADED" : "HEALTHY";

  const token = await getGraphAccessToken();
  if (!token.accessToken) {
    return res.status(200).json({
      status: "FAIL",
      readiness,
      connectorHealth: "FAILED",
      counts: { usersFetched: 0, licencesFetched: 0, activityFetched: 0, normalizedUsers: 0 },
      sample: [],
      warnings,
      errors: [token.error ?? "TOKEN_ERROR"],
      requestIds: token.requestId ? [token.requestId] : [],
    });
  }

  if (token.requestId) requestIds.push(token.requestId);

  try {
    const usersResult = await fetchGraphUsersFirstPage(token.accessToken);
    if (usersResult.requestId) requestIds.push(usersResult.requestId);
    const sampleUsers = usersResult.users.slice(0, 5);

    const licencesResult = await fetchGraphUserLicences(token.accessToken, sampleUsers);
    if (licencesResult.requestId) requestIds.push(licencesResult.requestId);

    let activityByUpn: Record<string, number | null> = {};
    let activityFetched = 0;
    try {
      const activityResult = await fetchGraphUserActivity(token.accessToken, sampleUsers);
      activityByUpn = activityResult.lastLoginDaysByUpn;
      activityFetched = Object.keys(activityByUpn).length;
      if (activityResult.requestId) requestIds.push(activityResult.requestId);
    } catch {
      connectorHealth = "DEGRADED";
      warnings.push("Activity fetch failed; partial data returned");
    }

    const merged = sampleUsers.map((u) => ({
      userPrincipalName: u.userPrincipalName,
      displayName: u.displayName,
      accountEnabled: Boolean(u.accountEnabled),
      assignedLicenses: licencesResult.licencesByUpn[u.userPrincipalName] ?? [],
      lastLoginDaysAgo: Object.prototype.hasOwnProperty.call(activityByUpn, u.userPrincipalName) ? activityByUpn[u.userPrincipalName] : null,
    }));

    const normalized = normalizeM365Users(process.env.M365_TENANT_ID ?? "unknown", merged, new Date().toISOString());
    const status = connectorHealth === "DEGRADED" ? "DEGRADED" : "PASS";
    const sample = normalized.slice(0, 3).map((u) => ({
      userPrincipalName: u.userPrincipalName.replace(/(^.).+(@.*$)/, "$1***$2"),
      accountEnabled: u.accountEnabled,
      assignedLicenceCount: u.assignedLicenses.length,
      lastLoginDaysAgo: u.lastLoginDaysAgo,
    }));

    return res.status(200).json({
      status,
      readiness,
      connectorHealth,
      counts: {
        usersFetched: usersResult.users.length,
        licencesFetched: Object.keys(licencesResult.licencesByUpn).length,
        activityFetched,
        normalizedUsers: normalized.length,
      },
      sample,
      warnings,
      errors,
      requestIds,
    });
  } catch (error) {
    return res.status(200).json({
      status: "FAIL",
      readiness,
      connectorHealth: "FAILED",
      counts: { usersFetched: 0, licencesFetched: 0, activityFetched: 0, normalizedUsers: 0 },
      sample: [],
      warnings,
      errors: [error instanceof Error ? error.message : "SMOKE_TEST_FAILED"],
      requestIds,
    });
  }
});

export default router;
