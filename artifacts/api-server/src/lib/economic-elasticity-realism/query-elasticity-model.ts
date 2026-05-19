import type { ElasticityInput } from "./elasticity-types"; export const evaluateQueryElasticity=(i:ElasticityInput)=>({queryPressure:(i.intensity??1)*(1+i.growth),deterministicSimulation:true});
