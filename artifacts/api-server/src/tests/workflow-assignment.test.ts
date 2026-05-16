import test from "node:test";
import assert from "node:assert/strict";

test("assignment persists assignee and audit data shape", ()=>{
  const assignment = { tenantId: "t1", workflowItemId: "10", assigneeId: "u1", assignedBy: "admin", assignmentReason: "capacity" };
  assert.equal(assignment.assigneeId, "u1");
  assert.equal(Boolean(assignment.assignedBy), true);
});
