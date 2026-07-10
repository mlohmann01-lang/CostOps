// Program 12 — Information Governance Authority API.
//
// Read-only reporting surface over the Information Governance Authority
// evaluation model. Mounted with requireTenantContext()/requireCapability()
// in routes/index.ts, following the same pattern as economic-control-chain
// and other internal authority routers.

import { Router, type IRouter } from "express";
import { getInformationGovernanceAuthority } from "../lib/information-governance/information-governance-authority";

const router: IRouter = Router();

router.get("/", (_req, res) => {
  res.json(getInformationGovernanceAuthority());
});

router.get("/readiness", (_req, res) => {
  res.json(getInformationGovernanceAuthority().readiness);
});

router.get("/findings", (_req, res) => {
  res.json({ findings: getInformationGovernanceAuthority().readiness.findings });
});

router.get("/recommendations", (_req, res) => {
  res.json({ recommendations: getInformationGovernanceAuthority().readiness.recommendations });
});

export default router;
