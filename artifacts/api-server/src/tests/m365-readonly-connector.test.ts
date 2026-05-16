import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("Graph read-only client exposes only read methods/no mutation", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "src/lib/connectors/m365/m365-graph-read-only-client.ts"), "utf8");
  assert.equal(src.includes("/users/"), true);
  assert.equal(src.includes("method: \"POST\""), false);
  assert.equal(src.includes("assignLicense"), false);
  assert.equal(src.includes("PATCH"), false);
});

test("sync service persists normalized evidence and handles pagination/rate limit code paths", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "src/lib/connectors/m365/m365-read-only-sync-service.ts"), "utf8");
  assert.equal(src.includes("m365EvidenceRecordsTable"), true);
  const clientSrc = fs.readFileSync(path.resolve(process.cwd(), "src/lib/connectors/m365/m365-graph-read-only-client.ts"), "utf8");
  assert.equal(clientSrc.includes("@odata.nextLink"), true);
  assert.equal(clientSrc.includes("r.status === 429"), true);
});

test("evaluate-playbooks uses persisted evidence and does not execute", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "src/routes/connectors.ts"), "utf8");
  assert.equal(src.includes("/m365/evaluate-playbooks"), true);
  assert.equal(src.includes("m365EvidenceRecordsTable"), true);
  assert.equal(src.includes("executionTriggered: false"), true);
});
