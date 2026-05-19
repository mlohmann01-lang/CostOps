import test from "node:test";
import assert from "node:assert/strict";
import { oracle_database_option_governance } from "../lib/oracle-java-governance-pack/oracle-database-option-governance";
import { normalizeOracleJavaSignal } from "../lib/oracle-java-governance-pack/oracle-java-signal-normalizer";
test("oracle-database-option-governance.test.ts",()=>{const r=oracle_database_option_governance(normalizeOracleJavaSignal({})); assert.equal(r.reviewOnly,true);});
