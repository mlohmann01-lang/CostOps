// Program 12 — Information Governance Authority (api-server mirror).
//
// This is a read-only evaluation layer over already-known facts about the
// platform's own architecture (the EncryptedMicrosoftTokenStore, the
// Exposure Review Graph scope guard, evidence-registry retention logic,
// requireCapability()/requireTenantContext() middleware, and the absence of
// any export/HTTPS-enforcement code). It mirrors the control-plane's
// information-governance-authority.ts model so both surfaces report
// identical, honest values — it does not implement new security controls
// and does not duplicate existing data stores.

export type DataClassification = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED" | "PII" | "SYSTEM_METADATA";
export type RetentionStatus = "DEFINED" | "MISSING" | "UNKNOWN";
export type GovernanceStatus = "READY" | "PARTIAL" | "MISSING" | "UNKNOWN";
export type ExportabilityStatus = "READY" | "PARTIAL" | "MISSING" | "UNKNOWN";
export type ReadinessStatus = "READY" | "PARTIAL" | "MISSING";
export type GovernanceFindingSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type GovernanceRecommendationType =
  | "DEFINE_RETENTION_POLICY"
  | "CLASSIFY_DATASET"
  | "RESTRICT_EXPORT"
  | "ENABLE_ENCRYPTION"
  | "LIMIT_ADMIN_ACCESS"
  | "VERIFY_TENANT_ISOLATION"
  | "REMOVE_UNNECESSARY_PII";

export interface DataInventoryCategory {
  name: string;
  classification: DataClassification;
  retentionStatus: RetentionStatus;
  exportability: ExportabilityStatus;
  encryptionStatus: GovernanceStatus;
  containsPII: boolean;
  containsSensitiveData: boolean;
  source: string;
}

export interface RetentionPolicy {
  category: string;
  status: RetentionStatus;
  retentionDays: number | "UNKNOWN";
  reviewRequired: boolean | "UNKNOWN";
  deletionSupported: boolean | "UNKNOWN";
  evidence: string;
}

export interface AccessPolicy { area: string; status: GovernanceStatus; evidence: string }
export interface EncryptionStatus { area: string; status: GovernanceStatus; evidence: string }
export interface ExportControl { area: string; status: ExportabilityStatus; evidence: string }
export interface SensitiveAttribute { question: string; answer: "YES" | "NO" | "UNKNOWN"; evidence: string }

export interface GovernanceFinding {
  id: string;
  area: string;
  severity: GovernanceFindingSeverity;
  description: string;
  evidence: string;
}

export interface GovernanceRecommendation {
  id: string;
  type: GovernanceRecommendationType;
  severity: GovernanceFindingSeverity;
  owner: string;
  rationale: string;
  recommendedAction: string;
}

export interface AuthoritySummary {
  score: number;
  status: ReadinessStatus;
  findings: GovernanceFinding[];
  recommendations: GovernanceRecommendation[];
}

