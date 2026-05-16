import test from "node:test";
import assert from "node:assert/strict";
import { maskSecret } from "../lib/security/secret-masking";

test("secrets are masked", ()=>{
  assert.equal(maskSecret("abcd1234efgh5678").endsWith("5678"), true);
  assert.equal(maskSecret("abcd1234efgh5678").includes("abcd"), false);
});
