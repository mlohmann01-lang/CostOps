import { Router } from "express";
import { economicGraphService } from "../lib/economic-knowledge-graph/economic-graph-service";
import { runEconomicGraphFoundationAudit } from "../lib/economic-knowledge-graph/economic-graph-audit";
import type { NeighborDirection } from "../lib/economic-knowledge-graph/economic-knowledge-graph-types";

const r = Router();

r.get("/nodes", async (req, res) => {
  try {
    const tenantId = String(req.query.tenantId ?? (req as any).tenantId ?? "default");
    const filters: Record<string, string> = {};
    if (req.query.type) filters.type = String(req.query.type);
    if (req.query.source) filters.source = String(req.query.source);
    if (req.query.sourceEntityId) filters.sourceEntityId = String(req.query.sourceEntityId);
    const nodes = await economicGraphService.listNodes(tenantId, Object.keys(filters).length ? (filters as any) : undefined);
    res.json({ tenantId, count: nodes.length, nodes });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "GRAPH_ERROR" });
  }
});

r.get("/edges", async (req, res) => {
  try {
    const tenantId = String(req.query.tenantId ?? (req as any).tenantId ?? "default");
    const filters: Record<string, string> = {};
    if (req.query.type) filters.type = String(req.query.type);
    if (req.query.fromNodeId) filters.fromNodeId = String(req.query.fromNodeId);
    if (req.query.toNodeId) filters.toNodeId = String(req.query.toNodeId);
    if (req.query.source) filters.source = String(req.query.source);
    const edges = await economicGraphService.listEdges(tenantId, Object.keys(filters).length ? (filters as any) : undefined);
    res.json({ tenantId, count: edges.length, edges });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "GRAPH_ERROR" });
  }
});

r.get("/nodes/:id", async (req, res) => {
  try {
    const tenantId = String(req.query.tenantId ?? (req as any).tenantId ?? "default");
    const node = await economicGraphService.getNode(tenantId, req.params.id);
    if (!node) { res.status(404).json({ error: "NODE_NOT_FOUND" }); return; }
    res.json(node);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "GRAPH_ERROR" });
  }
});

r.get("/nodes/:id/neighbors", async (req, res) => {
  try {
    const tenantId = String(req.query.tenantId ?? (req as any).tenantId ?? "default");
    const direction = (String(req.query.direction ?? "BOTH")) as NeighborDirection;
    if (!["OUTBOUND", "INBOUND", "BOTH"].includes(direction)) { res.status(400).json({ error: "INVALID_DIRECTION" }); return; }
    const result = await economicGraphService.findNeighbors(tenantId, req.params.id, direction);
    res.json({ nodeId: req.params.id, direction, tenantId, ...result });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "GRAPH_ERROR" });
  }
});

r.get("/path", async (req, res) => {
  try {
    const tenantId = String(req.query.tenantId ?? (req as any).tenantId ?? "default");
    const from = String(req.query.from ?? "");
    const to = String(req.query.to ?? "");
    const maxDepth = Math.min(10, Math.max(1, Number(req.query.maxDepth ?? 5)));
    if (!from || !to) { res.status(400).json({ error: "MISSING_FROM_OR_TO" }); return; }
    const path = await economicGraphService.findPath(tenantId, from, to, maxDepth);
    res.json({ tenantId, from, to, maxDepth, pathLength: path.length, path });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "GRAPH_ERROR" });
  }
});

r.get("/audit", async (_req, res) => {
  try {
    const audit = await runEconomicGraphFoundationAudit();
    res.json(audit);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "AUDIT_ERROR" });
  }
});

export default r;
