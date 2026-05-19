import test from "node:test";
import assert from "node:assert/strict";
import { samPublisherPackGovernance } from "../lib/servicenow-sam-realism/sam-publisher-pack-governance";
test("sam-publisher-pack-governance",()=>{assert.equal(samPublisherPackGovernance({}).governanceReview,true);});
