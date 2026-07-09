// Program 13 — Tenant Isolation Verification Authority API.
//
// Read-only reporting surface over the Tenant Isolation Verification
// Authority evaluation model. Mounted with requireTenantContext()/
// requireCapability() in routes/index.ts, following the same pattern as
// information-governance and other internal authority routers.

import { Router, type IRouter } from "express";
import { getTenantIsolationAuthority } from "../lib/tenant-isolation/tenant-isolation-authority";

const router: IRouter = Router();

router.get("/", (_req, res) => {
  res.json(getTenantIsolationAuthority());
});

router.get("/readiness", (_req, res) => {
  res.json(getTenantIsolationAuthority().readiness);
});

router.get("/findings", (_req, res) => {
  res.json({ findings: getTenantIsolationAuthority().readiness.findings });
});

router.get("/evidence", (_req, res) => {
  const authority = getTenantIsolationAuthority();
  res.json({ evidence: authority.checks.flatMap((check) => check.evidence) });
});

export default router;
