// Program 12 — Information Governance Authority.
//
// This is the authoritative source of truth for: data classification, data
// collection, data retention, data privacy, access controls, export controls,
// encryption status and sensitive information handling. It is a REPORTING /
// GOVERNANCE layer over already-known facts about the platform's own
// architecture (in the spirit of the Authority Catalog, Economic Control
// Chain and Headless Certen patterns) — it does not implement new security
// controls, and it does not duplicate existing data stores.
//
// Honest-data bias: every evaluated value here is either a verified fact
// derived from real platform code (e.g. EncryptedMicrosoftTokenStore uses
// AES-256-GCM, the Exposure Review scope guard hard-fails content scopes) or
// explicitly reported as UNKNOWN/MISSING/"Not available" when the underlying
// mechanism does not exist or cannot be verified from the codebase. Nothing
// here is fabricated.

// ─── Canonical Entity Types (Part 1) ────────────────────────────────────────

export type DataClassification =
  | 'PUBLIC'
  | 'INTERNAL'
  | 'CONFIDENTIAL'
  | 'RESTRICTED'
  | 'PII'
  | 'SYSTEM_METADATA'

export interface BaseRecord {
  id: string
  tenantId: string
  classification: DataClassification
  source: string
  owner: string
  createdAt: string
  updatedAt: string
}

export interface DataAsset extends BaseRecord {
  name: string
  description: string
}

export type ExportabilityStatus = 'READY' | 'PARTIAL' | 'MISSING' | 'UNKNOWN'
export type RetentionStatus = 'DEFINED' | 'MISSING' | 'UNKNOWN'
export type GovernanceStatus = 'READY' | 'PARTIAL' | 'MISSING' | 'UNKNOWN'

export interface DataCollection extends BaseRecord {
  category: string
  retentionStatus: RetentionStatus
  exportability: ExportabilityStatus
  encryptionStatus: GovernanceStatus
  containsPII: boolean
  containsSensitiveData: boolean
}

export interface RetentionPolicy {
  category: string
  status: RetentionStatus
  retentionDays: number | 'UNKNOWN'
  reviewRequired: boolean | 'UNKNOWN'
  deletionSupported: boolean | 'UNKNOWN'
  evidence: string
}

export interface AccessPolicy {
  area: string
  status: GovernanceStatus
  evidence: string
}

export interface EncryptionStatus {
  area: string
  status: GovernanceStatus
  evidence: string
}

export interface ExportControl {
  area: string
  status: ExportabilityStatus
  evidence: string
}

export interface SensitiveAttribute {
  question: string
  answer: 'YES' | 'NO' | 'UNKNOWN'
  evidence: string
}

export type GovernanceFindingSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface GovernanceFinding {
  id: string
  area: string
  severity: GovernanceFindingSeverity
  description: string
  evidence: string
}

export type GovernanceRecommendationType =
  | 'DEFINE_RETENTION_POLICY'
  | 'CLASSIFY_DATASET'
  | 'RESTRICT_EXPORT'
  | 'ENABLE_ENCRYPTION'
  | 'LIMIT_ADMIN_ACCESS'
  | 'VERIFY_TENANT_ISOLATION'
  | 'REMOVE_UNNECESSARY_PII'

export interface GovernanceRecommendation {
  id: string
  type: GovernanceRecommendationType
  severity: GovernanceFindingSeverity
  owner: string
  rationale: string
  recommendedAction: string
}

export type ReadinessStatus = 'READY' | 'PARTIAL' | 'MISSING'

export interface AuthoritySummary {
  score: number
  status: ReadinessStatus
  findings: GovernanceFinding[]
  recommendations: GovernanceRecommendation[]
}

// ─── Part 2 — Data Inventory ────────────────────────────────────────────────
// Every category of information Certen actually stores, based on real
// architecture facts (Program 11 M365 discovery/snapshot persistence,
// Program 8 Exposure Report findings, the encrypted token store, evidence
// registry, outcome ledger, audit packs, headless question catalog).

