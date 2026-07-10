// Program 13 — Tenant Isolation Verification Authority (api-server mirror).
//
// Mirrors the control-plane's tenant-isolation-authority.ts model so both
// surfaces report identical, honest values. This is a read-only evaluation
// layer over already-known facts about the platform's own architecture
// (requireTenantContext()/requireCapability() middleware, M365SnapshotRepository's
// tenant-keyed Maps, EconomicOperationsIntentService's tenant-scoped lookups,
// the hardcoded-PASS TenantIsolationAuditService stub, the absence of any
// export engine, headless API or live relationship-graph data source) — it
// does not implement new security controls and does not redesign tenancy.

export type IsolationStatus = "VERIFIED" | "PARTIAL" | "FAILED" | "UNKNOWN";
export type IsolationEvidenceSource = "TEST" | "RUNTIME" | "CONFIGURATION" | "CODE" | "MANUAL";

export interface IsolationEvidence {
  id: string;
  source: IsolationEvidenceSource;
  description: string;
  reference: string;
}

export interface IsolationCheck {
  id: string;
  domainId: string;
  description: string;
  status: IsolationStatus;
  evidence: IsolationEvidence[];
}

export type IsolationFindingType =
  | "MISSING_TENANT_FILTER"
  | "UNVERIFIED_REPOSITORY"
  | "UNVERIFIED_API"
  | "UNVERIFIED_CONNECTOR"
  | "UNVERIFIED_DISCOVERY_PATH"
  | "UNVERIFIED_EVIDENCE_PATH"
  | "UNVERIFIED_EXPORT_PATH"
  | "UNVERIFIED_GRAPH_PATH"
  | "UNVERIFIED_HEADLESS_PATH"
  | "CROSS_TENANT_RISK";

export type IsolationFindingSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface IsolationFinding {
  id: string;
  domainId: string;
  type: IsolationFindingType;
  severity: IsolationFindingSeverity;
  rationale: string;
  evidence: string;
  remediation: string;
}

export type IsolationRecommendationType =
  | "ADD_TENANT_ENFORCEMENT"
  | "VERIFY_REPOSITORY"
  | "VERIFY_API"
  | "VERIFY_CONNECTOR"
  | "VERIFY_DISCOVERY"
  | "VERIFY_EVIDENCE"
  | "VERIFY_EXPORT"
  | "VERIFY_HEADLESS"
  | "VERIFY_GRAPH";

export interface IsolationRecommendation {
  id: string;
  type: IsolationRecommendationType;
  domainId: string;
  severity: IsolationFindingSeverity;
  owner: string;
  recommendedAction: string;
}

export interface IsolationDomain {
  id: string;
  name: string;
  status: IsolationStatus;
  evidenceCount: number;
  lastVerified: string;
  findings: IsolationFinding[];
}

export type IsolationReadinessStatus = "READY" | "PARTIAL" | "MISSING";

export interface IsolationSummary {
  score: number;
  status: IsolationReadinessStatus;
  findings: IsolationFinding[];
  recommendations: IsolationRecommendation[];
}

export type IsolationReadiness = IsolationSummary;

export const ISOLATION_DOMAIN_IDS = [
  "storage",
  "api",
  "connector",
  "discovery",
  "snapshot",
  "technology-authority",
  "evidence",
  "outcome",
  "outcome-finance",
  "export",
  "headless",
  "graph",
  "audit",
] as const;

export type IsolationDomainId = (typeof ISOLATION_DOMAIN_IDS)[number];

const DOMAIN_NAMES: Record<IsolationDomainId, string> = {
  storage: "Storage Isolation",
  api: "API Isolation",
  connector: "Connector Isolation",
  discovery: "Discovery Isolation",
  snapshot: "Snapshot Isolation",
  "technology-authority": "Technology Authority Isolation",
  evidence: "Evidence Isolation",
  outcome: "Outcome Isolation",
  "outcome-finance": "Outcome Finance Isolation",
  export: "Export Isolation",
  headless: "Headless Question Isolation",
  graph: "Graph Isolation",
  audit: "Audit Isolation",
};

const VERIFIED_AT = "2026-06-21";

