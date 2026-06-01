import test from "node:test";
import assert from "node:assert/strict";
import { runOpportunityFactory } from "../lib/opportunity-factory/opportunity-factory-service";
import { OpportunityRepository } from "../lib/opportunities/opportunity-repository";

test("factory run only creates or updates opportunities", async () => {
  const repository = new OpportunityRepository();
  repository.clearForTests();
  const result = await runOpportunityFactory("route-tenant", { repository, now: "2026-06-01T00:00:00.000Z" });
  assert.ok(result.summary.openOpportunities > 0);
  assert.equal(result.opportunities.some((opportunity) => opportunity.status === "APPROVED" || opportunity.status === "EXECUTING" || opportunity.status === "EXECUTED"), false);
  assert.equal(result.opportunities.some((opportunity) => opportunity.status === "APPROVAL_PENDING"), false);
});
