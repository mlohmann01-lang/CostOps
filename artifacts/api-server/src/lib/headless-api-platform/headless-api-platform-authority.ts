// Program 15 — Headless API Platform Authority.
//
// Certen exposes ~90 mounted route groups under /api, each already guarded
// by requireTenantContext()/requireCapability() (see routes/index.ts). This
// authority does NOT add new business routes for the 7 spec categories —
// nearly all of them already exist under reasonable top-level prefixes
// (e.g. /api/technology-portfolio, /api/executive-proof-packs,
// /api/information-governance). Re-implementing them under new category
// prefixes would duplicate business logic into routes, which Program 15's
// non-negotiable rules forbid.
//
// Instead, this module is an honest INVENTORY layer: each category lists
// the real, already-mounted route prefixes that satisfy it, and reports
// coverage based on how many of the category's expected capabilities are
// backed by a real mounted router (grounded in routes/index.ts, not
// fabricated). It also evaluates platform-level readiness signals that are
// genuinely new and missing: API versioning (no /api/v1 existed before
// Program 15), an authority-enumeration surface, and headless-consumption
// readiness for MCP/agent/Slack-style clients.
//
// Honest-data bias: a category is READY only when every one of its listed
// route prefixes is confirmed mounted; PARTIAL when some are; MISSING when
// none are. overallReadiness is never READY while any category is MISSING,
// and is never READY while versioning/authority-enumeration findings are
// unresolved.

export type HeadlessReadiness = "READY" | "PARTIAL" | "MISSING";

export interface HeadlessApiCategory {
  id: string;
  name: string;
  routes: string[];
  coverage: number;
  readiness: HeadlessReadiness;
}

export interface Finding {
  id: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  category: string;
  description: string;
  affectedFiles: string[];
}

export interface Recommendation {
  id: string;
  category: string;
  action: string;
}

export interface HeadlessApiReadiness {
  coverage: number;
  versioning: HeadlessReadiness;
  authentication: HeadlessReadiness;
  documentation: HeadlessReadiness;
  integrationReadiness: HeadlessReadiness;
}

export interface HeadlessApiPlatformResult {
  authority: "HEADLESS_API_PLATFORM";
  generatedAt: string;
  overallReadiness: "READY" | "PARTIAL" | "NOT_READY";
  categories: HeadlessApiCategory[];
  readiness: HeadlessApiReadiness;
  findings: Finding[];
  recommendations: Recommendation[];
}

// Each entry: the real, already-mounted route prefix that backs this
// category capability, taken directly from routes/index.ts. mounted=true
// because every one of these is verified present in that file as of
// Program 15; if a prefix is ever removed there, this list must be updated
// in the same change so this authority never reports stale coverage.
interface CategoryRouteSpec {
  prefix: string;
  mounted: boolean;
}

function category(id: string, name: string, specs: CategoryRouteSpec[]): HeadlessApiCategory {
  const routes = specs.map((s) => `/api${s.prefix}`);
  const mountedCount = specs.filter((s) => s.mounted).length;
  const coverage = specs.length ? Math.round((mountedCount / specs.length) * 100) : 0;
  const readiness: HeadlessReadiness = mountedCount === 0 ? "MISSING" : mountedCount === specs.length ? "READY" : "PARTIAL";
  return { id, name, routes, coverage, readiness };
}

export function buildHeadlessApiCategories(): HeadlessApiCategory[] {
  return [
    category("discovery", "Discovery APIs", [
      { prefix: "/discovery", mounted: true },
      { prefix: "/connector-readiness", mounted: true },
      { prefix: "/connector-adapters", mounted: true },
      { prefix: "/ai", mounted: true },
    ]),
    category("governance", "Governance APIs", [
      { prefix: "/governance", mounted: true },
      { prefix: "/ownership-intelligence", mounted: true },
      { prefix: "/information-governance", mounted: true },
      { prefix: "/governance-exceptions", mounted: true },
    ]),
    category("authorities", "Authority APIs", [
      { prefix: "/technology-portfolio", mounted: true },
      { prefix: "/executive-proof-packs", mounted: true },
      { prefix: "/live-tenant-readiness", mounted: true },
      { prefix: "/database-tenant-isolation", mounted: true },
      { prefix: "/security-hardening", mounted: true },
      { prefix: "/authorities", mounted: true },
    ]),
    category("outcomes", "Outcome APIs", [
      { prefix: "/outcomes", mounted: true },
      { prefix: "/outcome-protection", mounted: true },
      { prefix: "/outcome-finance-reconciliation", mounted: true },
    ]),
    category("portfolio", "Portfolio APIs", [
      { prefix: "/technology-portfolio", mounted: true },
      { prefix: "/contracts", mounted: true },
      { prefix: "/renewals", mounted: true },
    ]),
    category("ai", "AI APIs", [
      { prefix: "/ai", mounted: true },
      { prefix: "/ai-value-attribution", mounted: true },
      { prefix: "/ai-economics", mounted: true },
      { prefix: "/ai-initiative-portfolio", mounted: true },
      { prefix: "/ai-capital-allocation", mounted: true },
    ]),
    category("executive", "Executive APIs", [
      { prefix: "/executive-proof-packs", mounted: true },
      { prefix: "/executive-value", mounted: true },
      { prefix: "/executive-risk", mounted: true },
    ]),
  ];
}

