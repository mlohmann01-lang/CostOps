import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { connectorHealthSnapshotsTable, db, governanceActivityStreamTable, operationalEventsTable, operatorActivityEventsTable } from "@workspace/db";
import { operationalTelemetryService } from "../lib/observability/operational-telemetry-service";

const router = Router();
const tenant = (req: any) => String(req.query.tenantId ?? "default");

router.get("/events", async (req, res) => res.json(await db.select().from(operationalEventsTable).where(eq(operationalEventsTable.tenantId, tenant(req))).orderBy(desc(operationalEventsTable.createdAt)).limit(200)));
router.get("/connectors", async (req, res) => res.json(await db.select().from(connectorHealthSnapshotsTable).where(eq(connectorHealthSnapshotsTable.tenantId, tenant(req))).orderBy(desc(connectorHealthSnapshotsTable.createdAt)).limit(200)));
router.get("/governance", async (req, res) => res.json(await db.select().from(governanceActivityStreamTable).where(eq(governanceActivityStreamTable.tenantId, tenant(req))).orderBy(desc(governanceActivityStreamTable.createdAt)).limit(200)));
router.get("/operators", async (req, res) => res.json(await db.select().from(operatorActivityEventsTable).where(eq(operatorActivityEventsTable.tenantId, tenant(req))).orderBy(desc(operatorActivityEventsTable.createdAt)).limit(200)));
router.get("/slas", async (req, res) => res.json(await operationalTelemetryService.slas(tenant(req))));
router.get("/diagnostics", async (req, res) => res.json(await operationalTelemetryService.diagnostics(tenant(req))));
router.get("/failures", async (req, res) => res.json(await db.select().from(operationalEventsTable).where(and(eq(operationalEventsTable.tenantId, tenant(req)), eq(operationalEventsTable.eventStatus, "FAILED"))).orderBy(desc(operationalEventsTable.createdAt)).limit(200)));

export default router;
