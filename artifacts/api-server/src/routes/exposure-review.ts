// Program 11 — public, pre-login Exposure Review API surface.
//
// This router is intentionally mounted WITHOUT requireCapability(): the
// Exposure Review journey (control-plane /exposure-review/*) is a public,
// pre-login funnel — there is no platform login/session at this point, so
// there is no platform capability to check. Tenant binding is via an
// explicit tenantId (query/body), consistent with the public-website
// pattern used elsewhere (see exposureReviewJourney.ts header comment).
//
// READ-ONLY GUARANTEE: every handler here only calls into
// m365-exposure-review-service.ts, which never calls a Graph mutation
// endpoint and never triggers execution/approval/reclaim flows.

import { Router, type IRouter, type Request } from "express";
import {
  startExposureReviewConnect,
  handleExposureReviewCallback,
  getExposureReviewConnection,
  runExposureReviewDiscovery,
  getExposureReviewDiscoveryStatus,
  getExposureReviewReport,
  isExposureReviewM365Configured,
  classifyExposureReviewError,
} from "../lib/connectors/m365/m365-exposure-review-service";

const router: IRouter = Router();

function tenantFrom(req: Request): string {
  return String((req.query.tenantId as string | undefined) ?? (req.body as { tenantId?: string })?.tenantId ?? req.header("x-tenant-id") ?? "default");
}

router.get("/m365/configured", (_req, res) => {
  res.json({ configured: isExposureReviewM365Configured() });
});

router.post("/m365/connect/start", async (req, res) => {
  try {
    const tenantId = tenantFrom(req);
    const result = await startExposureReviewConnect({ tenantId, scopes: (req.body as { scopes?: string[] })?.scopes });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: classifyExposureReviewError(error) });
  }
});

router.get("/m365/connect/callback", async (req, res) => {
  try {
    const tenantId = tenantFrom(req);
    const result = await handleExposureReviewCallback({
      tenantId,
      code: req.query.code as string | undefined,
      state: String(req.query.state ?? ""),
      error: req.query.error as string | undefined,
    });
    if ("error" in result) {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: classifyExposureReviewError(error) });
  }
});

router.get("/m365/connect/status", async (req, res) => {
  const tenantId = tenantFrom(req);
  const connection = await getExposureReviewConnection(tenantId);
  res.json({ connection: connection ?? null });
});

router.post("/m365/discovery/run", async (req, res) => {
  try {
    const tenantId = tenantFrom(req);
    const run = await runExposureReviewDiscovery(tenantId);
    res.json({ run });
  } catch (error) {
    res.status(500).json({ error: classifyExposureReviewError(error) });
  }
});

router.get("/m365/discovery/status", async (req, res) => {
  const tenantId = tenantFrom(req);
  const run = await getExposureReviewDiscoveryStatus(tenantId);
  res.json({ run: run ?? null });
});

router.get("/m365/report", async (req, res) => {
  const tenantId = tenantFrom(req);
  const report = await getExposureReviewReport(tenantId);
  res.json(report);
});

export default router;
