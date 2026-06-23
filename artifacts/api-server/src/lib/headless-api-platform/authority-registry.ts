// Program 15 — Authority Registry.
//
// A directory of the existing authorities, reused as-is — it does not
// reimplement, wrap business logic, or duplicate routes/index.ts. It exists
// only so /api/authorities and /api/authorities/:authorityId can enumerate
// and resolve real authorities generically.
//
// Two authority shapes exist in this codebase:
//   - STATIC: a no-arg getXAuthority() verification authority (Program
//     13/14A/14B style) that reports the same result for every tenant.
//   - TENANT_SCOPED: a service method requiring a tenantId, returning a
//     tenant-specific summary (Program 13B-style business authorities).
// /api/authorities/:authorityId must know which shape it is resolving
// before it can decide whether req.tenantId is required.

import { getDatabaseTenantIsolationAuthority } from "../database-tenant-isolation/database-tenant-isolation-verification-authority";
import { getSecurityHardeningAuthority } from "../security-hardening/security-hardening-verification-authority";
import { getInformationGovernanceAuthority } from "../information-governance/information-governance-authority";
import { getTenantIsolationAuthority } from "../tenant-isolation/tenant-isolation-authority";
import { technologyPortfolioAuthorityService } from "../technology-portfolio-authority";
import { liveTenantReadinessService } from "../live-tenant-readiness";
import { ExecutiveProofPackService } from "../executive-proof-packs";
import { getOutcomeAttributionReadiness } from "../ai-value-attribution/outcome-attribution-readiness-authority";
import { getAIInitiativePortfolioAuthority } from "../ai-initiative-portfolio/ai-initiative-portfolio-authority";
import { getAIValueGraphAuthority } from "../ai-value-graph/ai-value-graph-authority";
import { getAIEconomicsAuthority } from "../ai-economics-authority/ai-economics-authority";
import { getAICapitalAllocationAuthority } from "../ai-capital-allocation-authority/ai-capital-allocation-authority";
import { getTechnologyInvestmentAuthority } from "../technology-investment-authority/technology-investment-authority";
import { getTechnologyEconomicsAuthority } from "../technology-economics-authority/technology-economics-authority";
import { getTechnologyCapitalAllocationAuthority } from "../technology-capital-allocation-authority/technology-capital-allocation-authority";

const executiveProofPackService = new ExecutiveProofPackService();

export type AuthorityKind = "STATIC" | "TENANT_SCOPED";

export interface AuthorityRegistryEntry {
  id: string;
  name: string;
  kind: AuthorityKind;
  resolve: (tenantId?: string) => unknown | Promise<unknown>;
}

export const AUTHORITY_REGISTRY: AuthorityRegistryEntry[] = [
  {
    id: "database-tenant-isolation",
    name: "Database Tenant Isolation Authority",
    kind: "STATIC",
    resolve: () => getDatabaseTenantIsolationAuthority(),
  },
  {
    id: "security-hardening",
    name: "Security Hardening Authority",
    kind: "STATIC",
    resolve: () => getSecurityHardeningAuthority(),
  },
  {
    id: "information-governance",
    name: "Information Governance Authority",
    kind: "STATIC",
    resolve: () => getInformationGovernanceAuthority(),
  },
  {
    id: "tenant-isolation",
    name: "Tenant Isolation Authority",
    kind: "STATIC",
    resolve: () => getTenantIsolationAuthority(),
  },
  {
    id: "technology-portfolio",
    name: "Technology Portfolio Authority",
    kind: "TENANT_SCOPED",
    resolve: (tenantId) => technologyPortfolioAuthorityService.summariseTenantPortfolio(tenantId as string),
  },
  {
    id: "executive-proof-packs",
    name: "Executive Proof Pack Authority",
    kind: "TENANT_SCOPED",
    resolve: (tenantId) => executiveProofPackService.summariseTenantProofPacks(tenantId as string),
  },
  {
    id: "live-tenant-readiness",
    name: "Live Tenant Onboarding Authority",
    kind: "TENANT_SCOPED",
    resolve: (tenantId) => liveTenantReadinessService.summariseLiveTenantReadiness(tenantId as string),
  },
  {
    id: "outcome-attribution-readiness",
    name: "Outcome Attribution Readiness Authority",
    kind: "TENANT_SCOPED",
    resolve: (tenantId) => getOutcomeAttributionReadiness(tenantId as string),
  },
  {
    id: "ai-initiative-portfolio",
    name: "AI Initiative Portfolio Authority",
    kind: "TENANT_SCOPED",
    resolve: (tenantId) => getAIInitiativePortfolioAuthority(tenantId as string),
  },
  {
    id: "ai-value-graph",
    name: "AI Value Graph Authority",
    kind: "TENANT_SCOPED",
    resolve: (tenantId) => getAIValueGraphAuthority(tenantId as string),
  },
  {
    id: "ai-economics-authority",
    name: "AI Economics Authority",
    kind: "TENANT_SCOPED",
    resolve: (tenantId) => getAIEconomicsAuthority(tenantId as string),
  },
  {
    id: "ai-capital-allocation-authority",
    name: "AI Capital Allocation Authority",
    kind: "TENANT_SCOPED",
    resolve: (tenantId) => getAICapitalAllocationAuthority(tenantId as string),
  },
  {
    id: "technology-investment-authority",
    name: "Technology Investment Authority",
    kind: "TENANT_SCOPED",
    resolve: (tenantId) => getTechnologyInvestmentAuthority(tenantId as string),
  },
  {
    id: "technology-economics-authority",
    name: "Technology Economics Authority",
    kind: "TENANT_SCOPED",
    resolve: (tenantId) => getTechnologyEconomicsAuthority(tenantId as string),
  },
  {
    id: "technology-capital-allocation-authority",
    name: "Technology Capital Allocation Authority",
    kind: "TENANT_SCOPED",
    resolve: (tenantId) => getTechnologyCapitalAllocationAuthority(tenantId as string),
  },
];

export function listAuthorities(): Array<{ id: string; name: string; kind: AuthorityKind }> {
  return AUTHORITY_REGISTRY.map(({ id, name, kind }) => ({ id, name, kind }));
}

export function getAuthorityEntry(authorityId: string): AuthorityRegistryEntry | undefined {
  return AUTHORITY_REGISTRY.find((a) => a.id === authorityId);
}
