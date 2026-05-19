import type { EconomicRecommendationReference } from './shared-economic-dtos'; import { assertEvidenceIntegrity } from './shared-evidence-contracts';
export function assertRecommendationIntegrity(r:EconomicRecommendationReference):void{ if(!r.id||!r.title) throw new Error('Invalid recommendation'); assertEvidenceIntegrity(r.evidence); }
