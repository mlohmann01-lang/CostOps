import test from "node:test";
import assert from "node:assert/strict";
import { oracleRecommendation } from "../lib/oracle-java-governance-pack/oracle-java-recommendation-engine";
test("maps recommendation",()=>{assert.equal(typeof oracleRecommendation("JAVA_EMPLOYEE_METRIC_EXPOSURE_REVIEW"),"string");});
