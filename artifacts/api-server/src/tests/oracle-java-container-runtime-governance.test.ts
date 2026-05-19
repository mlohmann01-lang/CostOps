import test from "node:test";
import assert from "node:assert/strict";
import { oracle_java_container_runtime_governance } from "../lib/oracle-java-governance-pack/oracle-java-container-runtime-governance";
import { normalizeOracleJavaSignal } from "../lib/oracle-java-governance-pack/oracle-java-signal-normalizer";
test("oracle-java-container-runtime-governance.test.ts",()=>{const r=oracle_java_container_runtime_governance(normalizeOracleJavaSignal({})); assert.equal(r.reviewOnly,true);});
