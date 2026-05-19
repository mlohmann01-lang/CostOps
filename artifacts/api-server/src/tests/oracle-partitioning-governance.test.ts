import test from "node:test";
import assert from "node:assert/strict";
import { oracle_partitioning_governance } from "../lib/oracle-java-governance-pack/oracle-partitioning-governance";
import { normalizeOracleJavaSignal } from "../lib/oracle-java-governance-pack/oracle-java-signal-normalizer";
test("oracle-partitioning-governance.test.ts",()=>{const r=oracle_partitioning_governance(normalizeOracleJavaSignal({})); assert.equal(r.reviewOnly,true);});
