import test from "node:test";
import assert from "node:assert/strict";
import { ContractRepository } from "../lib/contracts/contract-repository";
import { analyzeContract, summarizeContracts } from "../lib/contracts/contract-intelligence-engine";
import { calculateContractRisk } from "../lib/contracts/contract-risk-engine";

test("detects contract risk and unused value", () => {
  const repo = new ContractRepository();
  repo.clearForTests();
  const microsoft = repo.getById("tenant-a", "con-microsoft-ea")!;
  assert.equal(microsoft.unusedValue, 68000);
  assert.equal(calculateContractRisk(microsoft), "HIGH");
  const intelligence = analyzeContract(microsoft);
  assert.equal(intelligence.unusedSpend, 68000);
  assert.ok(intelligence.autoRenewalExposure > 0);
});

test("summary aggregates contracts, at-risk count, and unused value", () => {
  const repo = new ContractRepository();
  repo.clearForTests();
  const summary = summarizeContracts(repo.list("tenant-a"));
  assert.equal(summary.contracts, 6);
  assert.ok(summary.atRisk >= 4);
  assert.equal(summary.unusedValue, 240000);
  assert.ok(summary.generatedOpportunities >= 10);
});