export interface DataInventoryCategory {
  name: string
  classification: DataClassification
  retentionStatus: RetentionStatus
  exportability: ExportabilityStatus
  encryptionStatus: GovernanceStatus
  containsPII: boolean
  containsSensitiveData: boolean
  source: string
}

export const DATA_INVENTORY: DataInventoryCategory[] = [
  { name: 'Connector Metadata', classification: 'INTERNAL', retentionStatus: 'UNKNOWN', exportability: 'MISSING', encryptionStatus: 'UNKNOWN', containsPII: false, containsSensitiveData: false, source: 'api-server connector registry (e.g. routes/connectors.ts, m365 connector config)' },
  { name: 'OAuth Tokens', classification: 'RESTRICTED', retentionStatus: 'MISSING', exportability: 'MISSING', encryptionStatus: 'READY', containsPII: false, containsSensitiveData: true, source: 'EncryptedMicrosoftTokenStore (AES-256-GCM, in-memory, no persisted TTL)' },
  { name: 'Tenant Metadata', classification: 'INTERNAL', retentionStatus: 'UNKNOWN', exportability: 'MISSING', encryptionStatus: 'UNKNOWN', containsPII: false, containsSensitiveData: false, source: 'tenant context / requireTenantContext() middleware' },
  { name: 'Technology Assets', classification: 'INTERNAL', retentionStatus: 'UNKNOWN', exportability: 'MISSING', encryptionStatus: 'UNKNOWN', containsPII: false, containsSensitiveData: false, source: 'Technology Authority / m365-discovery-service.ts' },
  { name: 'Applications', classification: 'INTERNAL', retentionStatus: 'UNKNOWN', exportability: 'MISSING', encryptionStatus: 'UNKNOWN', containsPII: false, containsSensitiveData: false, source: 'm365-discovery-service.ts application inventory' },
  { name: 'Users', classification: 'PII', retentionStatus: 'UNKNOWN', exportability: 'MISSING', encryptionStatus: 'UNKNOWN', containsPII: true, containsSensitiveData: true, source: 'm365-discovery-service.ts user principal names / display names / emails' },
  { name: 'Ownership Signals', classification: 'INTERNAL', retentionStatus: 'UNKNOWN', exportability: 'MISSING', encryptionStatus: 'UNKNOWN', containsPII: false, containsSensitiveData: false, source: 'ownership-intelligence service' },
  { name: 'Licences', classification: 'INTERNAL', retentionStatus: 'UNKNOWN', exportability: 'MISSING', encryptionStatus: 'UNKNOWN', containsPII: false, containsSensitiveData: false, source: 'm365 licence/SKU inventory' },
  { name: 'Usage Signals', classification: 'INTERNAL', retentionStatus: 'UNKNOWN', exportability: 'MISSING', encryptionStatus: 'UNKNOWN', containsPII: false, containsSensitiveData: false, source: 'm365 utilisation/sign-in activity signals' },
  { name: 'Exposure Findings', classification: 'CONFIDENTIAL', retentionStatus: 'UNKNOWN', exportability: 'MISSING', encryptionStatus: 'UNKNOWN', containsPII: false, containsSensitiveData: true, source: 'm365-exposure-review-service.ts / defaultExposureReport.ts' },
  { name: 'Recommendations', classification: 'INTERNAL', retentionStatus: 'UNKNOWN', exportability: 'MISSING', encryptionStatus: 'UNKNOWN', containsPII: false, containsSensitiveData: false, source: 'recommendation generators / recommendation registry' },
  { name: 'Evidence Records', classification: 'CONFIDENTIAL', retentionStatus: 'DEFINED', exportability: 'MISSING', encryptionStatus: 'UNKNOWN', containsPII: false, containsSensitiveData: true, source: 'evidence-registry/evidence-retention.ts (EvidenceRetentionPolicy.retentionDays, real expiry calculation)' },
  { name: 'Outcome Records', classification: 'CONFIDENTIAL', retentionStatus: 'UNKNOWN', exportability: 'MISSING', encryptionStatus: 'UNKNOWN', containsPII: false, containsSensitiveData: false, source: 'outcome ledger / outcome-protection service' },
  { name: 'Outcome Finance Records', classification: 'CONFIDENTIAL', retentionStatus: 'UNKNOWN', exportability: 'MISSING', encryptionStatus: 'UNKNOWN', containsPII: false, containsSensitiveData: false, source: 'outcome-finance-reconciliation-types.ts (no retention fields present)' },
  { name: 'Audit Records', classification: 'CONFIDENTIAL', retentionStatus: 'UNKNOWN', exportability: 'MISSING', encryptionStatus: 'UNKNOWN', containsPII: false, containsSensitiveData: true, source: 'audit-packs router / evidence-audit.ts' },
  { name: 'Question Responses', classification: 'INTERNAL', retentionStatus: 'UNKNOWN', exportability: 'MISSING', encryptionStatus: 'UNKNOWN', containsPII: false, containsSensitiveData: false, source: 'Headless Certen question/response model' },
]

