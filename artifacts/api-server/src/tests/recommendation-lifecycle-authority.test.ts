import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (p: string) => fs.readFileSync(new URL(p, import.meta.url), "utf8");

test("recommendation lifecycle authority doc defines canonical stages", () => {
  const doc = read("../../../../docs/architecture/recommendation-lifecycle-authority.md");
  for (const stage of ["GENERATED","TRUST_REVIEW_REQUIRED","GOVERNANCE_REVIEW_REQUIRED","WORKFLOW_REVIEW","ARBITRATED","SIMULATED","OUTCOME_PENDING","OUTCOME_RESOLVED","SUPPRESSED"]) assert.equal(doc.includes(stage), true);
});
