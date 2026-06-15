import { Router, type IRouter } from "express";
import {
  buildPilotWorkspaceSummary,
  runPilotWorkspaceAudit,
} from "../lib/pilot-workspace-summary";
const router: IRouter = Router();
const tenant = (req: any) =>
  String(
    req.tenantId ??
      req.header?.("x-tenant-id") ??
      req.query?.tenantId ??
      "default",
  );
const mode = (req: any) =>
  String(
    req.query?.mode ??
      req.header?.("x-workspace-mode") ??
      process.env.CERTEN_WORKSPACE_MODE ??
      "LIVE",
  ).toUpperCase() === "DEMO"
    ? "DEMO"
    : "LIVE";
router.get("/pilot-summary", async (req, res) =>
  res.json(await buildPilotWorkspaceSummary(tenant(req), mode(req))),
);
router.get("/pilot-summary/audit", async (_req, res) =>
  res.json(await runPilotWorkspaceAudit()),
);
export default router;