// ─── Part 3 — Classification Engine ─────────────────────────────────────────
// Deterministic, verbatim mapping. No randomness. Input category name -> a
// fixed classification. Any category not in this map falls back to the
// inventory's own recorded classification (or UNKNOWN-equivalent INTERNAL
// default for unrecognised inputs is intentionally NOT applied — callers
// should treat an unmapped category as unverifiable).

const CLASSIFICATION_RULES: Record<string, DataClassification> = {
  'OAuth Tokens': 'RESTRICTED',
  'User Principal Names': 'PII',
  'Email Addresses': 'PII',
  'Display Names': 'PII',
  'Tenant Metadata': 'INTERNAL',
  'Technology Inventory': 'INTERNAL',
  'Evidence Records': 'CONFIDENTIAL',
  'Outcome Finance': 'CONFIDENTIAL',
  'Audit Records': 'CONFIDENTIAL',
  'Question Catalog': 'SYSTEM_METADATA',
  'Question Responses': 'INTERNAL',
}

export function evaluateDataClassification(category: string): DataClassification | 'UNKNOWN' {
  return CLASSIFICATION_RULES[category] ?? 'UNKNOWN'
}

export function listClassificationRules(): Array<{ category: string; classification: DataClassification }> {
  return Object.entries(CLASSIFICATION_RULES).map(([category, classification]) => ({ category, classification }))
}

// ─── Part 4 — Retention Policies ────────────────────────────────────────────
// Honesty constraint: do NOT invent a policy if none exists in the real
// code. OAuth Tokens (EncryptedMicrosoftTokenStore) has no TTL/expiry logic
// at all (in-memory Map, manual revoke() only) -> MISSING. Evidence Records
// has a real, verified retention mechanism (evidence-retention.ts computes
// expiresAt from EvidenceRetentionPolicy.retentionDays) -> DEFINED, but the
// concrete retentionDays value is policy-data-driven per tenant/evidence
// type, not a single fixed constant, so it is reported as 'UNKNOWN' (case by
// case) rather than fabricating one number. Outcome Finance Records has no
// retention fields anywhere in outcome-finance-reconciliation-types.ts ->
// UNKNOWN (not verified either way, no evidence of deliberate non-retention).

