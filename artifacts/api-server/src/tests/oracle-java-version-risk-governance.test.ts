import test from "node:test";
import assert from "node:assert/strict";
import { oracle_java_version_risk_governance } from "../lib/oracle-java-governance-pack/oracle-java-version-risk-governance";
import { normalizeOracleJavaSignal } from "../lib/oracle-java-governance-pack/oracle-java-signal-normalizer";
test("oracle-java-version-risk-governance.test.ts",()=>{const r=oracle_java_version_risk_governance(normalizeOracleJavaSignal({})); assert.equal(r.reviewOnly,true);});
