import test from "node:test";
import assert from "node:assert/strict";
import { samContractRightsGovernance } from "../lib/servicenow-sam-realism/sam-contract-rights-governance";
test("sam-contract-rights-governance",()=>{assert.equal(samContractRightsGovernance({}).governanceReview,true);});
