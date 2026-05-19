import test from "node:test";
import assert from "node:assert/strict";
import { oracle_dr_failover_governance } from "../lib/oracle-java-governance-pack/oracle-dr-failover-governance";
import { normalizeOracleJavaSignal } from "../lib/oracle-java-governance-pack/oracle-java-signal-normalizer";
test("oracle-dr-failover-governance.test.ts",()=>{const r=oracle_dr_failover_governance(normalizeOracleJavaSignal({})); assert.equal(r.reviewOnly,true);});
