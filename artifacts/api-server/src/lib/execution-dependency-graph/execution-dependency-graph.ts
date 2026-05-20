import { DependencyEdge, DependencyNode } from './execution-dependency-types';
export const detectCircularDependencies=(nodes:DependencyNode[],edges:DependencyEdge[])=>{ const ids=new Set(nodes.map(n=>n.id)); return edges.some(e=>ids.has(e.from)&&ids.has(e.to)&&edges.some(r=>r.from===e.to&&r.to===e.from)); };
