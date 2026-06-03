import test from "node:test";
import assert from "node:assert/strict";
import { scoreExecutiveRisk } from "../lib/executive-risk/executive-risk-scoring";

test("executive risk scoring applies severity and modifiers", () => {
  const score = scoreExecutiveRisk({ id:"r", title:"AI ownerless", riskLevel:"HIGH", domain:"AI_GOVERNANCE", annualCostExposure:150000, daysToRenewal:45, ownerMissing:true, affectedUsers:34, rationale:"risk", recommendedAction:"REVIEW_AI_POLICY", evidenceRefs:["e"] });
  assert.equal(score, 100);
  assert.equal(scoreExecutiveRisk({ id:"l", title:"low", riskLevel:"LOW", domain:"M365", rationale:"low", recommendedAction:"INVESTIGATE", evidenceRefs:[] }), 25);
});
