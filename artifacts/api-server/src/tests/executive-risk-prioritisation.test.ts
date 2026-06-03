import test from "node:test";
import assert from "node:assert/strict";
import { prioritiseExecutiveRisks } from "../lib/executive-risk/executive-risk-prioritisation";
import type { ExecutiveRiskItem } from "../lib/executive-risk/executive-risk-types";
const base: Omit<ExecutiveRiskItem, "id" | "title" | "riskScore"> = { riskLevel:"HIGH", domain:"RENEWALS", rationale:"r", recommendedAction:"INVESTIGATE", evidenceRefs:[] };
test("executive risk prioritisation sorts by score urgency exposure and users", () => {
  const risks: ExecutiveRiskItem[] = [{...base,id:"a",title:"A",riskScore:80,daysToRenewal:90,annualCostExposure:10},{...base,id:"b",title:"B",riskScore:95,daysToRenewal:120,annualCostExposure:10},{...base,id:"c",title:"C",riskScore:95,daysToRenewal:30,annualCostExposure:10}];
  assert.deepEqual(prioritiseExecutiveRisks(risks).map((r)=>r.id), ["c","b","a"]);
});
