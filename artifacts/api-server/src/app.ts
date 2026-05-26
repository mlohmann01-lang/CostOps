import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { authMiddleware } from "./middleware/auth-middleware.js";
import { rateLimitMiddleware, DEFAULT_API_LIMIT } from "./middleware/rate-limit.js";
import { getRuntimeEnv, parseAllowedOrigins } from "./lib/config/env.js";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
const runtimeEnv = getRuntimeEnv();
const corsOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS, runtimeEnv).origins;
app.use(
  cors({
    origin: corsOrigins.length === 0 || corsOrigins.includes("*") ? true : corsOrigins,
    credentials: true,
  }),
);
app.use(rateLimitMiddleware(DEFAULT_API_LIMIT));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// JWT auth middleware — runs before all routes, populates req.__authContext
app.use(authMiddleware());

app.use("/api", router);

// Global error handler — must be last middleware (4-param signature)
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const status =
    err instanceof Error &&
    "statusCode" in err &&
    typeof (err as { statusCode?: unknown }).statusCode === "number"
      ? ((err as { statusCode: number }).statusCode)
      : 500;
  const message = err instanceof Error ? err.message : "INTERNAL_ERROR";
  const requestId = (req as { id?: string }).id;

  logger.error({ err, requestId, method: req.method, url: req.url }, "Unhandled error");

  const detail =
    process.env.NODE_ENV !== "production" && err instanceof Error
      ? err.stack
      : undefined;

  res.status(status).json({
    error: message,
    requestId,
    ...(detail ? { detail } : {}),
  });
});

export default app;
