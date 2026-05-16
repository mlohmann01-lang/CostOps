import test from "node:test";
import assert from "node:assert/strict";
import { routeM365Workflow } from "../lib/workflow/m365-workflow-routing";

test("workflow item created for governance review state", () => {
  const route = routeM365Workflow({ lifecycleState: "GOVERNANCE_REVIEW_REQUIRED" });
  assert.equal(route.workflowType, "GOVERNANCE_REVIEW_REQUIRED");
});
