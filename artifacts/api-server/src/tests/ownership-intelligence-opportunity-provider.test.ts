import test from "node:test";
import assert from "node:assert/strict";
import { generateOwnershipOpportunity } from "../lib/playbooks/ownership/ownership-intelligence-opportunity-provider";
import type { OwnershipFinding, OwnershipInput } from "../lib/playbooks/ownership/ownership-intelligence-types";

test("ownership opportunity reports exposed spend and not savings", () => {
  const apps: OwnershipInput[] = [{ id:"a", vendorName:"OpenAI", applicationName:"ChatGPT", annualCost:36000, sourceContext:["AI_GOVERNANCE"] }, { id:"b", vendorName:"Salesforce", applicationName:"Salesforce", annualCost:240000, businessOwner:"rev", budgetOwner:"fin", executiveSponsor:"cro", sourceContext:["MANUAL"] }];
  const findings: OwnershipFinding[] = [{ id:"f", vendorName:"OpenAI", applicationName:"ChatGPT", ownershipStatus:"OWNERLESS", gapType:"NO_BUSINESS_OWNER", riskLevel:"HIGH", recommendation:"ASSIGN_OWNER", annualCost:36000, sourceContext:["AI_GOVERNANCE"], trustScore:50, rationale:"missing", recommendedAction:"assign", evidenceRefs:["evidence:1"] }];
  const opportunity = generateOwnershipOpportunity(apps, findings);
  assert.equal(opportunity.annualSpendWithoutOwner, 36000);
  assert.equal(opportunity.aiApplicationsWithoutOwner, 1);
  assert.equal("totalPotentialAnnualSavings" in opportunity, false);
});
