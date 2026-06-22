// Program 14B — Security Hardening Authority API.
//
// Read-only reporting surface over the Security Hardening Authority
// evaluation model. Mounted with requireTenantContext()/requireCapability()
// in routes/index.ts, following the same pattern as the database-tenant-
// isolation and tenant-isolation authority routers. The response contains
// only file paths, code-pattern descriptions and verdicts — no secrets,
// connection strings, raw tokens or customer data are ever included.

import { Router, type IRouter } from "express";
import { getSecurityHardeningAuthority } from "../lib/security-hardening/security-hardening-verification-authority";

const router: IRouter = Router();

router.get("/", (_req, res) => {
  res.json(getSecurityHardeningAuthority());
});

router.get("/readiness", (_req, res) => {
  const authority = getSecurityHardeningAuthority();
  res.json({
    platformVerdict: authority.platformVerdict,
    confidence: authority.confidence,
  });
});

router.get("/findings", (_req, res) => {
  const authority = getSecurityHardeningAuthority();
  res.json({ findings: authority.domains.flatMap((d) => d.findings) });
});

router.get("/evidence", (_req, res) => {
  const authority = getSecurityHardeningAuthority();
  res.json({ evidence: authority.domains.flatMap((d) => d.evidence) });
});

export default router;
