import { Router } from "express";
import { getOnboardingStatus, updateOnboardingStep } from "../lib/onboarding/onboarding-state";

const router = Router();
router.get("/status", async (req, res) => res.json(await getOnboardingStatus((req.query.tenantId as string) ?? "default")));
router.post("/step", async (req, res) => res.json(await updateOnboardingStep(req.body?.tenantId ?? "default", req.body?.step ?? "TENANT_SETUP", req.body?.patch ?? {})));
export default router;
