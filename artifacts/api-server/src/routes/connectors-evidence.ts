import { Router } from "express";
import { db, connectorsTable, connectorTrustSnapshotsTable, connectorSyncStatusTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

interface EvidenceSource {
  id: string | number;
  name: string;
  iconType: string;
  trustScore: number;
  lastSyncAt: string | null;
  status: string;
}

// Hardcoded evidence sources for demo connectors
const DEMO_EVIDENCE_SOURCES: { [key: string]: EvidenceSource[] } = {
  m365: [
    {
      id: "m365-mailbox",
      name: "Exchange Online Mailbox",
      iconType: "envelope",
      trustScore: 0.92,
      lastSyncAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      status: "connected",
    },
    {
      id: "m365-teams",
      name: "Teams Activity",
      iconType: "team",
      trustScore: 0.88,
      lastSyncAt: new Date(Date.now() - 1 * 3600000).toISOString(),
      status: "connected",
    },
    {
      id: "m365-onedrive",
      name: "OneDrive for Business",
      iconType: "cloud",
      trustScore: 0.85,
      lastSyncAt: new Date(Date.now() - 3 * 3600000).toISOString(),
      status: "connected",
    },
  ],
  aws: [
    {
      id: "aws-ce",
      name: "Cost Explorer",
      iconType: "chart",
      trustScore: 0.95,
      lastSyncAt: new Date(Date.now() - 1 * 3600000).toISOString(),
      status: "connected",
    },
    {
      id: "aws-billing",
      name: "Billing API",
      iconType: "calculator",
      trustScore: 0.93,
      lastSyncAt: new Date(Date.now() - 30 * 60000).toISOString(),
      status: "connected",
    },
  ],
  azure: [
    {
      id: "azure-cost-mgmt",
      name: "Cost Management API",
      iconType: "chart",
      trustScore: 0.91,
      lastSyncAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      status: "connected",
    },
  ],
};

router.get("/:id/evidence-sources", async (req, res) => {
  try {
    const tenantId = (req.query.tenantId as string) ?? "default";
    const connectorId = req.params.id;

    // Try to fetch actual connector
    const connector = await db
      .select()
      .from(connectorsTable)
      .where(eq(connectorsTable.id, parseInt(connectorId)))
      .then((rows) => rows[0]);

    if (!connector) {
      return res.status(404).json({ error: "Connector not found" });
    }

    // Check for connector trust snapshots
    const trustSnapshots = await db
      .select()
      .from(connectorTrustSnapshotsTable)
      .where(eq(connectorTrustSnapshotsTable.connectorId, connectorId))
      .orderBy(desc(connectorTrustSnapshotsTable.createdAt))
      .limit(1);

    // Check for sync status
    const syncStatus = await db
      .select()
      .from(connectorSyncStatusTable)
      .where(eq(connectorSyncStatusTable.connector, connector.type))
      .orderBy(desc(connectorSyncStatusTable.createdAt))
      .limit(1)
      .then((rows) => rows[0]);

    // Use demo evidence sources if available, otherwise construct from data
    const connectorType = connector.type.toLowerCase();
    if (DEMO_EVIDENCE_SOURCES[connectorType]) {
      return res.json(DEMO_EVIDENCE_SOURCES[connectorType]);
    }

    // Fallback: construct from trust snapshot
    if (trustSnapshots.length > 0) {
      const snapshot = trustSnapshots[0];
      const sources: EvidenceSource[] = [
        {
          id: `${connectorId}-primary`,
          name: `${connector.name} Primary Source`,
          iconType: "source",
          trustScore: parseFloat(snapshot.trustScore) / 100,
          lastSyncAt: connector.lastSync ? connector.lastSync.toISOString() : null,
          status: connector.status,
        },
      ];
      return res.json(sources);
    }

    // Final fallback: generic sources
    const genericSources: EvidenceSource[] = [
      {
        id: `${connectorId}-default`,
        name: `${connector.name} Data Source`,
        iconType: "database",
        trustScore: connector.trustScore,
        lastSyncAt: connector.lastSync ? connector.lastSync.toISOString() : null,
        status: connector.status,
      },
    ];

    return res.json(genericSources);
  } catch (err) {
    req.log.error({ err }, "Error fetching connector evidence sources");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