function evidence(id: string, source: IsolationEvidenceSource, description: string, reference: string): IsolationEvidence {
  return { id, source, description, reference };
}

export function verifyStorageIsolation(): IsolationCheck {
  return {
    id: "storage-check",
    domainId: "storage",
    description: "tenantId filters are enforced and cross-tenant reads/writes are blocked at the storage layer.",
    status: "PARTIAL",
    evidence: [
      evidence("storage-ev-1", "CODE", "M365SnapshotRepository stores/reads snapshots via Maps keyed by tenantId (latestByTenant), making cross-tenant snapshot reads structurally impossible.", "src/lib/connectors/m365/m365-snapshot-repository.ts"),
      evidence("storage-ev-2", "CODE", "requireTenantContext() returns 403 TENANT_ACCESS_DENIED before a request reaches any repository when the requested tenantId does not match the authenticated tenant.", "src/middleware/security-guards.ts"),
      evidence("storage-ev-3", "TEST", "tenantSafeLookup tests prove in-memory array filtering by tenantId, but no test was found exercising a real Drizzle/Postgres query for cross-tenant rejection.", "src/tests/tenant-context-consistency.test.ts"),
    ],
  };
}

export function verifyApiIsolation(): IsolationCheck {
  return {
    id: "api-check",
    domainId: "api",
    description: "API routes require tenant context, validate it, and reject cross-tenant/missing-context requests.",
    status: "PARTIAL",
    evidence: [
      evidence("api-ev-1", "CODE", "routes/index.ts mounts requireTenantContext()+requireCapability(...) on Technology Portfolio, Outcome Finance Reconciliation, Evidence Registry, Information Governance and most other internal authority routers.", "src/routes/index.ts"),
      evidence("api-ev-2", "CODE", "requireTenantContext() rejects a request with 403 TENANT_ACCESS_DENIED when the requested tenantId does not match the authenticated tenant (and role is not PLATFORM_ADMIN), and 400 TENANT_CONTEXT_REQUIRED when missing in production.", "src/middleware/security-guards.ts"),
      evidence("api-ev-3", "CODE", "Several routers (outcomes, drift, jobs, verification, approvals, platform-events, onboarding, workflow, execution-orchestration) are mounted in routes/index.ts WITHOUT requireTenantContext() — a real, unguarded gap.", "src/routes/index.ts"),
      evidence("api-ev-4", "CODE", "Headless Question/Answer API does not exist: runtime-headless-contract.ts exports only an identity stub `(i:any)=>i`, confirming the question/answer layer was never exposed over HTTP.", "src/lib/runtime-interface-contracts/runtime-headless-contract.ts"),
    ],
  };
}

export function verifyConnectorIsolation(): IsolationCheck {
  return {
    id: "connector-check",
    domainId: "connector",
    description: "Tenant A cannot access tenant B connector credentials/tokens or start discovery using tenant B connectors.",
    status: "PARTIAL",
    evidence: [
      evidence("connector-ev-1", "CODE", "EncryptedMicrosoftTokenStore (microsoft-token-store.ts) encrypts OAuth token payloads at rest with AES-256-GCM, limiting blast radius of a direct data leak, but no test was found proving a tenant-scoped lookup API rejects cross-tenant key access.", "src/lib/microsoft-auth/microsoft-token-store.ts"),
      evidence("connector-ev-2", "CODE", "routes/index.ts mounts /connectors, /production-connectors, /connector-adapters, /connector-readiness, /connector-contract-testing behind requireTenantContext()+requireCapability(\"READ_CONNECTORS\").", "src/routes/index.ts"),
      evidence("connector-ev-3", "TEST", "No behavioural test was found that starts an M365 discovery run for tenant A using tenant B credentials and asserts rejection.", "src/lib/connectors/m365/"),
    ],
  };
}

