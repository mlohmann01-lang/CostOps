import { Router } from "express";
import { economicOutcomeAttributionService } from "../lib/economic-outcomes/economic-outcome-attribution";
const router = Router();
const tenantIdFrom = (req: any) =>
  String(req.tenantId ?? req.query.tenantId ?? "default");
router.get("/", (req, res) =>
  res.json({
    tenantId: tenantIdFrom(req),
    outcomes: economicOutcomeAttributionService.listEconomicOutcomes(
      tenantIdFrom(req),
      req.query as any,
    ),
  }),
);
router.post("/", (req, res) =>
  res
    .status(201)
    .json(
      economicOutcomeAttributionService.createEconomicOutcome({
        ...req.body,
        tenantId: tenantIdFrom(req),
      }),
    ),
);
router.get("/objectives", (req, res) =>
  res.json({
    tenantId: tenantIdFrom(req),
    objectives: economicOutcomeAttributionService.listBusinessObjectives(
      tenantIdFrom(req),
    ),
  }),
);
router.post("/objectives", (req, res) =>
  res
    .status(201)
    .json(
      economicOutcomeAttributionService.createBusinessObjective({
        ...req.body,
        tenantId: tenantIdFrom(req),
      }),
    ),
);
router.get("/value-signals", (req, res) =>
  res.json({
    tenantId: tenantIdFrom(req),
    valueSignals: economicOutcomeAttributionService.listValueSignals(
      tenantIdFrom(req),
      req.query.assetId as string | undefined,
    ),
  }),
);
router.post("/value-signals", (req, res) =>
  res
    .status(201)
    .json(
      economicOutcomeAttributionService.createValueSignal({
        ...req.body,
        tenantId: tenantIdFrom(req),
      }),
    ),
);
router.post("/attributions", (req, res) =>
  res
    .status(201)
    .json(
      economicOutcomeAttributionService.attributeOutcomeToAsset({
        ...req.body,
        tenantId: tenantIdFrom(req),
      }),
    ),
);
router.get("/assets/:assetId/summary", (req, res) =>
  res.json(
    economicOutcomeAttributionService.getAssetOutcomeSummary(
      tenantIdFrom(req),
      req.params.assetId,
    ),
  ),
);
router.post("/assets/:assetId/decision", (req, res) =>
  res
    .status(201)
    .json(
      economicOutcomeAttributionService.generateEconomicDecision(
        tenantIdFrom(req),
        req.params.assetId,
      ),
    ),
);
router.get("/dashboard", (req, res) =>
  res.json(
    economicOutcomeAttributionService.getEconomicOutcomesDashboard(
      tenantIdFrom(req),
    ),
  ),
);
export default router;
