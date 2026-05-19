import test from "node:test";
import assert from "node:assert/strict";
import { oracle_processor_license_exposure } from "../lib/oracle-java-governance-pack/oracle-processor-license-exposure";
import { normalizeOracleJavaSignal } from "../lib/oracle-java-governance-pack/oracle-java-signal-normalizer";
test("oracle-processor-license-exposure.test.ts",()=>{const r=oracle_processor_license_exposure(normalizeOracleJavaSignal({})); assert.equal(r.reviewOnly,true);});
