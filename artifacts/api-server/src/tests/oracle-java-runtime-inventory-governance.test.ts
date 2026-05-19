import test from "node:test";
import assert from "node:assert/strict";
import { runtimeInventoryGovernance } from "../lib/oracle-java-governance-pack/oracle-java-runtime-inventory-governance";
import { normalizeOracleJavaSignal } from "../lib/oracle-java-governance-pack/oracle-java-signal-normalizer";
test("oracle-java-runtime-inventory-governance.test.ts",()=>{const r=runtimeInventoryGovernance(normalizeOracleJavaSignal({})); assert.equal(r.reviewOnly,true);});
