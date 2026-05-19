import test from "node:test"; import assert from "node:assert/strict"; import * as m from "../lib/enterprise-economic-decision";
const i={id:"1",name:"AI",category:"AI_ACCELERATION",expectedEconomicImpact:0.8,realizationProbability:0.7,governanceRisk:0.4,operationalReadiness:0.6,ownerClarity:0.7,forecastConfidence:0.7,memoryReliability:0.7,recurrencePreventionValue:0.5,strategicUrgency:0.8,evidence:["e"]} as any;
test('normalizes decision inputs',()=>{ const r=m.normalizeEnterpriseDecisionInputs({tenantId:'t',initiatives:[i]}); assert.equal(r.normalizedInitiatives.length,1); });
