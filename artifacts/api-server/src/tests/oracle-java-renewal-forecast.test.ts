import test from "node:test";
import assert from "node:assert/strict";
import { forecastOracleJavaRenewal } from "../lib/economic-forecasting/oracle-java-renewal-forecast";
test("oracle-java-renewal-forecast",()=>{const r=forecastOracleJavaRenewal({base:100,entitlementEvidence:false,contractEvidence:false,assumptions:["a"]} as any); assert.ok(r);});
