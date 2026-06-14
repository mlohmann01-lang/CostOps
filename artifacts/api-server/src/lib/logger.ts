import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";
// In test runs we avoid the pino-pretty transport: it spawns a thread-stream
// worker whose path is resolved relative to the bundled test file, which is not
// emitted with the worker shim. Skipping the transport keeps logging in-process
// and avoids spurious "Cannot find module .../lib/worker.js" async-cleanup
// failures. Structured logging (the production path) is unchanged.
const isTest = process.env.NODE_ENV === "test";
const useStructuredOnly = isProduction || isTest;

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
  ...(useStructuredOnly
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});
