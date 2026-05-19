import test from "node:test";
import assert from "node:assert/strict";
import { samLicenseMetricGovernance } from "../lib/servicenow-sam-realism/sam-license-metric-governance";
test("sam-license-metric-governance",()=>{assert.equal(samLicenseMetricGovernance({}).governanceReview,true);});
