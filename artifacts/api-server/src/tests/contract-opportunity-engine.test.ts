import test from "node:test";
import assert from "node:assert/strict";
import { analyzeContract } from "../lib/contracts/contract-intelligence-engine";
import { generateContractOpportunities } from "../lib/contracts/contract-opportunity-engine";
import { ContractRepository } from "../lib/contracts/contract-repository";
import { buildOpportunities } from "../lib/opportunities/opportunity-factory";

test("generates contract opportunities", () => {
  const repo = new ContractRepository();
  repo.clearForTests();
  const snowflake = repo.getById("tenant-a", "con-snowflake")!;
  const opportunities = generateContractOpportunities(snowflake, analyzeContract(snowflake));
  assert.ok(opportunities.some((opportunity) => opportunity.title === "Commitment Optimization Opportunity"));
  assert.ok(opportunities.every((opportunity) => opportunity.source === "CONTRACT"));
});

test("contract opportunities feed opportunity factory", () => {
  const repo = new ContractRepository();
  repo.clearForTests();
  const adobe = repo.getById("tenant-a", "con-adobe")!;
  const opportunities = buildOpportunities({ contractOpportunities: generateContractOpportunities(adobe, analyzeContract(adobe)) });
  assert.ok(opportunities.some((opportunity) => opportunity.title === "License Reclaim Opportunity"));
  assert.equal(opportunities[0].source, "CONTRACT");
});
