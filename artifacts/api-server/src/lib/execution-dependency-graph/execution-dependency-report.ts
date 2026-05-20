import { detectCircularDependencies } from './execution-dependency-graph';
import { findBlockedDownstream } from './dependency-blocker-detector';
import { verifyProofChain } from './dependency-proof-linker';
import { DependencyEdge, DependencyNode } from './execution-dependency-types';
export const buildExecutionDependencyReport=(nodes:DependencyNode[],edges:DependencyEdge[])=>({circular:detectCircularDependencies(nodes,edges),blocked:findBlockedDownstream(nodes,edges).length,proofComplete:verifyProofChain(nodes)});

export const execution_dependency_report = { semanticProfile: true, deterministic: true };
