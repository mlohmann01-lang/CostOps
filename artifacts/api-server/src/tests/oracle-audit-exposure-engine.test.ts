import test from "node:test";
import assert from "node:assert/strict";
import { oracle_audit_exposure_engine } from "../lib/oracle-java-governance-pack/oracle-audit-exposure-engine";
import { normalizeOracleJavaSignal } from "../lib/oracle-java-governance-pack/oracle-java-signal-normalizer";
test("oracle-audit-exposure-engine.test.ts",()=>{const r=oracle_audit_exposure_engine(normalizeOracleJavaSignal({})); assert.equal(r.reviewOnly,true);});
