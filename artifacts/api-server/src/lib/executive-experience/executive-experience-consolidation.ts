// Program CX1.3 — Authority Consolidation Layer.
//
// Executives should never see the names of underlying authorities — only
// Value, Investment, Risk, Decision and Operations groupings. This module
// iterates the real AUTHORITY_REGISTRY (Program 15) and maps each resolved
// authority result into a uniform, honest view. It never recomputes any
// authority's verdict, score, or findings — it only classifies and counts
// what each authority already reports.

import { AUTHORITY_REGISTRY } from '../headless-api-platform/authority-registry';

export type ConsolidatedAuthorityCategory = 'VALUE' | 'INVESTMENT' | 'RISK' | 'DECISION' | 'OPERATIONS';
export type ConsolidatedAuthorityReadiness = 'READY' | 'PARTIAL' | 'NOT_READY';

export interface ConsolidatedAuthorityView {
  id: string;
  name: string;
  category: ConsolidatedAuthorityCategory;
  readiness: ConsolidatedAuthorityReadiness;
  confidence?: number;
  findingsCount: number;
}

// Static lookup table — judgment call documented per id. Authorities not
// present here fall back to OPERATIONS (the safest "back office" bucket)
// rather than fabricating a more specific category.
const CATEGORY_BY_AUTHORITY_ID: Record<string, ConsolidatedAuthorityCategory> = {
  'technology-investment-authority': 'INVESTMENT',
  'technology-economics-authority': 'INVESTMENT',
  'technology-capital-allocation-authority': 'INVESTMENT',
  'ai-economics-authority': 'INVESTMENT',
  'ai-capital-allocation-authority': 'INVESTMENT',
  'ai-initiative-portfolio': 'INVESTMENT',
  'ai-value-graph': 'VALUE',
  'technology-portfolio': 'VALUE',
  'executive-proof-packs': 'OPERATIONS',
  'live-tenant-readiness': 'OPERATIONS',
  'outcome-attribution-readiness': 'OPERATIONS',
  'executive-decision-authority': 'DECISION',
  'database-tenant-isolation': 'RISK',
  'security-hardening': 'RISK',
  'information-governance': 'RISK',
  'tenant-isolation': 'RISK',
  'executive-experience-authority': 'OPERATIONS',
};

function categoryFor(id: string): ConsolidatedAuthorityCategory {
  return CATEGORY_BY_AUTHORITY_ID[id] ?? 'OPERATIONS';
}

// Result shapes vary across authorities (verdict/score, or platformVerdict,
// or a nested readiness object/string). This reads pragmatically across the
// known shapes without rebuilding any of them, and defaults to PARTIAL only
// when a real result exists but no readiness signal can be located —
// NOT_READY is reserved for explicit signals or resolution failure, and
// READY is never inferred without an explicit READY/VERIFIED signal.
function readinessFrom(result: unknown): ConsolidatedAuthorityReadiness {
  if (result === null || typeof result !== 'object') return 'PARTIAL';
  const r = result as Record<string, unknown>;

  const direct = r.verdict ?? r.platformVerdict;
  if (typeof direct === 'string') {
    if (direct === 'READY' || direct === 'VERIFIED') return 'READY';
    if (direct === 'PARTIAL' || direct === 'UNKNOWN') return 'PARTIAL';
    if (direct === 'NOT_READY' || direct === 'FAILED' || direct === 'MISSING' || direct === 'MISSING_DATA' || direct === 'BLOCKED') return 'NOT_READY';
  }

  const nestedReadiness = r.readiness;
  if (typeof nestedReadiness === 'string') {
    if (nestedReadiness === 'READY') return 'READY';
    if (nestedReadiness === 'PARTIAL') return 'PARTIAL';
    if (nestedReadiness === 'NOT_READY' || nestedReadiness === 'MISSING' || nestedReadiness === 'MISSING_DATA' || nestedReadiness === 'BLOCKED') return 'NOT_READY';
  } else if (nestedReadiness && typeof nestedReadiness === 'object') {
    const status = (nestedReadiness as Record<string, unknown>).status;
    if (typeof status === 'string') {
      if (status === 'READY') return 'READY';
      if (status === 'PARTIAL') return 'PARTIAL';
      if (status === 'NOT_READY' || status === 'MISSING') return 'NOT_READY';
    }
  }

  if (typeof r.score === 'number') {
    const score = r.score;
    return score >= 80 ? 'READY' : score >= 50 ? 'PARTIAL' : 'NOT_READY';
  }
  if (typeof r.packCount === 'number') {
    return r.packCount === 0 ? 'NOT_READY' : (typeof r.averageReadinessScore === 'number' && r.averageReadinessScore >= 80 ? 'READY' : 'PARTIAL');
  }

  return 'PARTIAL';
}

function confidenceFrom(result: unknown): number | undefined {
  if (result === null || typeof result !== 'object') return undefined;
  const r = result as Record<string, unknown>;
  if (typeof r.score === 'number') return r.score;
  if (typeof r.averageReadinessScore === 'number') return r.averageReadinessScore;
  return undefined;
}

function findingsCountFrom(result: unknown): number {
  if (result === null || typeof result !== 'object') return 0;
  const r = result as Record<string, unknown>;
  const arrayKeys = ['findings', 'gaps', 'risks', 'recommendations'];
  for (const key of arrayKeys) {
    const value = r[key];
    if (Array.isArray(value)) return value.length;
  }
  if (typeof r.gapCount === 'number') return r.gapCount;
  // domains[].findings (security hardening / tenant isolation shape)
  const domains = r.domains;
  if (Array.isArray(domains)) {
    return domains.reduce((sum: number, d: unknown) => {
      const findings = d && typeof d === 'object' ? (d as Record<string, unknown>).findings : undefined;
      return sum + (Array.isArray(findings) ? findings.length : 0);
    }, 0);
  }
  return 0;
}

/** CX1.3: resolves every registered authority into a uniform executive-safe view. Never throws — resolution failures are reported honestly as NOT_READY with zero findings. */
export async function getConsolidatedAuthorityViews(tenantId: string): Promise<ConsolidatedAuthorityView[]> {
  return Promise.all(
    AUTHORITY_REGISTRY.map(async (entry) => {
      try {
        const result = entry.kind === 'STATIC' ? await entry.resolve() : await entry.resolve(tenantId);
        return {
          id: entry.id,
          name: entry.name,
          category: categoryFor(entry.id),
          readiness: readinessFrom(result),
          confidence: confidenceFrom(result),
          findingsCount: findingsCountFrom(result),
        };
      } catch {
        return {
          id: entry.id,
          name: entry.name,
          category: categoryFor(entry.id),
          readiness: 'NOT_READY' as const,
          findingsCount: 0,
        };
      }
    }),
  );
}