export function verifyDiscoveryIsolation(): IsolationCheck {
  return {
    id: "discovery-check",
    domainId: "discovery",
    description: "Tenant A's discovery results/snapshots/findings/report are unavailable to tenant B.",
    status: "PARTIAL",
    evidence: [
      evidence("discovery-ev-1", "CODE", "M365SnapshotRepository.getLatest(tenantId)/listRuns(tenantId)/listUsers(tenantId) all resolve through a static Map<tenantId, ...> — tenant B cannot retrieve tenant A snapshots through this API by construction.", "src/lib/connectors/m365/m365-snapshot-repository.ts"),
      evidence("discovery-ev-2", "CODE", "/discovery and /graph routers in routes/index.ts are gated by requireTenantContext()+requireCapability(\"READ_GRAPH\").", "src/routes/index.ts"),
      evidence("discovery-ev-3", "TEST", "No direct behavioural test exercised M365SnapshotRepository with two distinct tenantIds prior to this program; isolation is structural (by Map key) but was previously not test-covered.", "src/lib/connectors/m365/m365-snapshot-repository.ts"),
    ],
  };
}

export function verifySnapshotIsolation(): IsolationCheck {
  return {
    id: "snapshot-check",
    domainId: "snapshot",
    description: "M365 tenant snapshots (users, licenses, usage, mailboxes) are isolated per tenant.",
    status: "PARTIAL",
    evidence: [
      evidence("snapshot-ev-1", "CODE", "M365SnapshotRepository persists exactly one bundle-map entry per snapshotId and a separate latestByTenant: Map<tenantId, snapshotId> pointer — there is no code path that returns a snapshot for a tenantId other than the one passed in.", "src/lib/connectors/m365/m365-snapshot-repository.ts"),
      evidence("snapshot-ev-2", "TEST", "A dedicated cross-tenant snapshot-isolation test is added by this program (see tenant-isolation-authority.test.ts).", "src/lib/connectors/m365/m365-snapshot-repository.ts"),
    ],
  };
}

export function verifyAuthorityIsolation(): IsolationCheck {
  return {
    id: "authority-check",
    domainId: "technology-authority",
    description: "Technology Authority, Outcome Finance, Outcome Protection, Information Governance, Authority Catalog and Executive Command Center do not expose cross-tenant data.",
    status: "PARTIAL",
    evidence: [
      evidence("authority-ev-1", "CODE", "/technology-portfolio, /technology-commercial-authority, /outcome-protection, /information-governance routers are all mounted with requireTenantContext()+requireCapability(\"READ_RECOMMENDATIONS\") in routes/index.ts.", "src/routes/index.ts"),
      evidence("authority-ev-2", "CODE", "The control-plane Technology Authority/Outcome Finance/Information Governance Authority pages render largely from static demo/default data objects rather than from a verified per-tenant query — no per-tenant scoping logic was found in these page-level models themselves.", "artifacts/control-plane/src/lib/informationGovernance/information-governance-authority.ts"),
      evidence("authority-ev-3", "CODE", "Information Governance Authority's own evaluateAccessGovernance() self-reports Tenant Isolation as PARTIAL, corroborating this domain's verdict from an independent prior audit.", "src/lib/information-governance/information-governance-authority.ts"),
    ],
  };
}

export function verifyEvidenceIsolation(): IsolationCheck {
  return {
    id: "evidence-check",
    domainId: "evidence",
    description: "Evidence records/exports/lookups/links are tenant-scoped; cross-tenant evidence access is blocked.",
    status: "PARTIAL",
    evidence: [
      evidence("evidence-ev-1", "CODE", "/evidence-registry and /evidence-packs routers are mounted with requireTenantContext()+requireCapability(\"READ_RECOMMENDATIONS\") in routes/index.ts.", "src/routes/index.ts"),
      evidence("evidence-ev-2", "CODE", "evidence-registry/evidence-retention.ts defines a real EvidenceRetentionPolicy with retentionDays/expiry logic, but no tenant-scoping test at the repository level was found for evidence-registry-repository.ts.", "src/lib/evidence-registry/evidence-registry-repository.ts"),
    ],
  };
}

