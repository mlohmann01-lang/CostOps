import test from "node:test";
import assert from "node:assert/strict";
import { oracle_core_factor_governance } from "../lib/oracle-java-governance-pack/oracle-core-factor-governance";
import { normalizeOracleJavaSignal } from "../lib/oracle-java-governance-pack/oracle-java-signal-normalizer";
test("oracle-core-factor-governance.test.ts",()=>{const r=oracle_core_factor_governance(normalizeOracleJavaSignal({})); assert.equal(r.reviewOnly,true);});
