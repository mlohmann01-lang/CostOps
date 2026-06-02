import { Router } from "express";
import { getOnboardingStatus, updateOnboardingStep } from "../lib/onboarding/onboarding-state";
import { onboardingService } from "../lib/onboarding/onboarding-service";
import type { TenantPilotMode } from "../lib/onboarding/onboarding-types";

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

export default router;
