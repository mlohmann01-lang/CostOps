import test from "node:test";
import assert from "node:assert/strict";
import { samReclamationCandidateEngine } from "../lib/servicenow-sam-realism/sam-reclamation-candidate-engine";
test("sam-reclamation-candidate-engine",()=>{assert.equal(samReclamationCandidateEngine({}).governanceReview,true);});