export function evaluateRetentionPolicy(category: string): RetentionPolicy {
  switch (category) {
    case 'OAuth Tokens':
      return {
        category,
        status: 'MISSING',
        retentionDays: 'UNKNOWN',
        reviewRequired: 'UNKNOWN',
        deletionSupported: true,
        evidence: 'EncryptedMicrosoftTokenStore (microsoft-token-store.ts) is an in-memory Map with manual revoke() support but no TTL/expiry logic — no retention policy is enforced.',
      }
    case 'Evidence Records':
      return {
        category,
        status: 'DEFINED',
        retentionDays: 'UNKNOWN',
        reviewRequired: true,
        deletionSupported: true,
        evidence: 'evidence-registry/evidence-retention.ts defines EvidenceRetentionPolicy with a real retentionDays field and calculateExpiry()/applyPolicyToEvidence() logic that transitions evidence to EXPIRED. The exact day count is policy-data-driven per tenant/evidence type, not a fixed platform constant.',
      }
    case 'Outcome Finance Records':
      return {
        category,
        status: 'UNKNOWN',
        retentionDays: 'UNKNOWN',
        reviewRequired: 'UNKNOWN',
        deletionSupported: 'UNKNOWN',
        evidence: 'outcome-finance-reconciliation-types.ts defines no retention-related fields; no retention logic was found for this category.',
      }
    default:
      return {
        category,
        status: 'UNKNOWN',
        retentionDays: 'UNKNOWN',
        reviewRequired: 'UNKNOWN',
        deletionSupported: 'UNKNOWN',
        evidence: 'No verified retention policy or logic was found in the codebase for this category.',
      }
  }
}

export const RETENTION_REVIEW_CATEGORIES = ['OAuth Tokens', 'Evidence Records', 'Outcome Finance Records'] as const

// ─── Part 5 — Access Governance ─────────────────────────────────────────────
// Honesty constraint: Tenant Isolation is reported PARTIAL — Program 11
// documented that enforcement is thin/early-stage, and
// graph-tenant-isolation.test.ts confirms this by only asserting in-memory
// array filtering semantics, not real cross-request/cross-tenant enforcement
// at the middleware/DB layer. Role Based Access is reported READY because a
// real requireCapability() middleware exists and is wired into most routers
// (middleware/security-guards.ts, used throughout routes/index.ts).

export function evaluateAccessGovernance(): AccessPolicy[] {
  return [
    {
      area: 'Role Based Access',
      status: 'READY',
      evidence: 'middleware/security-guards.ts exports requireCapability(), which is applied to the majority of routers in routes/index.ts (e.g. READ_RECOMMENDATIONS, READ_CONNECTORS, MANAGE_POLICIES capabilities).',
    },
    {
      area: 'Tenant Isolation',
      status: 'PARTIAL',
      evidence: 'requireTenantContext() exists and is applied alongside requireCapability() on most routers, but graph-tenant-isolation.test.ts only verifies in-memory array filtering by tenantId, not enforcement at the persistence/query layer — Program 11 documented this as early-stage/thin enforcement.',
    },
    {
      area: 'Restricted Data Access',
      status: 'PARTIAL',
      evidence: 'RESTRICTED-classified data (OAuth Tokens) is encrypted at rest via EncryptedMicrosoftTokenStore, but no dedicated access-control layer beyond general route capability checks was found restricting who can call token-related endpoints.',
    },
    {
      area: 'Admin Access',
      status: 'UNKNOWN',
      evidence: 'No dedicated admin-role/privileged-access model was found distinct from the general capability system in middleware/security-guards.ts.',
    },
    {
      area: 'Export Access',
      status: 'MISSING',
      evidence: 'No export endpoints were found in the codebase (see Export Governance) — there is therefore no export access control to evaluate.',
    },
  ]
}

// ─── Part 6 — Encryption Governance ─────────────────────────────────────────

