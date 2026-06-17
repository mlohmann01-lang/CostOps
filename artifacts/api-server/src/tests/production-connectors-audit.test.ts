import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readSourcePath } from "./test-harness-paths";
import { runProductionConnectorsAudit } from "../lib/production-connectors";
describe("production connectors audit", () => { it("returns PRODUCTION_CONNECTORS_READY PASS", async () => { const audit = await runProductionConnectorsAudit(); assert.equal(audit.key, "PRODUCTION_CONNECTORS_READY"); assert.equal(audit.status, "PASS", JSON.stringify(audit.checks.filter((c) => c.status !== "PASS"))); }); it("mounts production connector routes", () => { const routes = readSourcePath("routes", "index.ts"); assert.match(routes, /production-connectors/); }); });
