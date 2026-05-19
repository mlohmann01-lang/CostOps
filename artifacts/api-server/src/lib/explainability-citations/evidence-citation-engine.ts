import type { CitationInput } from './explainability-citation-types';export const buildEvidenceCitation=(i:CitationInput)=>`evidence:${i.evidenceRefs.join(',')}`;