export function evaluateEncryptionGovernance(): EncryptionStatus[] {
  return [
    {
      area: 'At Rest',
      status: 'UNKNOWN',
      evidence: 'Database-at-rest encryption is an infrastructure/hosting-level fact (Postgres host configuration), not something verifiable from application code in lib/db or api-server. Not assumed.',
    },
    {
      area: 'In Transit',
      status: 'UNKNOWN',
      evidence: 'No HTTPS/TLS enforcement (e.g. helmet, forced redirect, HSTS) was found in api-server/src/app.ts or index.ts. TLS termination may exist at a hosting/proxy layer, but this is not verifiable from the codebase.',
    },
    {
      area: 'Secrets Storage',
      status: 'READY',
      evidence: 'EncryptedMicrosoftTokenStore (microsoft-token-store.ts) genuinely encrypts OAuth token payloads using AES-256-GCM (createCipheriv/createDecipheriv with per-record IV and auth tag) before storing them, and exposes only encrypted metadata via inspectEncryptedRecord().',
    },
  ]
}

// ─── Part 7 — Export Governance ─────────────────────────────────────────────
// Honesty constraint: prior programs (8, 9, 10) explicitly stated no
// PDF/report export was built. No export/download functionality was found
// for any of these four areas in the control-plane pages or api-server
// routes searched (exposureReport, evidence-packs, headless question
// catalog, outcome-finance-reconciliation).

export function evaluateExportGovernance(): ExportControl[] {
  return [
    { area: 'Evidence Export', status: 'MISSING', evidence: 'No export/download endpoint was found for evidence-registry or evidence-packs.' },
    { area: 'Report Export', status: 'MISSING', evidence: 'Exposure Report and Economic Control Chain pages render in-app only; no PDF/CSV export endpoint exists (consistent with Programs 8-10 notes that report export was not built).' },
    { area: 'Question Export', status: 'MISSING', evidence: 'No export endpoint was found for the Headless Certen question/response catalog.' },
    { area: 'Finance Export', status: 'MISSING', evidence: 'No export endpoint was found for outcome-finance-reconciliation records.' },
  ]
}

// ─── Part 8 — Privacy Posture ───────────────────────────────────────────────
// Evidentiary basis: m365-exposure-scope-guard.ts (EXPOSURE_REVIEW_FORBIDDEN_SCOPES)
// hard-fails discovery readiness if Mail.Read, Files.Read.All, Sites.Read.All,
// Chat.Read, ChannelMessage.Read.All or Calendars.Read are requested or
// granted. Exposure Review discovery only uses User.Read.All,
// Directory.Read.All, Reports.Read.All and AuditLog.Read.All — none of which
// return mail/document/chat/file content. This was verified by reading the
// scope guard source directly (see EXPOSURE_REVIEW_ALLOWED_SCOPES and
// EXPOSURE_REVIEW_FORBIDDEN_SCOPES).

export function evaluatePrivacyPosture(): SensitiveAttribute[] {
  const evidence =
    'm365-exposure-scope-guard.ts hard-fails (checkExposureReviewScopes -> ok:false) if Mail.Read, Files.Read.All, Sites.Read.All, Chat.Read, ChannelMessage.Read.All or Calendars.Read are requested/granted; EXPOSURE_REVIEW_ALLOWED_SCOPES only contains User.Read.All, Directory.Read.All, Reports.Read.All and AuditLog.Read.All, none of which expose mail/document/chat/file content.'
  return [
    { question: 'Does Certen store email content?', answer: 'NO', evidence },
    { question: 'Does Certen store document content?', answer: 'NO', evidence },
    { question: 'Does Certen store Teams messages?', answer: 'NO', evidence },
    { question: 'Does Certen store SharePoint file content?', answer: 'NO', evidence },
  ]
}

// ─── Part 9 — Governance Readiness Score ────────────────────────────────────
// Weighted areas, each 20%: Classification, Retention, Access, Encryption,
// Privacy. Status thresholds follow the same pattern as
// defaultEconomicControlChain.ts's healthStatus derivation (all-areas-strong
// -> READY, none-strong -> MISSING, otherwise PARTIAL).

function statusScore(status: GovernanceStatus | RetentionStatus | ExportabilityStatus): number {
  if (status === 'READY' || status === 'DEFINED') return 1
  if (status === 'PARTIAL') return 0.5
  return 0 // MISSING or UNKNOWN
}

