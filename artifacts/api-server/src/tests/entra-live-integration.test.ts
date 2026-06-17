import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EntraGraphClient, ProductionConnectorRunner } from "../lib/production-connectors";
describe("Entra live integration", () => {
  it("fetches users/managers/groups and syncs ownership graph", async () => {
    const fetchImpl: any = async (url: string) => { if (url.includes("manager")) return Response.json({ id: "m1" }); if (url.includes("groups")) return Response.json({ value: [{ id: "g1", displayName: "Group" }] }); return Response.json({ value: [{ id: "u1", userPrincipalName: "a@b.com", displayName: "A", department: "Finance" }] }); };
    const client = new EntraGraphClient({ graphClient: new (await import("../lib/microsoft-auth")).MicrosoftGraphHttpClient({ tokenProvider: async () => "token", fetchImpl }) });
    const raw = await client.fetchRecords({ tenantId: "t", connectorKey: "entra-id", credentialRef: "ref", tokenProvider: async () => "token", mode: "DRY_RUN" });
    assert.ok(raw.records.some((r) => r.kind === "managerRelation")); assert.ok(raw.records.some((r) => r.kind === "department"));
    const runner = new ProductionConnectorRunner();
    const dry = await runner.dryRun("t", "ENTRA_ID", { tokenProvider: async () => "token" }); assert.equal(dry.authorityWrites, 0);
    const sync = await runner.sync("t", "ENTRA_ID", { tokenProvider: async () => "token", authorised: true, liveTenantReady: true }); assert.equal(sync.status, "COMPLETED"); assert.ok(sync.authorityWrites > 0); assert.ok(sync.graphWrites > 0);
  });
});
