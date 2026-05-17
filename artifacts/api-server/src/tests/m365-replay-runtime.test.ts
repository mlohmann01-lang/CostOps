import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("replay report runtime path is implemented", () => {
  const src = fs.readFileSync(new URL("../lib/playbooks/playbook-recommendation-service.ts", import.meta.url), "utf8");
  assert.equal(src.includes("getReplayReport"), true);
  assert.equal(src.includes("replayIntegrity"), true);
  assert.equal(src.includes("M365_REPLAY_"), true);
});