export const DATA_INVENTORY: DataInventoryCategory[] = [
  { name: "Connector Metadata", classification: "INTERNAL", retentionStatus: "UNKNOWN", exportability: "MISSING", encryptionStatus: "UNKNOWN", containsPII: false, containsSensitiveData: false, source: "api-server connector registry (routes/connectors.ts, m365 connector config)" },
  { name: "OAuth Tokens", classification: "RESTRICTED", retentionStatus: "MISSING", exportability: "MISSING", encryptionStatus: "READY", containsPII: false, containsSensitiveData: true, source: "EncryptedMicrosoftTokenStore (AES-256-GCM, in-memory, no persisted TTL)" },
  { name: "Tenant Metadata", classification: "INTERNAL", retentionStatus: "UNKNOWN", exportability: "MISSING", encryptionStatus: "UNKNOWN", containsPII: false, containsSensitiveData: false, source: "tenant context / requireTenantContext() middleware" },
  { name: "Technology Assets", classification: "INTERNAL", retentionStatus: "UNKNOWN", exportability: "MISSING", encryptionStatus: "UNKNOWN", containsPII: false, containsSensitiveData: false, source: "Technology Authority / m365-discovery-service.ts" },
  { name: "Applications", classification: "INTERNAL", retentionStatus: "UNKNOWN", exportability: "MISSING", encryptionStatus: "UNKNOWN", containsPII: false, containsSensitiveData: false, source: "m365-discovery-service.ts application inventory" },
  { name: "Users", classification: "PII", retentionStatus: "UNKNOWN", exportability: "MISSING", encryptionStatus: "UNKNOWN", containsPII: true, containsSensitiveData: true, source: "m365-discovery-service.ts user principal names / display names / emails" },
  { name: "Ownership Signals", classification: "INTERNAL", retentionStatus: "UNKNOWN", exportability: "MISSING", encryptionStatus: "UNKNOWN", containsPII: false, containsSensitiveData: false, source: "ownership-intelligence service" },
  { name: "Licences", classification: "INTERNAL", retentionStatus: "UNKNOWN", exportability: "MISSING", encryptionStatus: "UNKNOWN", containsPII: false, containsSensitiveData: false, source: "m365 licence/SKU inventory" },
  { name: "Usage Signals", classification: "INTERNAL", retentionStatus: "UNKNOWN", exportability: "MISSING", encryptionStatus: "UNKNOWN", containsPII: false, containsSensitiveData: false, source: "m365 utilisation/sign-in activity signals" },
  { name: "Exposure Findings", classification: "CONFIDENTIAL", retentionStatus: "UNKNOWN", exportability: "MISSING", encryptionStatus: "UNKNOWN", containsPII: false, containsSensitiveData: true, source: "m365-exposure-review-service.ts / defaultExposureReport.ts" },
  { name: "Recommendations", classification: "INTERNAL", retentionStatus: "UNKNOWN", exportability: "MISSING", encryptionStatus: "UNKNOWN", containsPII: false, containsSensitiveData: false, source: "recommendation generators / recommendation registry" },
  { name: "Evidence Records", classification: "CONFIDENTIAL", retentionStatus: "DEFINED", exportability: "MISSING", encryptionStatus: "UNKNOWN", containsPII: false, containsSensitiveData: true, source: "evidence-registry/evidence-retention.ts (EvidenceRetentionPolicy.retentionDays, real expiry calculation)" },
  { name: "Outcome Records", classification: "CONFIDENTIAL", retentionStatus: "UNKNOWN", exportability: "MISSING", encryptionStatus: "UNKNOWN", containsPII: false, containsSensitiveData: false, source: "outcome ledger / outcome-protection service" },
  { name: "Outcome Finance Records", classification: "CONFIDENTIAL", retentionStatus: "UNKNOWN", exportability: "MISSING", encryptionStatus: "UNKNOWN", containsPII: false, containsSensitiveData: false, source: "outcome-finance-reconciliation-types.ts (no retention fields present)" },
  { name: "Audit Records", classification: "CONFIDENTIAL", retentionStatus: "UNKNOWN", exportability: "MISSING", encryptionStatus: "UNKNOWN", containsPII: false, containsSensitiveData: true, source: "audit-packs router / evidence-audit.ts" },
  { name: "Question Responses", classification: "INTERNAL", retentionStatus: "UNKNOWN", exportability: "MISSING", encryptionStatus: "UNKNOWN", containsPII: false, containsSensitiveData: false, source: "Headless Certen question/response model" },
];

const CLASSIFICATION_RULES: Record<string, DataClassification> = {
  "OAuth Tokens": "RESTRICTED",
  "User Principal Names": "PII",
  "Email Addresses": "PII",
  "Display Names": "PII",
  "Tenant Metadata": "INTERNAL",
  "Technology Inventory": "INTERNAL",
  "Evidence Records": "CONFIDENTIAL",
  "Outcome Finance": "CONFIDENTIAL",
  "Audit Records": "CONFIDENTIAL",
  "Question Catalog": "SYSTEM_METADATA",
  "Question Responses": "INTERNAL",
};

export function evaluateDataClassification(category: string): DataClassification | "UNKNOWN" {
  return CLASSIFICATION_RULES[category] ?? "UNKNOWN";
}

export function listClassificationRules(): Array<{ category: string; classification: DataClassification }> {
  return Object.entries(CLASSIFICATION_RULES).map(([category, classification]) => ({ category, classification }));
}

export function evaluateRetentionPolicy(category: string): RetentionPolicy {
  switch (category) {
    case "OAuth Tokens":
      return {
        category,
        status: "MISSING",
        retentionDays: "UNKNOWN",
        reviewRequired: "UNKNOWN",
        deletionSupported: true,
        evidence: "EncryptedMicrosoftTokenStore (microsoft-token-store.ts) is an in-memory Map with manual revoke() support but no TTL/expiry logic — no retention policy is enforced.",
      };
    case "Evidence Records":
      return {
        category,
        status: "DEFINED",
        retentionDays: "UNKNOWN",
        reviewRequired: true,
        deletionSupported: true,
        evidence: "evidence-registry/evidence-retention.ts defines EvidenceRetentionPolicy with a real retentionDays field and calculateExpiry()/applyPolicyToEvidence() logic that transitions evidence to EXPIRED. The exact day count is policy-data-driven per tenant/evidence type, not a fixed platform constant.",
      };
    case "Outcome Finance Records":
      return {
        category,
        status: "UNKNOWN",
        retentionDays: "UNKNOWN",
        reviewRequired: "UNKNOWN",
        deletionSupported: "UNKNOWN",
        evidence: "outcome-finance-reconciliation-types.ts defines no retention-related fields; no retention logic was found for this category.",
      };
    default:
      return {
        category,
        status: "UNKNOWN",
        retentionDays: "UNKNOWN",
        reviewRequired: "UNKNOWN",
        deletionSupported: "UNKNOWN",
        evidence: "No verified retention policy or logic was found in the codebase for this category.",
      };
  }
}

