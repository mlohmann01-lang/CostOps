import app from "./app.js";
import { logger } from "./lib/logger.js";
import { validateProductionConfig } from "./lib/config/production-config-validator.js";

// Fail fast on misconfiguration — never start with invalid config
const configResult = validateProductionConfig();
if (!configResult.valid) {
  logger.fatal({ errors: configResult.errors }, "Startup config validation failed — refusing to start");
  process.exit(1);
}
if (configResult.warnings.length > 0) {
  logger.warn({ warnings: configResult.warnings }, "Startup config warnings");
}

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

  logger.info({ port }, "Server listening");
});