export function verifyOutcomeIsolation(): IsolationCheck {
  return {
    id: "outcome-check",
    domainId: "outcome",
    description: "Tenant A cannot read/influence tenant B's outcome ledger, action history or proof graph.",
    status: "PARTIAL",
    evidence: [
      evidence("outcome-ev-1", "TEST", "economic-operations-tenant-isolation.test.ts asserts EconomicOperationsIntentService.getActions('TENANT-B', executionId) returns an empty array after only TENANT-A actions were recorded, and that a cross-tenant submitIntent is rejected (accepted:false) — a real behavioural test against the production service class.", "src/tests/economic-operations-tenant-isolation.test.ts"),
      evidence("outcome-ev-2", "TEST", "Same file asserts getProofGraph('TENANT-UNKNOWN', ...) returns nodes.length === 0.", "src/tests/economic-operations-tenant-isolation.test.ts"),
      evidence("outcome-ev-3", "CODE", "/outcomes router in routes/index.ts is NOT gated by requireTenantContext() (mounted as router.use(\"/outcomes\", outcomesRouter) with no middleware) — a real, named gap at the HTTP boundary even though the underlying service is tenant-scoped.", "src/routes/index.ts"),
    ],
  };
}

export function verifyOutcomeFinanceIsolation(): IsolationCheck {
  return {
    id: "outcome-finance-check",
    domainId: "outcome-finance",
    description: "Tenant A cannot read tenant B's Outcome Finance reconciliation records.",
    status: "PARTIAL",
    evidence: [
      evidence("outcome-finance-ev-1", "CODE", "/outcome-finance-reconciliation router is mounted with requireTenantContext()+requireCapability(\"READ_RECOMMENDATIONS\") in routes/index.ts.", "src/routes/index.ts"),
      evidence("outcome-finance-ev-2", "CODE", "outcome-finance-reconciliation-types.ts defines no tenant-scoped repository query test; no isolation-specific test was found for this category.", "src/lib/"),
    ],
  };
}

export function verifyExportIsolation(): IsolationCheck {
  return {
    id: "export-check",
    domainId: "export",
    description: "Report/evidence exports are tenant-scoped (future PDF/CSV exports too).",
    status: "UNKNOWN",
    evidence: [
      evidence("export-ev-1", "CODE", "No export/download endpoint exists anywhere in routes/index.ts; Information Governance Authority's evaluateExportGovernance() independently reports Evidence/Report/Question/Finance export as MISSING across the codebase.", "src/routes/index.ts"),
    ],
  };
}

export function verifyHeadlessIsolation(): IsolationCheck {
  return {
    id: "headless-check",
    domainId: "headless",
    description: "Headless question resolution/answers/evidence/recommendations are tenant-scoped, future-ready.",
    status: "UNKNOWN",
    evidence: [
      evidence("headless-ev-1", "CODE", "runtime-headless-contract.ts exports only `export const runtimeheadlesscontract=(i:any)=>i;` — a literal identity stub confirming no headless API has been exposed over HTTP.", "src/lib/runtime-interface-contracts/runtime-headless-contract.ts"),
      evidence("headless-ev-2", "CODE", "The control-plane's headlessCerten question/answer layer was locked with no adapters or API exposure — there is no endpoint to verify tenant scoping against.", "artifacts/control-plane/src/lib/headlessCerten/"),
    ],
  };
}

export function verifyGraphIsolation(): IsolationCheck {
  return {
    id: "graph-check",
    domainId: "graph",
    description: "Internal relationship-graph nodes/edges/queries/traversals are tenant-scoped (NOT Microsoft Graph).",
    status: "UNKNOWN",
    evidence: [
      evidence("graph-ev-1", "CODE", "router.get(\"/governance-graph\", ...) in routes/index.ts renders buildGovernanceGraph(demoGovernanceGraphInput) — a static demo fixture, not a tenant-scoped data source — and is NOT gated by requireTenantContext() (only requireCapability).", "src/routes/index.ts"),
      evidence("graph-ev-2", "CODE", "governance-graph-types.ts confirms this is an internal vendor/application/owner/finding relationship graph, not Microsoft Graph and not a 'Graph Explorer' UI — there is no per-tenant graph database or traversal engine to verify isolation against.", "src/lib/governance-graph/governance-graph-types.ts"),
    ],
  };
}

