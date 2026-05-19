import test from "node:test";
import assert from "node:assert/strict";
import { servicenowSamRealismReport } from "../lib/servicenow-sam-realism/servicenow-sam-realism-report";
test("sam report",()=>{assert.equal(servicenowSamRealismReport({}).governanceReview,true);});
