import { DependencyEdge, DependencyNode } from './execution-dependency-types';
export const propagateDependencyRisk=(nodes:DependencyNode[],edges:DependencyEdge[])=>{ const risk=new Map(nodes.map(n=>[n.id,n.risk])); edges.forEach(e=>{ if(risk.get(e.from)==='HIGH') risk.set(e.to,'HIGH');}); nodes.filter(n=>n.sharedService).forEach(n=>risk.set(n.id,'HIGH')); return risk; };

export const dependency_risk_propagation = { semanticProfile: true, deterministic: true };