export function verifyAuditIsolation(): IsolationCheck {
  return {
    id: "audit-check",
    domainId: "audit",
    description: "Audit records/packs are tenant-scoped; the audit subsystem itself does not fabricate isolation evidence.",
    status: "PARTIAL",
    evidence: [
      evidence("audit-ev-1", "CODE", "/audit-packs router is mounted with requireTenantContext()+requireCapability(\"READ_RECOMMENDATIONS\") in routes/index.ts — a real route-level guard.", "src/routes/index.ts"),
      evidence("audit-ev-2", "CODE", "TenantIsolationAuditService.run() unconditionally returns status:\"PASS\" with hasTenantId:true/routeGuarded:true for all 15 hardcoded area names, regardless of actual verification — this is fabricated/stub evidence, not a real audit, and must not be cited as proof of isolation.", "src/lib/security/tenant-isolation-audit-service.ts"),
    ],
  };
}

const DOMAIN_CHECKS: Record<IsolationDomainId, () => IsolationCheck> = {
  storage: verifyStorageIsolation,
  api: verifyApiIsolation,
  connector: verifyConnectorIsolation,
  discovery: verifyDiscoveryIsolation,
  snapshot: verifySnapshotIsolation,
  "technology-authority": verifyAuthorityIsolation,
  evidence: verifyEvidenceIsolation,
  outcome: verifyOutcomeIsolation,
  "outcome-finance": verifyOutcomeFinanceIsolation,
  export: verifyExportIsolation,
  headless: verifyHeadlessIsolation,
  graph: verifyGraphIsolation,
  audit: verifyAuditIsolation,
};

function findingsForDomain(domainId: IsolationDomainId, check: IsolationCheck): IsolationFinding[] {
  const findings: IsolationFinding[] = [];
  const typeMap: Partial<Record<IsolationDomainId, IsolationFindingType>> = {
    storage: "MISSING_TENANT_FILTER",
    api: "UNVERIFIED_API",
    connector: "UNVERIFIED_CONNECTOR",
    discovery: "UNVERIFIED_DISCOVERY_PATH",
    snapshot: "UNVERIFIED_DISCOVERY_PATH",
    evidence: "UNVERIFIED_EVIDENCE_PATH",
    export: "UNVERIFIED_EXPORT_PATH",
    headless: "UNVERIFIED_HEADLESS_PATH",
    graph: "UNVERIFIED_GRAPH_PATH",
  };

  if (check.status === "PARTIAL" || check.status === "UNKNOWN" || check.status === "FAILED") {
    const type = typeMap[domainId] ?? "UNVERIFIED_REPOSITORY";
    const severity: IsolationFindingSeverity = check.status === "FAILED" ? "CRITICAL" : check.status === "PARTIAL" ? "HIGH" : "MEDIUM";
    findings.push({
      id: `finding-${domainId}`,
      domainId,
      type,
      severity,
      rationale: `${DOMAIN_NAMES[domainId]} is reported ${check.status}: ${check.description}`,
      evidence: check.evidence.map((e) => e.reference).join("; "),
      remediation: `Verify ${DOMAIN_NAMES[domainId]} with a real behavioural test exercising the production code path (repository, route, or service), citing the specific test name as evidence.`,
    });
  }

  if (domainId === "audit") {
    findings.push({
      id: "finding-audit-stub-service",
      domainId,
      type: "CROSS_TENANT_RISK",
      severity: "HIGH",
      rationale: "TenantIsolationAuditService.run() hardcodes PASS for every area unconditionally — this is compliance theatre, not real verification, and could mask an actual cross-tenant gap.",
      evidence: "src/lib/security/tenant-isolation-audit-service.ts",
      remediation: "Replace TenantIsolationAuditService.run() with real checks against actual repository/route code, or remove it so it cannot be mistaken for genuine evidence.",
    });
  }

  if (domainId === "api") {
    findings.push({
      id: "finding-api-unguarded-routers",
      domainId,
      type: "CROSS_TENANT_RISK",
      severity: "HIGH",
      rationale: "Several routers (outcomes, drift, jobs, verification, approvals, platform-events, onboarding, workflow, execution-orchestration, governance/exceptions) are mounted in routes/index.ts without requireTenantContext(), meaning tenant context is not enforced at the HTTP boundary for these paths.",
      evidence: "src/routes/index.ts",
      remediation: "Add requireTenantContext() (and an appropriate requireCapability()) to every router that reads or writes tenant-specific data, including outcomes, drift, jobs, verification and approvals.",
    });
  }

  return findings;
}

