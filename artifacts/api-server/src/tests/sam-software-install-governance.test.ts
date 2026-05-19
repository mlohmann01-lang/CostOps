import test from "node:test";
import assert from "node:assert/strict";
import { samSoftwareInstallGovernance } from "../lib/servicenow-sam-realism/sam-software-install-governance";
test("sam-software-install-governance",()=>{assert.equal(samSoftwareInstallGovernance({}).governanceReview,true);});
