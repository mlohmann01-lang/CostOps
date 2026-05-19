import { createHash } from 'node:crypto';export const verifyGovernanceProof=(input:{payload:string})=>createHash('sha256').update(input.payload).digest('hex');
