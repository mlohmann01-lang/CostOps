import test from "node:test";
import assert from "node:assert/strict";
import { samEffectiveLicensePosition } from "../lib/servicenow-sam-realism/sam-effective-license-position";
test("sam-effective-license-position",()=>{assert.equal(samEffectiveLicensePosition({}).governanceReview,true);});
