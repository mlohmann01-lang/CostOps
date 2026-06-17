import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MicrosoftGraphHttpClient, parseCsv } from "../lib/microsoft-auth";
describe("MicrosoftGraphHttpClient", () => {
  it("adds bearer token, paginates, retries throttling, and parses reports", async () => {
    const seen: string[] = []; let calls = 0;
    const client = new MicrosoftGraphHttpClient({ tokenProvider: async () => "secret-token", sleepMs: async () => {}, fetchImpl: async (url, init) => { calls++; seen.push(String((init?.headers as Headers).get("Authorization"))); if (calls === 1) return new Response("", { status: 429, headers: { "Retry-After": "0" } }); if (String(url).includes("page2")) return Response.json({ value: [{ id: "2" }] }); return Response.json({ value: [{ id: "1" }], "@odata.nextLink": "https://graph.microsoft.com/v1.0/page2" }); } });
    assert.deepEqual(await client.getAllPages("/users"), [{ id: "1" }, { id: "2" }]);
    assert.ok(seen.every((h) => h === "Bearer secret-token"));
    assert.deepEqual(parseCsv('User Principal Name,Active Days\na@b.com,10'), [{ "User Principal Name": "a@b.com", "Active Days": "10" }]);
  });
});