export function evaluateAccessGovernance(): AccessPolicy[] {
  return [
    { area: "Role Based Access", status: "READY", evidence: "middleware/security-guards.ts exports requireCapability(), applied to the majority of routers in routes/index.ts." },
    { area: "Tenant Isolation", status: "PARTIAL", evidence: "requireTenantContext() exists, but graph-tenant-isolation.test.ts only verifies in-memory array filtering by tenantId, not persistence/query-layer enforcement — documented as early-stage/thin enforcement." },
    { area: "Restricted Data Access", status: "PARTIAL", evidence: "RESTRICTED data (OAuth Tokens) is encrypted at rest, but no dedicated access-control layer beyond general route capability checks was found." },
    { area: "Admin Access", status: "UNKNOWN", evidence: "No dedicated admin-role/privileged-access model was found distinct from the general capability system." },
    { area: "Export Access", status: "MISSING", evidence: "No export endpoints exist, so there is no export access control to evaluate." },
  ];
}

export function evaluateEncryptionGovernance(): EncryptionStatus[] {
  return [
    { area: "At Rest", status: "UNKNOWN", evidence: "Database-at-rest encryption is an infrastructure/hosting-level fact, not verifiable from application code." },
    { area: "In Transit", status: "UNKNOWN", evidence: "No HTTPS/TLS enforcement was found in api-server/src/app.ts or index.ts." },
    { area: "Secrets Storage", status: "READY", evidence: "EncryptedMicrosoftTokenStore genuinely encrypts OAuth token payloads using AES-256-GCM (createCipheriv/createDecipheriv with per-record IV and auth tag)." },
  ];
}

export function evaluateExportGovernance(): ExportControl[] {
  return [
    { area: "Evidence Export", status: "MISSING", evidence: "No export/download endpoint was found for evidence-registry or evidence-packs." },
    { area: "Report Export", status: "MISSING", evidence: "No PDF/CSV export endpoint exists for Exposure Report or Economic Control Chain." },
    { area: "Question Export", status: "MISSING", evidence: "No export endpoint was found for the Headless Certen question/response catalog." },
    { area: "Finance Export", status: "MISSING", evidence: "No export endpoint was found for outcome-finance-reconciliation records." },
  ];
}

export function evaluatePrivacyPosture(): SensitiveAttribute[] {
  const evidence =
    "m365-exposure-scope-guard.ts hard-fails if Mail.Read, Files.Read.All, Sites.Read.All, Chat.Read, ChannelMessage.Read.All or Calendars.Read are requested/granted; EXPOSURE_REVIEW_ALLOWED_SCOPES only contains User.Read.All, Directory.Read.All, Reports.Read.All and AuditLog.Read.All.";
  return [
    { question: "Does Certen store email content?", answer: "NO", evidence },
    { question: "Does Certen store document content?", answer: "NO", evidence },
    { question: "Does Certen store Teams messages?", answer: "NO", evidence },
    { question: "Does Certen store SharePoint file content?", answer: "NO", evidence },
  ];
}

function statusScore(status: GovernanceStatus | RetentionStatus | ExportabilityStatus): number {
  if (status === "READY" || status === "DEFINED") return 1;
  if (status === "PARTIAL") return 0.5;
  return 0;
}

