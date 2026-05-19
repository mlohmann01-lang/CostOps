import type { CitationInput } from './explainability-citation-types';export const buildLineageCitation=(i:CitationInput)=>`lineage:${i.lineageRefs.join(',')}`;
