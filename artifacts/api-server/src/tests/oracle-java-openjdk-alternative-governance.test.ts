import test from "node:test";
import assert from "node:assert/strict";
import { oracle_java_openjdk_alternative_governance } from "../lib/oracle-java-governance-pack/oracle-java-openjdk-alternative-governance";
import { normalizeOracleJavaSignal } from "../lib/oracle-java-governance-pack/oracle-java-signal-normalizer";
test("oracle-java-openjdk-alternative-governance.test.ts",()=>{const r=oracle_java_openjdk_alternative_governance(normalizeOracleJavaSignal({})); assert.equal(r.reviewOnly,true);});
