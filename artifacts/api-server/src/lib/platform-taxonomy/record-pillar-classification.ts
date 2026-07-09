import type { Pillar } from './pillar-taxonomy-types';

/**
 * Sprint 7 follow-up: per-record pillar classification for evidence-binding
 * types already present on every proof pack record. Additive only -- no
 * schema/migration changes, no new record types.
 */
export const evidenceBindingTypePillar: Record<
  'SUPPORTS_METRIC' | 'PROVES_VALUE' | 'PROVES_ACTION' | 'PROVES_OUTCOME' | 'PROVES_OWNERSHIP' | 'PROVES_RISK' | 'PROVES_AUDIT' | 'EXPORT_INCLUDED',
  Pillar
> = {
  PROVES_ACTION: 'AUTO_EXECUTION',
  PROVES_VALUE: 'VALUE_REALISATION',
  PROVES_OUTCOME: 'VALUE_REALISATION',
  PROVES_RISK: 'PROTECTED_GOVERNANCE',
  PROVES_AUDIT: 'PROTECTED_GOVERNANCE',
  PROVES_OWNERSHIP: 'SHARED_PLATFORM',
  SUPPORTS_METRIC: 'SHARED_PLATFORM',
  EXPORT_INCLUDED: 'SHARED_PLATFORM',
};

export function pillarForEvidenceBindingType(bindingType: keyof typeof evidenceBindingTypePillar): Pillar {
  return evidenceBindingTypePillar[bindingType];
}
