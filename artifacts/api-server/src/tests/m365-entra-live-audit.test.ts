import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runM365EntraLiveIntegrationAudit } from "../lib/production-connectors";
describe("M365_ENTRA_LIVE_INTEGRATION_READY", () => { it("returns PASS", async () => { const audit = await runM365EntraLiveIntegrationAudit(); assert.equal(audit.status, "PASS", JSON.stringify(audit.checks.filter((c) => c.status !== "PASS"))); }); });