export function buildIsolationDomains(): IsolationDomain[] {
  return ISOLATION_DOMAIN_IDS.map((domainId) => {
    const check = DOMAIN_CHECKS[domainId]();
    const findings = findingsForDomain(domainId, check);
    return {
      id: domainId,
      name: DOMAIN_NAMES[domainId],
      status: check.status,
      evidenceCount: check.evidence.length,
      lastVerified: VERIFIED_AT,
      findings,
    };
  });
}

const RECOMMENDATION_TYPE_FOR_DOMAIN: Record<IsolationDomainId, IsolationRecommendationType> = {
  storage: "VERIFY_REPOSITORY",
  api: "VERIFY_API",
  connector: "VERIFY_CONNECTOR",
  discovery: "VERIFY_DISCOVERY",
  snapshot: "VERIFY_DISCOVERY",
  "technology-authority": "ADD_TENANT_ENFORCEMENT",
  evidence: "VERIFY_EVIDENCE",
  outcome: "VERIFY_API",
  "outcome-finance": "VERIFY_API",
  export: "VERIFY_EXPORT",
  headless: "VERIFY_HEADLESS",
  graph: "VERIFY_GRAPH",
  audit: "ADD_TENANT_ENFORCEMENT",
};

export function buildIsolationRecommendations(domains: IsolationDomain[]): IsolationRecommendation[] {
  const recommendations: IsolationRecommendation[] = [];
  for (const domain of domains) {
    if (domain.status === "VERIFIED") continue;
    const type = RECOMMENDATION_TYPE_FOR_DOMAIN[domain.id as IsolationDomainId];
    const severity: IsolationFindingSeverity = domain.status === "FAILED" ? "CRITICAL" : domain.status === "PARTIAL" ? "HIGH" : "MEDIUM";
    recommendations.push({
      id: `rec-${domain.id}`,
      type,
      domainId: domain.id,
      severity,
      owner: domain.name,
      recommendedAction:
        domain.status === "UNKNOWN"
          ? `${domain.name} has no implementation to verify yet — track this as a gap and re-evaluate once the underlying feature exists, rather than assuming isolation.`
          : `Add a direct behavioural test against the real ${domain.name.replace(" Isolation", "")} code path (repository/route/service) proving cross-tenant access is rejected, and wire it as IsolationEvidence.`,
    });
  }
  return recommendations;
}

const DOMAIN_WEIGHTS: Partial<Record<IsolationDomainId, number>> = {
  storage: 0.2,
  api: 0.2,
  connector: 0.15,
  discovery: 0.15,
  evidence: 0.1,
  "technology-authority": 0.1,
  export: 0.05,
  headless: 0.05,
};

function statusScore(status: IsolationStatus): number {
  if (status === "VERIFIED") return 1;
  if (status === "PARTIAL") return 0.5;
  return 0;
}

export function evaluateTenantIsolationReadiness(): IsolationSummary {
  const domains = buildIsolationDomains();
  const findings = domains.flatMap((domain) => domain.findings);
  const recommendations = buildIsolationRecommendations(domains);

  let weightedScore = 0;
  for (const domain of domains) {
    const weight = DOMAIN_WEIGHTS[domain.id as IsolationDomainId];
    if (weight) weightedScore += statusScore(domain.status) * weight;
  }
  const score = Math.round(weightedScore * 100);

  let status: IsolationReadinessStatus;
  if (score >= 80) status = "READY";
  else if (score > 0) status = "PARTIAL";
  else status = "MISSING";

  return { score, status, findings, recommendations };
}

export interface TenantIsolationAuthorityModel {
  domains: IsolationDomain[];
  checks: IsolationCheck[];
  readiness: IsolationReadiness;
}

export function getTenantIsolationAuthority(): TenantIsolationAuthorityModel {
  const domains = buildIsolationDomains();
  const checks = ISOLATION_DOMAIN_IDS.map((domainId) => DOMAIN_CHECKS[domainId]());
  return {
    domains,
    checks,
    readiness: evaluateTenantIsolationReadiness(),
  };
}
