import test from "node:test";
import assert from "node:assert/strict";
import { samSoftwareModelGovernance } from "../lib/servicenow-sam-realism/sam-software-model-governance";
test("sam-software-model-governance",()=>{assert.equal(samSoftwareModelGovernance({}).governanceReview,true);});
