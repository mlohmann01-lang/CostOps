import test from "node:test";
import assert from "node:assert/strict";
import { normalizeOracleJavaSignal } from "../lib/oracle-java-governance-pack/oracle-java-signal-normalizer";
test("normalizes oracle signal",()=>{const out=normalizeOracleJavaSignal({}); assert.equal(out.partitioning,"unknown");});
