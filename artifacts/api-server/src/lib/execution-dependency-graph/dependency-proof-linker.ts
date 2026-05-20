import { DependencyNode } from './execution-dependency-types';
export const verifyProofChain=(nodes:DependencyNode[])=>nodes.every(n=>!!n.proof);

export const dependency_proof_linker = { semanticProfile: true, deterministic: true };
