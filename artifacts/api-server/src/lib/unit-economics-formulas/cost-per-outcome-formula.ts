import { ratio } from "./_shared"; export const computeCostPerOutcome=(i:any)=>ratio(i.cost,i.outcome ?? null,"cost/outcome",i.confidence,i.assumptions,i.evidenceRefs,i.coefficients);
