import test from "node:test";
import assert from "node:assert/strict";
import { employeeMetricExposure } from "../lib/oracle-java-governance-pack/oracle-java-employee-metric-exposure";
import { normalizeOracleJavaSignal } from "../lib/oracle-java-governance-pack/oracle-java-signal-normalizer";
test("oracle-java-employee-metric-exposure.test.ts",()=>{const r=employeeMetricExposure(normalizeOracleJavaSignal({})); assert.equal(r.reviewOnly,true);});
