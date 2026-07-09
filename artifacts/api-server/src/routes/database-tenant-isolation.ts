// Program 14A — Database Tenant Isolation Verification Authority API.
//
// Read-only reporting surface over the Database Tenant Isolation
// Verification Authority evaluation model. Mounted with
// requireTenantContext()/requireCapability() in routes/index.ts, following
// the same pattern as tenant-isolation and other internal authority
// routers. The response contains only file paths, code-pattern
// descriptions and verdicts — no secrets, connection strings, raw tokens
// or customer data are ever included.

import { Router, type IRouter } from "express";
import { getDatabaseTenantIsolationAuthority } from "../lib/database-tenant-isolation/database-tenant-isolation-verification-authority";

const router: IRouter = Router();

router.get("/", (_req, res) => {
  res.json(getDatabaseTenantIsolationAuthority());
});

router.get("/readiness", (_req, res) => {
  const authority = getDatabaseTenantIsolationAuthority();
  res.json({
    platformVerdict: authority.platformVerdict,
    confidence: authority.confidence,
    summary: authority.summary,
  });
});

router.get("/findings", (_req, res) => {
  const authority = getDatabaseTenantIsolationAuthority();
  res.json({ findings: authority.domainResults.flatMap((d) => d.findings) });
});

router.get("/evidence", (_req, res) => {
  const authority = getDatabaseTenantIsolationAuthority();
  res.json({ evidence: authority.domainResults.flatMap((d) => d.evidence) });
});

export default router;
