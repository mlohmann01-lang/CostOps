import test from "node:test";
import assert from "node:assert/strict";
import { samRemovalCandidateGovernance } from "../lib/servicenow-sam-realism/sam-removal-candidate-governance";
test("sam-removal-candidate-governance",()=>{assert.equal(samRemovalCandidateGovernance({}).governanceReview,true);});
