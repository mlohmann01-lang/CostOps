import { Router } from "express";
import { getOnboardingStatus, updateOnboardingStep } from "../lib/onboarding/onboarding-state";
import { onboardingService } from "../lib/onboarding/onboarding-service";
import type { TenantPilotMode } from "../lib/onboarding/onboarding-types";
import {
  evaluateTenantOnboardingAuthority,
  getTenantNextActions,
  evaluateFirstOutcomeReadiness,
  getTenantOnboardingAuthoritySummary,
  getLiveTenantOnboardingAuthorityStatus,
} from "../lib/onboarding/live-tenant-onboarding-authority";

const router = Router();
function tenant(req: any) { return String(req.tenantId ?? req.query.tenantId ?? req.body?.tenantId ?? "default"); }

router.get("/status", async (req, res) => res.json(await getOnboardingStatus((req.query.tenantId as string) ?? "default")));
router.post("/step", async (req, res) => res.json(await updateOnboardingStep(req.body?.tenantId ?? "default", req.body?.step ?? "TENANT_SETUP", req.body?.patch ?? {})));

router.get("/m365", async (req, res) => res.json(await onboardingService.getOnboarding(tenant(req), "M365")));
router.post("/m365/start", async (req, res) => res.json(await onboardingService.getOrCreateOnboarding(tenant(req), "M365")));
router.post("/m365/readiness-check", async (req, res) => res.json(await onboardingService.runReadinessCheck(tenant(req))));
router.post("/m365/discovery", async (req, res) => res.json(await onboardingService.runDiscovery(tenant(req))));
router.post("/m365/trust-assessment", async (req, res) => res.json(await onboardingService.runTrustAssessment(tenant(req))));
router.post("/m365/opportunity-assessment", async (req, res) => res.json(await onboardingService.runOpportunityAssessment(tenant(req))));
router.post("/m365/pilot-mode", async (req, res) => res.json(await onboardingService.setPilotMode(tenant(req), String(req.body?.mode ?? "READ_ONLY") as TenantPilotMode)));
router.get("/m365/go-live-checklist", async (req, res) => res.json(await onboardingService.getGoLiveChecklist(tenant(req))));
router.get("/m365/summary", async (req, res) => res.json(await onboardingService.getOnboardingSummary(tenant(req))));

// ─── Live Tenant Onboarding Authority Endpoints ───────────────────────────────

router.get("/authority", async (req, res) => {
  try {
    const result = await evaluateTenantOnboardingAuthority(tenant(req));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "evaluation failed" });
  }
});

router.get("/authority/status", (_req, res) => {
  res.json(getLiveTenantOnboardingAuthorityStatus());
});

router.get("/readiness", async (req, res) => {
  try {
    const result = await getTenantOnboardingAuthoritySummary(tenant(req));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "readiness check failed" });
  }
});

router.get("/next-actions", async (req, res) => {
  try {
    const result = await getTenantNextActions(tenant(req));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "next actions failed" });
  }
});

router.get("/first-outcome", async (req, res) => {
  try {
    const result = await evaluateFirstOutcomeReadiness(tenant(req));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "first outcome check failed" });
  }
});

router.post("/evaluate", async (req, res) => {
  try {
    const result = await evaluateTenantOnboardingAuthority(tenant(req));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "evaluation failed" });
  }
});

export default router;
