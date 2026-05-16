import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db, operationalEntitiesTable, operationalEntityEdgesTable, entityCorrelationSnapshotsTable } from "@workspace/db";
import { OperationalEntityGraphService } from "../lib/enterprise-graph/operational-entity-graph-service";

const router = Router();
const service = new OperationalEntityGraphService();

router.post("/rebuild", async (req, res)=>res.json(await service.rebuild((req.query.tenantId as string) ?? "default")));
router.get("/entities", async (req,res)=>res.json(await db.select().from(operationalEntitiesTable).where(eq(operationalEntitiesTable.tenantId,(req.query.tenantId as string) ?? "default"))));
router.get("/entities/:id", async (req,res)=>{ const rows = await db.select().from(operationalEntitiesTable).where(eq(operationalEntitiesTable.id, Number(req.params.id))).limit(1); res.json(rows[0] ?? null); });
router.get("/entities/:id/relationships", async (req,res)=>res.json(await db.select().from(operationalEntityEdgesTable).where(and(eq(operationalEntityEdgesTable.tenantId,(req.query.tenantId as string) ?? "default"),eq(operationalEntityEdgesTable.fromEntityId,req.params.id)))));
router.get("/entities/:id/correlations", async (req,res)=>res.json(await service.correlations((req.query.tenantId as string) ?? "default", req.params.id)));
router.get("/relationships", async (req,res)=>res.json(await db.select().from(operationalEntityEdgesTable).where(eq(operationalEntityEdgesTable.tenantId,(req.query.tenantId as string) ?? "default"))));
router.get("/orphaned", async (req,res)=>res.json((await service.integrity((req.query.tenantId as string) ?? "default")).orphanedEntities));
router.get("/duplicates", async (req,res)=>res.json((await service.integrity((req.query.tenantId as string) ?? "default")).duplicateCandidates));
router.get("/integrity", async (req,res)=>res.json(await service.integrity((req.query.tenantId as string) ?? "default")));

export default router;
