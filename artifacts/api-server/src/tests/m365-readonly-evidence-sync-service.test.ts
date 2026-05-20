import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { M365ReadOnlyEvidenceSyncService } from "../lib/connectors/m365/m365-readonly-evidence-sync-service";

test("graph readonly client exposes required read-only methods and no mutation", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "src/lib/connectors/m365/m365-graph-read-only-client.ts"), "utf8");
  for (const method of ["listUsers()", "listSubscribedSkus()", "listGroups()", "listDirectoryRoles()", "getUserSignInActivity()"]) {
    assert.equal(src.includes(method), true);
  }
  for (const forbidden of ["assignLicense", "removeLicense", "method: \"POST\"", "method: \"PATCH\"", "method: \"DELETE\""]) {
    assert.equal(src.includes(forbidden), false);
  }
});

test("sync service classifies disabled/inactive/excluded and freshness", async () => {
  process.env.M365_TENANT_ID = "tenant";
  process.env.M365_CLIENT_ID = "client";
  process.env.M365_CLIENT_SECRET = "secret";
  process.env.M365_GRAPH_GRANTED_PERMISSIONS = "User.Read.All Directory.Read.All Organization.Read.All AuditLog.Read.All";
  process.env.ECON_OPS_TENANT_MODE = "PILOT_READ_ONLY";

  const calls: string[] = [];
  (globalThis as any).fetch = async (url: string) => {
    calls.push(url);
    if (url.includes("oauth2")) return new Response(JSON.stringify({ access_token: "tok" }), { status: 200 });
    if (url.includes("/users?") && url.includes("$top=100") && !url.includes("next=2")) {
      return new Response(JSON.stringify({ value: [{ id: "1", userPrincipalName: "admin@contoso.com", displayName: "Admin", accountEnabled: false, assignedLicenses: [{ skuId: "S1" }], signInActivity: { lastSignInDateTime: new Date(Date.now() - 50*86400000).toISOString() } }], "@odata.nextLink": "https://graph.microsoft.com/v1.0/users?next=2" }), { status: 200 });
    }
    if (url.includes("next=2")) {
      return new Response(JSON.stringify({ value: [{ id: "2", userPrincipalName: "service@contoso.com", displayName: "Svc", accountEnabled: true, assignedLicenses: [{ skuId: "S1" }], signInActivity: {} }] }), { status: 200 });
    }
    if (url.includes("/subscribedSkus")) return new Response(JSON.stringify({ value: [{ skuId: "S1", skuPartNumber: "M365_E3", consumedUnits: 10, prepaidUnits: { enabled: 20 }, servicePlans: [] }] }), { status: 200 });
    if (url.includes("/groups")) return new Response(JSON.stringify({ value: [{ id: "g1", displayName: "Admins" }] }), { status: 200 });
    if (url.includes("/directoryRoles")) return new Response(JSON.stringify({ value: [{ id: "r1", displayName: "Global Administrator" }] }), { status: 200 });
    if (url.includes("/organization")) return new Response(JSON.stringify({ value: [{ id: "o1" }] }), { status: 200 });
    return new Response(JSON.stringify({ value: [] }), { status: 200 });
  };

  const svc = new M365ReadOnlyEvidenceSyncService();
  const out = await svc.runSync("t1");
  assert.equal(out.summary.usersScanned, 2);
  assert.equal(out.summary.licensedUsersFound, 2);
  assert.equal(out.summary.disabledLicensedUsersFound, 1);
  assert.equal(out.summary.inactiveLicensedUsersFound, 1);
  assert.equal(out.summary.excludedUsers, 2);
  assert.equal(["FRESH","STALE","MISSING","PARTIAL"].includes(out.summary.evidenceFreshness), true);
  assert.equal(calls.some((c) => c.includes("next=2")), true);
});
