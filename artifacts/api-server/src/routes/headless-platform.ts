// Program 15 — Headless API Platform Authority API.
//
// Read-only reporting surface over the Headless API Platform authority.
// Mounted with requireTenantContext()/requireCapability() in
// routes/index.ts, following the same pattern as database-tenant-isolation
// and security-hardening.

import { Router, type IRouter } from "express";
import { getHeadlessApiPlatformAuthority } from "../lib/headless-api-platform/headless-api-platform-authority";

const router: IRouter = Router();

router.get("/", (_req, res) => {
  res.json(getHeadlessApiPlatformAuthority());
});

router.get("/readiness", (_req, res) => {
  const authority = getHeadlessApiPlatformAuthority();
  res.json({
    overallReadiness: authority.overallReadiness,
    readiness: authority.readiness,
  });
});

router.get("/categories", (_req, res) => {
  const authority = getHeadlessApiPlatformAuthority();
  res.json({ categories: authority.categories });
});

router.get("/findings", (_req, res) => {
  const authority = getHeadlessApiPlatformAuthority();
  res.json({ findings: authority.findings, recommendations: authority.recommendations });
});

export default router;
