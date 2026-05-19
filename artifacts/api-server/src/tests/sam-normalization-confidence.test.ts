import test from "node:test";
import assert from "node:assert/strict";
import { samNormalizationConfidence } from "../lib/servicenow-sam-realism/sam-normalization-confidence";
test("sam-normalization-confidence",()=>{assert.equal(samNormalizationConfidence({}).governanceReview,true);});
