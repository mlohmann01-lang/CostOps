import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import connectorsRouter from "./connectors";
import recommendationsRouter from "./recommendations";
import executionRouter from "./execution";
import outcomesRouter from "./outcomes";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/dashboard", dashboardRouter);
router.use("/connectors", connectorsRouter);
router.use("/recommendations", recommendationsRouter);
router.use("/execution", executionRouter);
router.use("/outcomes", outcomesRouter);

export default router;
