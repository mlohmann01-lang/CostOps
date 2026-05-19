import test from "node:test";
import assert from "node:assert/strict";
import { samEntitlementNormalization } from "../lib/servicenow-sam-realism/sam-entitlement-normalization";
test("sam-entitlement-normalization",()=>{assert.equal(samEntitlementNormalization({}).governanceReview,true);});
