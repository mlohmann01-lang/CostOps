import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { M365GraphClient, ProductionConnectorRunner } from "../lib/production-connectors";
describe("M365 live integration", () => {
  it("fetches, normalises, dry-runs, syncs authority/graph/evidence/readiness", async () => {
    let calls = 0; const fetchImpl: any = async (url: string) => { calls++; if (url.includes("subscribedSkus")) return Response.json({ value: [{ skuId: "sku1", skuPartNumber: "E5", prepaidUnits: { enabled: 10 }, consumedUnits: 3 }] }); if (url.includes("reports")) return new Response("User Principal Name,Product,Active Days\na@b.com,M365,12"); if (url.includes("groups")) return Response.json({ value: [{ id: "g1", displayName: "Group" }] }); return Response.json({ value: [{ id: "u1", userPrincipalName: "a@b.com", displayName: "A", department: "Finance" }] }); };
    const client = new M365GraphClient({ graphClient: new (await import("../lib/microsoft-auth")).MicrosoftGraphHttpClient({ tokenProvider: async () => "token", fetchImpl }) });
    const raw = await client.fetchRecords({ tenantId: "t", connectorKey: "m365", credentialRef: "ref", tokenProvider: async () => "token", mode: "DRY_RUN" });
    assert.equal(raw.status, "READY"); assert.ok(raw.records.some((r) => r.kind === "sku")); assert.ok(calls > 0);
    const runner = new ProductionConnectorRunner();
    const dry = await runner.dryRun("t", "M365", { tokenProvider: async () => "token" }); assert.equal(dry.authorityWrites, 0);
    const sync = await runner.sync("t", "M365", { tokenProvider: async () => "token", authorised: true, liveTenantReady: true }); assert.equal(sync.status, "COMPLETED"); assert.ok(sync.authorityWrites > 0); assert.ok(sync.graphWrites > 0); assert.ok(sync.evidenceRefs.length > 0);
  });
});
