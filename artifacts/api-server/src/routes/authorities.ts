// Program 15 — Authority Enumeration API.
//
// Generic read-only surface over the authority registry
// (src/lib/headless-api-platform/authority-registry.ts), itself a thin
// directory over already-existing authorities. Mounted with
// requireTenantContext()/requireCapability() in routes/index.ts.
//
// TENANT_SCOPED authorities require req.tenantId, which — per the
// Program 14B-R tenant-spoofing remediation — is set exclusively by
// requireTenantContext() from the authenticated session, never from a
// client-supplied header/query/body value.

import { Router, type IRouter } from "express";
import { listAuthorities, getAuthorityEntry } from "../lib/headless-api-platform/authority-registry";

const router: IRouter = Router();

router.get("/", (_req, res) => {
  res.json({ authorities: listAuthorities() });
});

router.get("/:authorityId", async (req: any, res, next) => {
  try {
    const entry = getAuthorityEntry(req.params.authorityId);
    if (!entry) {
      res.status(404).json({ error: "AUTHORITY_NOT_FOUND" });
      return;
    }
    if (entry.kind === "TENANT_SCOPED") {
      const tenantId = req.tenantId;
      if (typeof tenantId !== "string" || tenantId.length === 0) {
        res.status(400).json({ error: "TENANT_CONTEXT_REQUIRED" });
        return;
      }
      res.json({ id: entry.id, name: entry.name, kind: entry.kind, result: await entry.resolve(tenantId) });
      return;
    }
    res.json({ id: entry.id, name: entry.name, kind: entry.kind, result: await entry.resolve() });
  } catch (e) {
    next(e);
  }
});

export default router;
