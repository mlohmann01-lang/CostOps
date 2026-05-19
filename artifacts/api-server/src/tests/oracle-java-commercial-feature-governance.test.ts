import test from "node:test";
import assert from "node:assert/strict";
import { oracle_java_commercial_feature_governance } from "../lib/oracle-java-governance-pack/oracle-java-commercial-feature-governance";
import { normalizeOracleJavaSignal } from "../lib/oracle-java-governance-pack/oracle-java-signal-normalizer";
test("oracle-java-commercial-feature-governance.test.ts",()=>{const r=oracle_java_commercial_feature_governance(normalizeOracleJavaSignal({})); assert.equal(r.reviewOnly,true);});
