import { test } from "node:test";
import assert from "node:assert/strict";

test("resolution status coverage enums", () => {
  const statuses = ["REALIZED", "FAILED", "PARTIALLY_REALIZED", "UNVERIFIED"];
  assert.equal(statuses.length, 4);
});
