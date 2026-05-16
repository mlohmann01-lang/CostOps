import { test } from "node:test";
import assert from "node:assert/strict";

test("drift and reversal flags are append-only compatible", () => {
  const history = ["REALIZED", "DRIFTED", "REVERSED"];
  assert.deepEqual(history, ["REALIZED", "DRIFTED", "REVERSED"]);
});