export function evaluateInformationGovernanceReadiness(): AuthoritySummary {
  const findings: GovernanceFinding[] = [];
  const recommendations: GovernanceRecommendation[] = [];

  const classificationScore = 1; // every inventory category has a recorded classification

  const retentionPolicies = DATA_INVENTORY.map((item) => evaluateRetentionPolicy(item.name));
  const retentionScore = retentionPolicies.reduce((sum, p) => sum + statusScore(p.status), 0) / retentionPolicies.length;
  for (const policy of retentionPolicies) {
    if (policy.status !== "DEFINED") {
      findings.push({ id: `retention-${policy.category}`, area: "Retention", severity: policy.status === "MISSING" ? "HIGH" : "MEDIUM", description: `${policy.category} has ${policy.status === "MISSING" ? "no" : "an unverified"} retention policy.`, evidence: policy.evidence });
      recommendations.push({ id: `rec-retention-${policy.category}`, type: "DEFINE_RETENTION_POLICY", severity: policy.status === "MISSING" ? "HIGH" : "MEDIUM", owner: policy.category, rationale: `${policy.category} retention is currently ${policy.status}.`, recommendedAction: `Define and implement an explicit retention policy for ${policy.category}.` });
    }
  }

  const accessPolicies = evaluateAccessGovernance();
  const accessScore = accessPolicies.reduce((sum, p) => sum + statusScore(p.status), 0) / accessPolicies.length;
  for (const policy of accessPolicies) {
    if (policy.area === "Tenant Isolation" && policy.status === "PARTIAL") {
      findings.push({ id: "access-tenant-isolation", area: "Access", severity: "HIGH", description: "Tenant isolation enforcement is partial/early-stage.", evidence: policy.evidence });
      recommendations.push({ id: "rec-verify-tenant-isolation", type: "VERIFY_TENANT_ISOLATION", severity: "HIGH", owner: "Platform Security", rationale: "Tenant isolation is currently enforced only at a thin/early-stage level.", recommendedAction: "Harden and verify tenant isolation enforcement at the persistence/query layer." });
    }
    if (policy.area === "Admin Access" && policy.status !== "READY") {
      recommendations.push({ id: "rec-limit-admin-access", type: "LIMIT_ADMIN_ACCESS", severity: "MEDIUM", owner: "Platform Security", rationale: "No dedicated admin/privileged-access model was found.", recommendedAction: "Define and enforce a distinct admin/privileged access tier with its own audit trail." });
    }
  }

  const encryptionStatuses = evaluateEncryptionGovernance();
  const encryptionScore = encryptionStatuses.reduce((sum, e) => sum + statusScore(e.status), 0) / encryptionStatuses.length;
  for (const item of encryptionStatuses) {
    if (item.status === "UNKNOWN") {
      findings.push({ id: `encryption-${item.area}`, area: "Encryption", severity: "MEDIUM", description: `${item.area} encryption status could not be verified from the codebase.`, evidence: item.evidence });
      recommendations.push({ id: `rec-encryption-${item.area}`, type: "ENABLE_ENCRYPTION", severity: "MEDIUM", owner: item.area, rationale: `${item.area} encryption could not be verified.`, recommendedAction: `Confirm and document ${item.area} encryption posture.` });
    }
  }

  const privacyAttributes = evaluatePrivacyPosture();
  const privacyScore = privacyAttributes.filter((a) => a.answer === "NO").length / privacyAttributes.length;
  for (const attribute of privacyAttributes) {
    if (attribute.answer === "YES") {
      findings.push({ id: `privacy-${attribute.question}`, area: "Privacy", severity: "CRITICAL", description: `Unexpected content storage detected: ${attribute.question}`, evidence: attribute.evidence });
      recommendations.push({ id: `rec-privacy-${attribute.question}`, type: "REMOVE_UNNECESSARY_PII", severity: "CRITICAL", owner: "Platform Security", rationale: `${attribute.question} unexpectedly resolved to YES.`, recommendedAction: "Remove the offending content-reading code path immediately." });
    }
  }

  const exportControls = evaluateExportGovernance();
  for (const control of exportControls) {
    if (control.status === "READY" || control.status === "PARTIAL") {
      recommendations.push({ id: `rec-restrict-export-${control.area}`, type: "RESTRICT_EXPORT", severity: "MEDIUM", owner: control.area, rationale: `${control.area} export exists but should be reviewed for access restrictions.`, recommendedAction: `Confirm ${control.area} export is gated behind the appropriate capability and audit trail.` });
    }
  }

  const weightedScore = classificationScore * 0.2 + retentionScore * 0.2 + accessScore * 0.2 + encryptionScore * 0.2 + privacyScore * 0.2;
  const score = Math.round(weightedScore * 100);

  let status: ReadinessStatus;
  if (score >= 80) status = "READY";
  else if (score > 0) status = "PARTIAL";
  else status = "MISSING";

  return { score, status, findings, recommendations };
}

export interface InformationGovernanceAuthorityModel {
  dataInventory: DataInventoryCategory[];
  classificationRules: Array<{ category: string; classification: DataClassification }>;
  retentionPolicies: RetentionPolicy[];
  accessGovernance: AccessPolicy[];
  encryptionGovernance: EncryptionStatus[];
  exportGovernance: ExportControl[];
  privacyPosture: SensitiveAttribute[];
  readiness: AuthoritySummary;
}

export function getInformationGovernanceAuthority(): InformationGovernanceAuthorityModel {
  return {
    dataInventory: DATA_INVENTORY,
    classificationRules: listClassificationRules(),
    retentionPolicies: DATA_INVENTORY.map((item) => evaluateRetentionPolicy(item.name)),
    accessGovernance: evaluateAccessGovernance(),
    encryptionGovernance: evaluateEncryptionGovernance(),
    exportGovernance: evaluateExportGovernance(),
    privacyPosture: evaluatePrivacyPosture(),
    readiness: evaluateInformationGovernanceReadiness(),
  };
}
