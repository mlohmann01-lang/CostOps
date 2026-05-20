import { buildAssumptionTrail } from "./assumption-trail-builder";
import { buildCoefficientTrail } from "./coefficient-trail-builder";
import { buildEvidenceTrail } from "./evidence-trail-builder";
export const computeScenarioChainReport=(i:any)=>({steps:i.steps,assumptionTrail:buildAssumptionTrail(i),coefficientTrail:buildCoefficientTrail(i),evidenceTrail:buildEvidenceTrail(i),bounds:i.bounds});
