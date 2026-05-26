import test from "node:test";
import assert from "node:assert/strict";
import { shouldPreserveTrustedLifecycle } from "../lib/operational-graph/repository";

test("lifecycle downgrade protection", () => {
  assert.equal(shouldPreserveTrustedLifecycle("TRUSTED", "DISCOVERED"), true);
  assert.equal(shouldPreserveTrustedLifecycle("TRUSTED", "NORMALIZED"), true);
  assert.equal(shouldPreserveTrustedLifecycle("TRUSTED", "CONFLICTED"), false);
  assert.equal(shouldPreserveTrustedLifecycle("MATCHED", "DISCOVERED"), false);
});
