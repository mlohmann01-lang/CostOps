import type { ENode } from './economic-graph-types';export const normalizeEconomicGraphNodes=(input:ENode[])=>input.map((n)=>({...n,risk:Math.max(0,Math.min(1,Number(n.risk.toFixed(4))))}));
