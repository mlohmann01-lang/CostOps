import app from "./app.js";
import { logger } from "./lib/logger.js";
import { validateProductionConfig } from "./lib/config/production-config-validator.js";
import { validateEnv } from "./lib/config/env.js";

const runtimeEnv = validateEnv();
runtimeEnv.warnings.forEach((warning) => logger.warn({ env: runtimeEnv.env, warning }, "Runtime bootstrap warning"));
if (runtimeEnv.errors.length > 0) {
  logger.fatal({ env: runtimeEnv.env, errors: runtimeEnv.errors }, "Runtime bootstrap failed");
  process.exit(1);
}

const configResult = validateProductionConfig();
if (!configResult.valid) {
  logger.fatal({ env: runtimeEnv.env, errors: configResult.errors }, "Startup config validation failed — refusing to start");
  process.exit(1);
}
configResult.warnings.forEach((warning) => logger.warn({ env: runtimeEnv.env, warning }, "Startup config warning"));

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port, env: runtimeEnv.env }, "Server listening");
});