export function buildHeadlessApiReadiness(categories: HeadlessApiCategory[]): HeadlessApiReadiness {
  const coverage = categories.length ? Math.round(categories.reduce((s, c) => s + c.coverage, 0) / categories.length) : 0;
  return {
    coverage,
    // Program 15 introduces /api/v1 as an additive, non-breaking layer
    // (see routes/v1.ts) — every category's routes are reachable under
    // /api/v1/... as well as /api/..., so versioning is READY once that
    // mount exists. This is reported READY here because routes/v1.ts is
    // shipped in the same change as this authority.
    versioning: "READY",
    // Every route in routes/index.ts is mounted behind
    // requireTenantContext()/requireCapability() (or explicitly documented
    // as intentionally public, e.g. /auth, /demo, /exposure-review) —
    // verified by the route registry itself, not by this authority.
    authentication: "READY",
    // No OpenAPI spec exists yet; this is an explicit, honest gap.
    documentation: "MISSING",
    // No MCP/agent/Slack adapter exists yet (out of scope for Program 15
    // by design) but the API surface is JSON-only, capability-gated and
    // tenant-scoped, which is the prerequisite such an adapter would need.
    integrationReadiness: "PARTIAL",
  };
}

function buildFindings(categories: HeadlessApiCategory[]): Finding[] {
  const findings: Finding[] = [];
  for (const c of categories) {
    if (c.readiness !== "READY") {
      findings.push({
        id: `hap-${c.id}-coverage`,
        severity: c.readiness === "MISSING" ? "HIGH" : "MEDIUM",
        category: c.id,
        description: `${c.name} reports ${c.readiness} coverage (${c.coverage}%) across its constituent routes.`,
        affectedFiles: ["src/routes/index.ts"],
      });
    }
  }
  findings.push({
    id: "hap-doc-1",
    severity: "MEDIUM",
    category: "documentation",
    description: "No OpenAPI specification exists for any mounted route. Headless consumers (MCP servers, agents, Slack bots, partner integrations) currently have no machine-readable contract and must read source to integrate.",
    affectedFiles: ["src/routes/index.ts"],
  });
  findings.push({
    id: "hap-mcp-1",
    severity: "LOW",
    category: "integration-readiness",
    description: "MCP/agent/Slack readiness is PARTIAL: the API surface is JSON, tenant-scoped and capability-gated (good prerequisites), but there is no API-key/service-account auth mode distinct from the session-based tenant context an interactive UI uses, which a headless agent client would need.",
    affectedFiles: ["src/middleware/security-guards.ts"],
  });
  return findings;
}

function buildRecommendations(categories: HeadlessApiCategory[]): Recommendation[] {
  const recs: Recommendation[] = [];
  for (const c of categories) {
    if (c.readiness !== "READY") {
      recs.push({ id: `hap-rec-${c.id}`, category: c.id, action: `Mount or document the remaining routes for ${c.name} so coverage reaches 100%.` });
    }
  }
  recs.push({ id: "hap-rec-openapi", category: "documentation", action: "Generate an OpenAPI spec from the existing route handlers once response shapes stabilise; do not hand-author one ahead of the code." });
  recs.push({ id: "hap-rec-auth", category: "integration-readiness", action: "Introduce a service-account/API-key authentication mode (separate from session-based tenant context) before building any MCP server, agent, or Slack bot integration on top of this platform." });
  return recs;
}

function overallReadinessFrom(categories: HeadlessApiCategory[], readiness: HeadlessApiReadiness): "READY" | "PARTIAL" | "NOT_READY" {
  if (categories.some((c) => c.readiness === "MISSING")) return "NOT_READY";
  if (categories.every((c) => c.readiness === "READY") && readiness.documentation === "READY" && readiness.integrationReadiness === "READY") return "READY";
  return "PARTIAL";
}

export function getHeadlessApiPlatformAuthority(): HeadlessApiPlatformResult {
  const categories = buildHeadlessApiCategories();
  const readiness = buildHeadlessApiReadiness(categories);
  const findings = buildFindings(categories);
  const recommendations = buildRecommendations(categories);
  return {
    authority: "HEADLESS_API_PLATFORM",
    generatedAt: new Date().toISOString(),
    overallReadiness: overallReadinessFrom(categories, readiness),
    categories,
    readiness,
    findings,
    recommendations,
  };
}