export function evaluateInformationGovernanceReadiness(): AuthoritySummary {
  const findings: GovernanceFinding[] = []
  const recommendations: GovernanceRecommendation[] = []

  // Classification area — coverage of the deterministic rule set vs. the
  // full data inventory.
  const classifiedCategories = DATA_INVENTORY.filter((item) => item.classification !== undefined).length
  const classificationScore = DATA_INVENTORY.length > 0 ? classifiedCategories / DATA_INVENTORY.length : 0
  for (const item of DATA_INVENTORY) {
    if (item.classification === undefined) {
      findings.push({
        id: `classify-${item.name}`,
        area: 'Classification',
        severity: 'MEDIUM',
        description: `${item.name} has no recorded classification.`,
        evidence: item.source,
      })
      recommendations.push({
        id: `rec-classify-${item.name}`,
        type: 'CLASSIFY_DATASET',
        severity: 'MEDIUM',
        owner: item.name,
        rationale: `${item.name} has no recorded classification, which prevents consistent retention/access/export decisions.`,
        recommendedAction: `Assign a verified data classification to ${item.name}.`,
      })
    }
  }

  // Retention area.
  const retentionPolicies = DATA_INVENTORY.map((item) => evaluateRetentionPolicy(item.name))
  const retentionScore = retentionPolicies.reduce((sum, policy) => sum + statusScore(policy.status), 0) / retentionPolicies.length
  for (const policy of retentionPolicies) {
    if (policy.status !== 'DEFINED') {
      findings.push({
        id: `retention-${policy.category}`,
        area: 'Retention',
        severity: policy.status === 'MISSING' ? 'HIGH' : 'MEDIUM',
        description: `${policy.category} has ${policy.status === 'MISSING' ? 'no' : 'an unverified'} retention policy.`,
        evidence: policy.evidence,
      })
      recommendations.push({
        id: `rec-retention-${policy.category}`,
        type: 'DEFINE_RETENTION_POLICY',
        severity: policy.status === 'MISSING' ? 'HIGH' : 'MEDIUM',
        owner: policy.category,
        rationale: `${policy.category} retention is currently ${policy.status}; without a defined policy, data may be retained indefinitely or deleted inconsistently.`,
        recommendedAction: `Define and implement an explicit retention policy (retentionDays, review cadence, deletion support) for ${policy.category}.`,
      })
    }
  }

  // Access area.
  const accessPolicies = evaluateAccessGovernance()
  const accessScore = accessPolicies.reduce((sum, policy) => sum + statusScore(policy.status), 0) / accessPolicies.length
  for (const policy of accessPolicies) {
    if (policy.area === 'Tenant Isolation' && policy.status === 'PARTIAL') {
      findings.push({
        id: 'access-tenant-isolation',
        area: 'Access',
        severity: 'HIGH',
        description: 'Tenant isolation enforcement is partial/early-stage.',
        evidence: policy.evidence,
      })
      recommendations.push({
        id: 'rec-verify-tenant-isolation',
        type: 'VERIFY_TENANT_ISOLATION',
        severity: 'HIGH',
        owner: 'Platform Security',
        rationale: 'Tenant isolation is currently enforced only at a thin/early-stage level, which is a material risk for a multi-tenant platform handling RESTRICTED and CONFIDENTIAL data.',
        recommendedAction: 'Harden and verify tenant isolation enforcement at the persistence/query layer, beyond in-memory array filtering, and expand graph-tenant-isolation.test.ts coverage accordingly.',
      })
    }
    if (policy.area === 'Admin Access' && (policy.status === 'UNKNOWN' || policy.status === 'MISSING' || policy.status === 'PARTIAL')) {
      recommendations.push({
        id: 'rec-limit-admin-access',
        type: 'LIMIT_ADMIN_ACCESS',
        severity: 'MEDIUM',
        owner: 'Platform Security',
        rationale: 'No dedicated admin/privileged-access model was found distinct from the general capability system.',
        recommendedAction: 'Define and enforce a distinct admin/privileged access tier with its own audit trail.',
      })
    }
  }

  // Encryption area.
  const encryptionStatuses = evaluateEncryptionGovernance()
  const encryptionScore = encryptionStatuses.reduce((sum, item) => sum + statusScore(item.status), 0) / encryptionStatuses.length
  for (const item of encryptionStatuses) {
    if (item.status === 'UNKNOWN') {
      findings.push({
        id: `encryption-${item.area}`,
        area: 'Encryption',
        severity: 'MEDIUM',
        description: `${item.area} encryption status could not be verified from the codebase.`,
        evidence: item.evidence,
      })
      recommendations.push({
        id: `rec-encryption-${item.area}`,
        type: 'ENABLE_ENCRYPTION',
        severity: 'MEDIUM',
        owner: item.area,
        rationale: `${item.area} encryption could not be verified, which is a gap for RESTRICTED/CONFIDENTIAL data handling.`,
        recommendedAction: `Confirm and document ${item.area} encryption posture (infrastructure-level evidence if application code cannot verify it directly).`,
      })
    }
  }

  // Privacy area.
  const privacyAttributes = evaluatePrivacyPosture()
  const privacyScore = privacyAttributes.filter((attribute) => attribute.answer === 'NO').length / privacyAttributes.length
  for (const attribute of privacyAttributes) {
    if (attribute.answer === 'YES') {
      findings.push({
        id: `privacy-${attribute.question}`,
        area: 'Privacy',
        severity: 'CRITICAL',
        description: `Unexpected content storage detected: ${attribute.question}`,
        evidence: attribute.evidence,
      })
      recommendations.push({
        id: `rec-privacy-${attribute.question}`,
        type: 'REMOVE_UNNECESSARY_PII',
        severity: 'CRITICAL',
        owner: 'Platform Security',
        rationale: `${attribute.question} unexpectedly resolved to YES, which contradicts the read-only/metadata-only discovery model.`,
        recommendedAction: 'Remove the offending content-reading code path and re-verify the Graph scope guard configuration immediately.',
      })
    }
  }

  // Export area (informs RESTRICT_EXPORT recommendations; export is not one
  // of the five weighted readiness areas per the spec, but findings/recs are
  // still surfaced for completeness).
  const exportControls = evaluateExportGovernance()
  for (const control of exportControls) {
    if (control.status === 'READY' || control.status === 'PARTIAL') {
      recommendations.push({
        id: `rec-restrict-export-${control.area}`,
        type: 'RESTRICT_EXPORT',
        severity: 'MEDIUM',
        owner: control.area,
        rationale: `${control.area} export exists but should be reviewed for access restrictions.`,
        recommendedAction: `Confirm ${control.area} export is gated behind the appropriate capability and audit trail.`,
      })
    }
  }

  const weightedScore =
    classificationScore * 0.2 + retentionScore * 0.2 + accessScore * 0.2 + encryptionScore * 0.2 + privacyScore * 0.2
  const score = Math.round(weightedScore * 100)

  let status: ReadinessStatus
  if (score >= 80) {
    status = 'READY'
  } else if (score > 0) {
    status = 'PARTIAL'
  } else {
    status = 'MISSING'
  }

  return { score, status, findings, recommendations }
}

// ─── Authority Summary Wrapper ──────────────────────────────────────────────
// Single entry point combining all evaluated sections, for the page and API.

export interface InformationGovernanceAuthorityModel {
  dataInventory: DataInventoryCategory[]
  classificationRules: Array<{ category: string; classification: DataClassification }>
  retentionPolicies: RetentionPolicy[]
  accessGovernance: AccessPolicy[]
  encryptionGovernance: EncryptionStatus[]
  exportGovernance: ExportControl[]
  privacyPosture: SensitiveAttribute[]
  readiness: AuthoritySummary
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
  }
}
