import type { EvidenceIntegrityInput } from './evidence-integrity-types';export const evaluateEvidenceFreshness=(input:EvidenceIntegrityInput)=>Number((input.freshness).toFixed(4));
