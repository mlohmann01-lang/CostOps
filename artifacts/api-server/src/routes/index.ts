import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import connectorsRouter from "./connectors";
import recommendationsRouter from "./recommendations";
import executionRouter from "./execution";
import outcomesRouter from "./outcomes";
import driftRouter from "./drift";
import tenantPricingRouter from "./tenant-pricing";
import reconciliationRouter from "./reconciliation";
import jobsRouter from "./jobs";
import verificationRouter from "./verification";
import approvalsRouter from "./approvals";
import governanceRouter from "./governance";
import governanceExceptionsRouter from "./governance-exceptions";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/dashboard", dashboardRouter);
router.use("/connectors", connectorsRouter);
router.use("/recommendations", recommendationsRouter);
router.use("/execution", executionRouter);
router.use("/outcomes", outcomesRouter);
router.use("/drift", driftRouter);
router.use("/pricing/tenant", tenantPricingRouter);
router.use("/reconciliation", reconciliationRouter);
router.use("/jobs", jobsRouter);
router.use("/verification", verificationRouter);
router.use("/approvals", approvalsRouter);
router.use("/governance", governanceRouter);
router.use("/governance/exceptions", governanceExceptionsRouter);

export default router;
