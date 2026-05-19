import test from "node:test";
import assert from "node:assert/strict";
import { oracle_ula_governance } from "../lib/oracle-java-governance-pack/oracle-ula-governance";
import { normalizeOracleJavaSignal } from "../lib/oracle-java-governance-pack/oracle-java-signal-normalizer";
test("oracle-ula-governance.test.ts",()=>{const r=oracle_ula_governance(normalizeOracleJavaSignal({})); assert.equal(r.reviewOnly,true);});
