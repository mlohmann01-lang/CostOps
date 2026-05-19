import type { EEdge } from './economic-graph-types';export const normalizeEconomicGraphEdges=(input:EEdge[])=>input.map((e)=>({...e,weight:Math.max(0,Math.min(1,Number(e.weight.toFixed(4))))}));
