import test from "node:test";
import assert from "node:assert/strict";
import { buildConnectorRegistry } from "../lib/connectors/registry";

test("connector registry includes m365 with required capabilities", () => {
  const registry = buildConnectorRegistry();
  const connector = registry.get("M365_GRAPH");
  assert.ok(connector);
  assert.deepEqual(connector?.capabilities.includes("AUTH"), true);
  assert.deepEqual(connector?.capabilities.includes("READ_USERS"), true);
  assert.deepEqual(connector?.capabilities.includes("EXECUTE_ACTIONS"), true);
});
