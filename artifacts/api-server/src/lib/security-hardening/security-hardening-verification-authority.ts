// Program 14B — Security Hardening Authority (api-server canonical copy).
//
// Completes the Enterprise Trust Platform phase. Programs 13/14A/14A-R/14A-C
// answered "can tenants see each other's data?" This authority answers a
// different question: "can attackers abuse the platform?" It evaluates
// encryption posture, secrets management, token lifecycle, audit integrity,
// retention controls, and threat exposure (STRIDE), and reports an honest
// verdict per domain.
//
// Honest-data bias (non-negotiable, per Program 14B spec):
//   1. Do not mark VERIFIED without evidence.
//   2. Do not assume encryption exists because a library is imported.
//   3. Do not assume secrets are secure because environment variables exist.
//   4. Do not assume token lifecycle controls exist because refresh tokens exist.
//   5. Do not assume audit integrity because audit tables exist.
//   6. If evidence is missing, classify UNKNOWN.
//   7. If a material weakness exists, classify FAILED.
//   8. Do not modify code merely to achieve a better classification.
//   9. Verification must remain independent of remediation.
//  10. Findings must reflect actual repository evidence.
//
// This module is verification-only. It does not patch the weak key
// derivation, hardcoded fallback keys, or unwired tamper-hash primitives it
// finds — those are reported as findings with file/symbol citations so they
// can be fixed deliberately in a future remediation program.
//
// Program 14B-R (Security Hardening Remediation) subsequently fixed three of
// the CRITICAL/HIGH findings reported below: executive-proof-pack tenant
// spoofing (thr-1), unwired audit/approval tamper-evidence hashes (aud-1),
// and hardcoded fallback encryption keys (enc-1). Per Program 14B-R's
// non-negotiable rules, this file is updated to reflect the post-remediation
// evidence honestly — remaining, unfixed findings (enc-2/enc-3/enc-4, aud-2/
// aud-3, thr-2, and the UNKNOWN secrets-management domain) are left exactly
// as classified; platformVerdictFrom() below is unchanged.

export type SecurityHardeningVerdict = 'VERIFIED' | 'PARTIAL' | 'UNKNOWN' | 'FAILED' | 'NOT_APPLICABLE'

export interface SecurityFinding {
  id: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  description: string
  affectedFiles: string[]
  remediation: string
}

export interface SecurityEvidence {
  filePath: string
  symbol?: string
  description: string
  evidenceType: 'CODE_INSPECTION' | 'TEST_PROOF' | 'STATIC_ANALYSIS' | 'ABSENCE_OF_EVIDENCE'
  confidence: number
}

export interface SecurityHardeningDomainResult {
  domain: string
  verdict: SecurityHardeningVerdict
  confidence: number
  findings: SecurityFinding[]
  evidence: SecurityEvidence[]
}

export interface SecurityHardeningAuthorityResult {
  authority: 'SECURITY_HARDENING_AUTHORITY'
  generatedAt: string
  platformVerdict: 'VERIFIED' | 'PARTIAL' | 'UNKNOWN' | 'FAILED'
  confidence: number
  domains: SecurityHardeningDomainResult[]
  criticalFindings: SecurityFinding[]
}

const GENERATED_AT = '2026-06-22T00:00:00.000Z'

function evidence(
  filePath: string,
  description: string,
  evidenceType: SecurityEvidence['evidenceType'],
  confidence: number,
  symbol?: string,
): SecurityEvidence {
  return { filePath, symbol, description, evidenceType, confidence }
}

function finding(
  id: string,
  severity: SecurityFinding['severity'],
  description: string,
  affectedFiles: string[],
  remediation: string,
): SecurityFinding {
  return { id, severity, description, affectedFiles, remediation }
}

export const SECURITY_HARDENING_DOMAIN_IDS = [
  'encryption-posture',
  'secrets-management',
  'token-lifecycle',
  'audit-integrity',
  'retention-controls',
  'threat-model',
] as const

export type SecurityHardeningDomainId = (typeof SECURITY_HARDENING_DOMAIN_IDS)[number]

// ─── Domain 1 — Encryption Posture ──────────────────────────────────────────
// Real evidence: five connector credential stores (Microsoft, ServiceNow,
// ERP, Flexera, Procurement-AP) all use AES-256-GCM with a fresh random IV
// per record and a real auth tag — genuine symmetric encryption, not a
// no-op. But every one of them derives its key via a single SHA-256 hash of
// an env-var string (`createHash('sha256').update(secret).digest()`), which
// is NOT a real KDF (no salt, no PBKDF2/HKDF/scrypt/Argon2), and every one
// falls back to a hardcoded, repository-visible literal string if the env
// var is unset, with no warning or error — meaning encryption can silently
// run with a predictable, publicly-known key in any environment that forgets
// to set the variable, including production. ServiceNow, ERP, and
// Procurement-AP additionally reuse the exact same
// PRODUCTION_CONNECTOR_CREDENTIAL_KEY across three independent stores. None
// of the five stores has any key-rotation capability.

function verifyEncryptionPosture(): SecurityHardeningDomainResult {
  const ev: SecurityEvidence[] = [
    evidence('src/lib/microsoft-auth/microsoft-token-store.ts', 'EncryptedMicrosoftTokenStore encrypts the full token payload with AES-256-GCM, a fresh randomBytes(12) IV per record, and verifies via getAuthTag()/setAuthTag() on decrypt — genuine authenticated encryption, not a placeholder.', 'CODE_INSPECTION', 0.8, 'EncryptedMicrosoftTokenStore.store'),
    evidence('src/lib/microsoft-auth/microsoft-token-store.ts', 'keyFromSecret(secret) = createHash("sha256").update(secret).digest() — a single SHA-256 hash of an env-var string. This is not a key-derivation function: no salt, no PBKDF2/HKDF/scrypt/Argon2, no iteration count. Any two deployments sharing the same env-var value derive the identical key.', 'CODE_INSPECTION', 0.75, 'keyFromSecret'),
    evidence('src/lib/security/encryption-key-resolution.ts', 'Program 14B-R fix: resolveEncryptionKeySecret(envVarName, testOnlyFallback) throws (`"${envVarName} must be set in production..."`) when NODE_ENV === "production" and the env var is unset — production no longer silently substitutes a fallback literal. Non-production modes may still return an explicit, isolated testOnlyFallback so local dev/test continues to work.', 'CODE_INSPECTION', 0.85, 'resolveEncryptionKeySecret'),
    evidence('src/lib/microsoft-auth/microsoft-token-store.ts', 'Constructor default parameter now reads `encryptionSecret = resolveEncryptionKeySecret("MICROSOFT_TOKEN_ENCRYPTION_KEY", "local-dev-encryption-boundary")` — evaluated per-instantiation, so a missing key throws at `new EncryptedMicrosoftTokenStore()` call time in production (a credential-operation failure), rather than silently encrypting with the literal.', 'CODE_INSPECTION', 0.8),
    evidence('src/tests/encryption-key-fail-closed.test.ts', 'Regression test suite (6/6 passing, executed this program) proves: production + missing key throws for resolveEncryptionKeySecret() directly and for `new EncryptedMicrosoftTokenStore()`; production + present key returns the real value; non-production + missing key still allows the explicit test-only fallback; encryption/decryption round-trips correctly when a key is present; and none of the five credential-store files match the old `process.env.X_KEY ?? "literal"` pattern.', 'TEST_PROOF', 0.85),
    evidence('src/lib/production-connectors/servicenow/servicenow-auth.ts', 'Module-level `key = createHash("sha256").update(resolveEncryptionKeySecret("PRODUCTION_CONNECTOR_CREDENTIAL_KEY", "local-production-connector-key")).digest()` — the fallback literal is now only reachable in non-production; in production a missing env var throws at module-import time (a startup failure) instead of silently deriving a key from the literal.', 'CODE_INSPECTION', 0.75),
    evidence('src/lib/production-connectors/erp/erp-auth.ts', 'Same fix applied: `createHash("sha256").update(resolveEncryptionKeySecret("PRODUCTION_CONNECTOR_CREDENTIAL_KEY", "local-production-connector-key")).digest()` — this is still the SAME env var and SAME non-production fallback string as servicenow-auth.ts (enc-3, below, is unchanged and still open), but production now fails closed.', 'CODE_INSPECTION', 0.75),
    evidence('src/lib/production-connectors/procurement-ap/procurement-ap-auth.ts', 'Same fix applied: `createHash("sha256").update(resolveEncryptionKeySecret("PRODUCTION_CONNECTOR_CREDENTIAL_KEY", "local-production-connector-key")).digest()` — fails closed in production; still shares its key with ServiceNow and ERP (enc-3 unresolved).', 'CODE_INSPECTION', 0.75),
    evidence('src/lib/production-connectors/flexera/flexera-auth.ts', '`createHash("sha256").update(resolveEncryptionKeySecret("FLEXERA_CREDENTIAL_KEY", "local-flexera-credential-key")).digest()` — own env var, fails closed in production; the weak SHA-256-only KDF pattern (enc-2) is unchanged and still open.', 'CODE_INSPECTION', 0.75),
    evidence('src/lib/production-connectors/entra/, src/lib/production-connectors/m365/', 'These connectors declare `storesRawCredentials: false` metadata and have no independent credential store — real M365/Entra token storage is the Microsoft store above, not a separate plaintext path. Correctly out of scope for a duplicate finding, not silently ignored.', 'CODE_INSPECTION', 0.6),
    evidence('src/lib/production-connectors/', 'No AWS, Snowflake, Databricks, or Atlassian connector-credential module exists anywhere in this directory (confirmed by directory enumeration: only entra/, erp/, flexera/, m365/, procurement-ap/, servicenow/ exist) — there is no encryption posture to evaluate for these named systems because the code does not exist, not because it was found secure.', 'ABSENCE_OF_EVIDENCE', 0.7),
  ]
  const findings: SecurityFinding[] = [
    finding('enc-1', 'LOW', '[Program 14B-R: REMEDIATED] All five credential stores now derive their key via resolveEncryptionKeySecret(), which throws in production when the env var is unset instead of silently substituting the hardcoded literal; the literal is only reachable as an explicit, isolated fallback gated on non-production NODE_ENV. Verified by src/tests/encryption-key-fail-closed.test.ts (6/6 passing), including an end-to-end check that `new EncryptedMicrosoftTokenStore()` itself throws in production with the key unset.', ['src/lib/security/encryption-key-resolution.ts', 'src/lib/microsoft-auth/microsoft-token-store.ts', 'src/lib/production-connectors/servicenow/servicenow-auth.ts', 'src/lib/production-connectors/erp/erp-auth.ts', 'src/lib/production-connectors/procurement-ap/procurement-ap-auth.ts', 'src/lib/production-connectors/flexera/flexera-auth.ts'], 'Remediated. Remaining: consider applying the same fail-closed env-var pattern to any future credential-bearing connector.'),
    finding('enc-2', 'MEDIUM', 'All five credential stores derive their AES key via a single SHA-256 hash of a secret string, which is not a real key-derivation function — no salt, no PBKDF2/HKDF/scrypt/Argon2, no iteration count.', ['src/lib/microsoft-auth/microsoft-token-store.ts', 'src/lib/production-connectors/servicenow/servicenow-auth.ts', 'src/lib/production-connectors/erp/erp-auth.ts', 'src/lib/production-connectors/procurement-ap/procurement-ap-auth.ts', 'src/lib/production-connectors/flexera/flexera-auth.ts'], 'Derive encryption keys with a real KDF (HKDF or scrypt) using a per-deployment salt, rather than a bare SHA-256 hash of an env-var string.'),
    finding('enc-3', 'MEDIUM', 'ServiceNow, ERP, and Procurement-AP credential stores all read the same PRODUCTION_CONNECTOR_CREDENTIAL_KEY env var and the same hardcoded fallback literal, so a key compromise in one store compromises all three.', ['src/lib/production-connectors/servicenow/servicenow-auth.ts', 'src/lib/production-connectors/erp/erp-auth.ts', 'src/lib/production-connectors/procurement-ap/procurement-ap-auth.ts'], 'Give each credential store its own independent encryption key/env var so compromise of one connector does not expose the others.'),
    finding('enc-4', 'LOW', 'None of the five credential stores supports key rotation — there is no mechanism to re-encrypt existing records under a new key.', ['src/lib/microsoft-auth/microsoft-token-store.ts', 'src/lib/production-connectors/servicenow/servicenow-auth.ts', 'src/lib/production-connectors/erp/erp-auth.ts', 'src/lib/production-connectors/procurement-ap/procurement-ap-auth.ts', 'src/lib/production-connectors/flexera/flexera-auth.ts'], 'Add a key-rotation path (versioned key id stored alongside ciphertext, re-encrypt-on-read or batch re-encryption job).'),
  ]
  // Program 14B-R: enc-1 (HIGH, fallback keys) is remediated with code fix +
  // regression test + evidence. enc-2/enc-3/enc-4 remain open. Domain stays
  // PARTIAL — meaningful remediation occurred but the domain is not fully
  // VERIFIED while unresolved findings remain.
  return { domain: 'encryption-posture', verdict: 'PARTIAL', confidence: 0.75, findings, evidence: ev }
}

// ─── Domain 2 — Secrets Management ──────────────────────────────────────────
// Real evidence: every encryption-key env var documented in Domain 1 has a
// hardcoded plaintext fallback literal committed directly in source — those
// fallbacks ARE secrets-management findings, not just encryption findings,
// because they mean a "secret" can in practice be a known, static string.
// The pino logger in app.ts redacts a real but partial set of field names;
// anything routed through console.log/error directly, or any field name not
// in that list, is not covered by the same protection.

function verifySecretsManagement(): SecurityHardeningDomainResult {
  const ev: SecurityEvidence[] = [
    evidence('src/app.ts', 'Global pino HTTP logger configures `serializers` that redact specific named fields (confirmed present near the top of app.ts) — this is a real, working redaction mechanism, not a documentation-only claim, but it is an explicit allow/deny list: any field name not enumerated, or any secret value logged via a path other than the pino request/response serializer (e.g. a raw console.log or an error message string), is not covered.', 'CODE_INSPECTION', 0.55, 'pino logger serializers'),
    evidence('src/lib/microsoft-auth/microsoft-token-store.ts, src/lib/production-connectors/*/​*-auth.ts', 'The fallback encryption-key literals ("local-dev-encryption-boundary", "local-production-connector-key", "local-flexera-credential-key") are themselves hardcoded secret values committed in plaintext source, which is the exact "hardcoded values" secret-source category called out by this domain.', 'CODE_INSPECTION', 0.75),
    evidence('src/lib/production-connectors/*/​*-auth.ts', 'Every production-connector auth service reads its API token / client secret / service-account JSON from a `credentials` object passed in at connect-time (sourced ultimately from the route layer / req.body), not from process.env directly — meaning connector-level secrets are caller-supplied per tenant, not global env vars; this is a different (and narrower) exposure surface than the global encryption keys, and was not independently re-verified for log exposure in this pass.', 'CODE_INSPECTION', 0.5),
    evidence('repo-wide', 'No repository-wide static check (lint rule, secret scanner, pre-commit hook) was found that would catch a new hardcoded secret or a console.log of a token/credential variable being introduced in the future — absence of such tooling was not directly disproven exhaustively in this pass, so this is reported as missing evidence rather than a confirmed FAILED state.', 'ABSENCE_OF_EVIDENCE', 0.4),
  ]
  const findings: SecurityFinding[] = [
    finding('sec-1', 'MEDIUM', '[Program 14B-R: PARTIALLY REMEDIATED] Hardcoded plaintext fallback secret literals still exist in source for five credential stores, but resolveEncryptionKeySecret() now gates them behind non-production NODE_ENV and throws in production instead of using them — severity downgraded from HIGH because production can no longer silently run on a known literal, but the literals themselves remain committed in source for dev/test use.', ['src/lib/security/encryption-key-resolution.ts', 'src/lib/microsoft-auth/microsoft-token-store.ts', 'src/lib/production-connectors/servicenow/servicenow-auth.ts', 'src/lib/production-connectors/erp/erp-auth.ts', 'src/lib/production-connectors/procurement-ap/procurement-ap-auth.ts', 'src/lib/production-connectors/flexera/flexera-auth.ts'], 'Consider moving dev/test-only fallback literals out of source (e.g. into a .env.example or test fixture) so source contains no secret-shaped literals at all, even gated ones.'),
    finding('sec-2', 'MEDIUM', 'No repository-wide secret-scanning or lint rule was found guarding against future accidental logging of token/credential/secret values outside the pino serializer allow-list.', ['src/app.ts'], 'Add a secret-scanning pre-commit/CI check (e.g. gitleaks) and broaden the pino redaction to a deny-by-default pattern (any key matching /token|secret|password|credential/i) rather than an explicit allow-list of field names.'),
  ]
  return { domain: 'secrets-management', verdict: 'UNKNOWN', confidence: 0.5, findings, evidence: ev }
}

// ─── Domain 3 — Token Lifecycle Management ──────────────────────────────────
// Real evidence: Microsoft has a genuinely complete lifecycle (creation,
// encrypted storage, status update, revoke). ServiceNow/ERP/Procurement-AP/
// Flexera only ever fetch a token per-call (API_TOKEN/BASIC/client_credentials
// grant) with no persisted refresh-token and no revoke/disconnect method —
// there is structurally nothing to "refresh" or "revoke" because no
// refreshable token is ever persisted; this is a real lifecycle gap, not a
// missing feature on top of an otherwise-complete model. Entra/M365 have no
// independent store (redirect to Microsoft's). AWS/Snowflake/Databricks/
// Atlassian connectors do not exist in this repo.

function verifyTokenLifecycle(): SecurityHardeningDomainResult {
  const ev: SecurityEvidence[] = [
    evidence('src/lib/microsoft-auth/microsoft-token-store.ts', 'EncryptedMicrosoftTokenStore.store() creates a credential; getTokenSet()/getConnection() read it tenant-scoped; updateStatus()/revoke() provide explicit lifecycle mutation and termination. This is a structurally complete create→store→read→revoke lifecycle for one connector.', 'CODE_INSPECTION', 0.7, 'EncryptedMicrosoftTokenStore'),
    evidence('src/lib/production-connectors/servicenow/servicenow-auth.ts', 'ServiceNowAuthService.token() has three branches: API_TOKEN (static), BASIC (base64 of stored creds), OAUTH2 (a fresh client_credentials grant fetched per call). None of the three branches persists a refresh token or exposes a revoke/disconnect method — the only "credential" persisted is the original input credentials object, not an OAuth token with a lifecycle.', 'CODE_INSPECTION', 0.7),
    evidence('src/lib/production-connectors/erp/erp-auth.ts', 'ErpAuthService.token() follows the identical pattern (API_TOKEN/SERVICE_ACCOUNT/FILE_EXPORT static, or OAUTH2 client_credentials grant per call) — no refresh-token persistence, no revoke method.', 'CODE_INSPECTION', 0.7),
    evidence('src/lib/production-connectors/procurement-ap/procurement-ap-auth.ts', 'ProcurementApAuthService.token() — same static/OAUTH2-client_credentials-per-call pattern, no refresh persistence, no revoke method on ProcurementApCredentialStore (only save()/get()).', 'CODE_INSPECTION', 0.7),
    evidence('src/lib/production-connectors/flexera/flexera-auth.ts', 'FlexeraAuthService.resolveAccessToken — same static/client_credentials-per-call pattern; flexeraAuthRequirements self-declares `tokenProviderRequiredForLiveCalls: true`, confirming there is no persisted refreshable token, only an externally-supplied token provider per call.', 'CODE_INSPECTION', 0.65),
    evidence('src/routes/production-connectors.ts', '/microsoft/refresh and /microsoft/disconnect routes call oauth.refreshAccessToken(tenant(req), ...) / oauth.revokeOrDisableConnection(tenant(req), ...) — confirms Microsoft is the only connector with route-level refresh/disconnect endpoints; no equivalent /servicenow/refresh, /erp/refresh, /flexera/refresh, or /procurement-ap/refresh route exists because there is no refreshable token to refresh.', 'CODE_INSPECTION', 0.6),
    evidence('src/lib/production-connectors/entra/, src/lib/production-connectors/m365/', 'Both declare `storesRawCredentials: false`; real M365/Entra credential storage is the Microsoft store evaluated above — there is no separate, independent token-lifecycle implementation to evaluate here.', 'CODE_INSPECTION', 0.6),
    evidence('src/lib/production-connectors/', 'No AWS, Snowflake, Databricks, or Atlassian connector exists in this repository, confirmed by directory enumeration — there is no token lifecycle to evaluate for these systems.', 'ABSENCE_OF_EVIDENCE', 0.7),
  ]
  const findings: SecurityFinding[] = [
    finding('tok-1', 'MEDIUM', 'ServiceNow, ERP, Procurement-AP, and Flexera connectors have no refresh-token persistence and no revoke/disconnect capability — a compromised or stale credential for these connectors cannot be remotely revoked through the platform; it can only be removed by deleting the in-memory record.', ['src/lib/production-connectors/servicenow/servicenow-auth.ts', 'src/lib/production-connectors/erp/erp-auth.ts', 'src/lib/production-connectors/procurement-ap/procurement-ap-auth.ts', 'src/lib/production-connectors/flexera/flexera-auth.ts'], 'Add an explicit revoke()/disconnect() method to each of these credential stores, and a corresponding route, mirroring the Microsoft connector pattern, even though these connectors do not use refreshable OAuth tokens.'),
    finding('tok-2', 'LOW', 'No connector store anywhere (including Microsoft) implements active stale-token detection beyond reading an `expiresAt` field passed in at storage time; there is no background sweep that proactively flags or revokes tokens nearing/at expiry.', ['src/lib/microsoft-auth/microsoft-token-store.ts'], 'Add an expiry-aware lookup or scheduled sweep that flags tokens past expiry as REQUIRES_REAUTH rather than relying solely on the caller to check expiresAt.'),
  ]
  return { domain: 'token-lifecycle', verdict: 'PARTIAL', confidence: 0.65, findings, evidence: ev }
}

// ─── Domain 4 — Audit Integrity ─────────────────────────────────────────────
// Real evidence: two tamper-evidence hash primitives exist (auditHash,
// approvalTamperHash) but a direct grep for call sites outside their own
// definition files and outside test files found ZERO production callers —
// these are dead/unwired code, not enforced controls. auditEventsTable has
// no .update()/.delete() call sites anywhere (effectively append-only in
// practice, though not DB-enforced). outcomeLedgerTable and
// evidenceRegistryRecordsTable DO have real .update()/.delete() call sites in
// production code, so any platform-wide "immutable ledger" claim would be
// false for those two tables specifically.

function verifyAuditIntegrity(): SecurityHardeningDomainResult {
  const ev: SecurityEvidence[] = [
    evidence('src/lib/security/audit-integrity.ts', 'auditHash(prevHash, payload) computes a SHA-256 hash chain link — a genuine tamper-evidence primitive (hash-chaining prior state into the next hash).', 'CODE_INSPECTION', 0.6, 'auditHash'),
    evidence('src/lib/audit/audit-service.ts', 'Program 14B-R fix: recordAuditEvent() now queries the most recent row for the same tenant (`ORDER BY id DESC LIMIT 1`), takes its tamperHash as prevHash (or "" for the first event), computes `tamperHash = auditHash(prevHash, deterministicAuditFields(record))`, and persists both prevHash and tamperHash on every inserted row — auditHash now has a real, per-tenant production call site.', 'CODE_INSPECTION', 0.8, 'recordAuditEvent'),
    evidence('src/lib/security/security-controls.ts', 'approvalTamperHash(payload) computes a SHA-256 hash of a payload — a tamper-detection primitive for approval records.', 'CODE_INSPECTION', 0.6, 'approvalTamperHash'),
    evidence('src/lib/governance/execution-approval-service.ts', 'Program 14B-R fix: requestApproval()/approve()/reject() each compute `tamperHash = approvalTamperHash(deterministicApprovalFields(...))` over the resulting decision state and persist it on the row; a new verifyTamperHash() method recomputes the hash from stored fields and compares it to the stored value — approvalTamperHash now has real production call sites across every approval state transition.', 'CODE_INSPECTION', 0.8, 'ExecutionApprovalService'),
    evidence('lib/db/src/schema/auditEvents.ts, lib/db/src/schema/executionApprovals.ts', 'prevHash/tamperHash (auditEvents) and tamperHash (executionApprovals) columns were added to the Drizzle schema (notNull, default \'\') to persist the hash-chain/tamper values computed above.', 'CODE_INSPECTION', 0.7),
    evidence('src/tests/audit-tamper-evidence.test.ts', 'Unit-test suite (5/5 passing, executed this program) proves auditHash/approvalTamperHash are deterministic and stable for equivalent inputs, that mutating the payload changes the hash, that the chain link depends on prevHash, and statically confirms audit-service.ts and execution-approval-service.ts call these primitives.', 'TEST_PROOF', 0.8),
    evidence('src/tests/audit-tamper-evidence-live.test.ts', 'DB-gated integration test (registered in scripts/run-pattern-tests.mjs dbIntegrationTests; not run in this pass without a live Postgres instance — reported as written but not executed, not as proven) exercises real chained inserts, a deliberate out-of-band row mutation via db.update() showing the recomputed hash no longer matches, and ExecutionApprovalService.verifyTamperHash() against real rows.', 'CODE_INSPECTION', 0.5),
    evidence('src/lib/audit/audit-service.ts', 'recordAuditEvent() remains the sole write path for auditEventsTable, and a grep for `.update(` / `.delete(` against auditEventsTable across the repo found no call sites — the table is append-only in practice, though this is still a convention, not a database-level constraint (no immutable/WORM storage, no trigger preventing UPDATE/DELETE). aud-2 remains open.', 'CODE_INSPECTION', 0.55),
    evidence('src/routes/economic-operations.ts, src/lib/evidence-registry/evidence-registry-persistence.ts', 'outcomeLedgerTable and evidenceRegistryRecordsTable both have real, in-use `.update()`/`.delete()` call sites in production code (economic-operations.ts route handlers; evidence-registry-persistence.ts upsert()/deleteTenant()) — these two tables are mutable in practice, so any claim that "the ledger is immutable" must be scoped to auditEventsTable specifically and is false if applied platform-wide.', 'CODE_INSPECTION', 0.6),
    evidence('no application-level reader for auditEventsTable', 'No repository class, query helper, or route handler that reads auditEventsTable with any filter was found anywhere in the codebase (consistent with the prior Program 14A-C finding for this same table) — the evidence-to-audit-to-proof lineage cannot be traced end-to-end for audit events because there is no read path to trace through yet.', 'ABSENCE_OF_EVIDENCE', 0.5),
  ]
  const findings: SecurityFinding[] = [
    finding('aud-1', 'LOW', '[Program 14B-R: REMEDIATED] auditHash is now wired into recordAuditEvent() (per-tenant hash chain, prevHash/tamperHash persisted on every row) and approvalTamperHash is now wired into ExecutionApprovalService.requestApproval()/approve()/reject() with a verifyTamperHash() check. Verified by src/tests/audit-tamper-evidence.test.ts (5/5 passing, unit-level) and src/tests/audit-tamper-evidence-live.test.ts (written, DB-gated, not executed in this pass for lack of a live Postgres instance).', ['src/lib/audit/audit-service.ts', 'src/lib/governance/execution-approval-service.ts', 'src/lib/security/audit-integrity.ts', 'src/lib/security/security-controls.ts'], 'Remediated for the write path. Run src/tests/audit-tamper-evidence-live.test.ts with RUN_DB_INTEGRATION_TESTS=true against a real database to close out end-to-end proof of the persisted hash chain.'),
    finding('aud-2', 'MEDIUM', 'auditEventsTable\'s append-only behaviour is a coding convention (no observed UPDATE/DELETE call sites), not a database-enforced constraint — a future code change could silently introduce a mutation with no schema-level guard to catch it.', ['lib/db/src/schema/auditEvents.ts', 'src/lib/audit/audit-service.ts'], 'Enforce append-only behaviour at the database layer (REVOKE UPDATE/DELETE privileges on the audit table for the application role, or a BEFORE UPDATE/DELETE trigger that raises an error) rather than relying solely on the absence of call sites.'),
    finding('aud-3', 'MEDIUM', 'auditEventsTable has no application-level read path anywhere in the codebase, so action→evidence→audit→proof lineage cannot be verified end-to-end for audit events — only the write side has been confirmed tenant-safe.', ['src/lib/audit/audit-service.ts'], 'Build a tenant-scoped repository/reader for auditEventsTable before claiming any audit-lineage guarantee that depends on reading audit history back.'),
  ]
  // Program 14B-R: aud-1 (CRITICAL) is remediated with a code fix + unit
  // regression test; full end-to-end DB proof (audit-tamper-evidence-live.test.ts)
  // has not been executed in this pass. aud-2/aud-3 remain open (MEDIUM).
  // No CRITICAL finding remains unresolved, so the domain moves FAILED -> PARTIAL,
  // not VERIFIED, since live DB evidence and aud-2/aud-3 are incomplete.
  return { domain: 'audit-integrity', verdict: 'PARTIAL', confidence: 0.7, findings, evidence: ev }
}

// ─── Domain 5 — Retention Controls ──────────────────────────────────────────
// Real evidence: EvidenceRetentionService has real, callable retention logic
// (findApplicablePolicy, calculateExpiry, applyPolicyToEvidence,
// applyPoliciesToTenant) — but it is only invoked when something calls it;
// no scheduler/cron/setInterval wiring or feature flag enabling automatic
// periodic execution was found anywhere in job-registry.ts or elsewhere.
// EXCEPTION_EXPIRY_SWEEP exists as a named job handler but the same
// "is it actually scheduled" question applies. No retention/TTL/cleanup
// logic was found for the credential/token stores from Domain 1 at all.

function verifyRetentionControls(): SecurityHardeningDomainResult {
  const ev: SecurityEvidence[] = [
    evidence('src/lib/evidence-registry/evidence-retention.ts', 'EvidenceRetentionService.calculateExpiry/findApplicablePolicy/applyPolicyToEvidence/applyPoliciesToTenant implement real, working evidence-retention logic (policy lookup by classification+evidenceType, expiry date math, status transition to EXPIRED when a non-legal-hold policy expires) — this is genuine retention logic, not a stub.', 'CODE_INSPECTION', 0.65, 'EvidenceRetentionService'),
    evidence('src/lib/jobs/job-registry.ts', 'EXCEPTION_EXPIRY_SWEEP is registered as a named job handler (`async ({tenantId}) => expireExceptions({tenantId})`), but no setInterval/cron/scheduler invocation of any job handler, and no ENABLE_JOB_SCHEDULER-style flag gating periodic execution, was found in job-registry.ts or elsewhere in the repo — handlers exist to be called, but nothing was found that calls them on a recurring basis.', 'CODE_INSPECTION', 0.55, 'EXCEPTION_EXPIRY_SWEEP'),
    evidence('src/lib/evidence-registry/evidence-retention.ts', 'applyPoliciesToTenant(t) must be explicitly invoked per tenant (e.g. from a route or a job) — no automatic, scheduled invocation of this method was found, meaning a retention policy with an EXPIRE action will not actually take effect unless something calls this method.', 'ABSENCE_OF_EVIDENCE', 0.5),
    evidence('src/lib/microsoft-auth/microsoft-token-store.ts, src/lib/production-connectors/*/​*-auth.ts', 'No TTL, expiry sweep, or retention policy of any kind was found for the encrypted credential/token stores evaluated in Domain 1 — credentials persist indefinitely (in-memory, for the lifetime of the process) with no automatic cleanup.', 'ABSENCE_OF_EVIDENCE', 0.55),
  ]
  const findings: SecurityFinding[] = [
    finding('ret-1', 'MEDIUM', 'Evidence-retention logic (EvidenceRetentionService) is real and correct in isolation, but no scheduler, cron, or recurring job invocation was found that automatically applies it — retention is defined but not demonstrably enforced over time without a manual or external trigger.', ['src/lib/evidence-registry/evidence-retention.ts', 'src/lib/jobs/job-registry.ts'], 'Wire applyPoliciesToTenant() (and EXCEPTION_EXPIRY_SWEEP) into an actual recurring scheduler (cron, interval, or external job runner) and confirm it runs in production, not just that it is callable.'),
    finding('ret-2', 'LOW', 'No retention/TTL/cleanup policy exists for connector credential and token stores (Microsoft, ServiceNow, ERP, Procurement-AP, Flexera) — stale or orphaned credentials persist indefinitely.', ['src/lib/microsoft-auth/microsoft-token-store.ts', 'src/lib/production-connectors/servicenow/servicenow-auth.ts', 'src/lib/production-connectors/erp/erp-auth.ts', 'src/lib/production-connectors/procurement-ap/procurement-ap-auth.ts', 'src/lib/production-connectors/flexera/flexera-auth.ts'], 'Define and enforce a credential/token retention policy (e.g. auto-revoke credentials unused for N days) for each connector credential store.'),
  ]
  return { domain: 'retention-controls', verdict: 'PARTIAL', confidence: 0.55, findings, evidence: ev }
}

// ─── Domain 6 — Threat Model (STRIDE) ───────────────────────────────────────
// Real evidence: executive-proof-packs.ts defines its own local `tenant(req)`
// helper as `req.tenantId ?? req.header('x-tenant-id') ?? 'default'` and
// never imports or calls requireTenantContext() anywhere in the file — so in
// practice, for any request where req.tenantId has not already been set by
// some other middleware, a client can simply set the x-tenant-id header to
// read or export another tenant's proof packs. Rate-limiting middleware
// exists and is wired globally in app.ts, but is in-memory/per-process only
// (documented limitation in the module itself), so it does not protect
// against distributed abuse across multiple instances.

function verifyThreatModel(): SecurityHardeningDomainResult {
  const ev: SecurityEvidence[] = [
    evidence('src/routes/executive-proof-packs.ts', 'Program 14B-R fix: `router.use(requireTenantContext())` is now mounted directly in this file, and the local `tenant(req)` helper was rewritten to read ONLY `req.tenantId` (throwing TENANT_CONTEXT_REQUIRED if absent) — the old `req.tenantId ?? req.header(\'x-tenant-id\') ?? \'default\'` fallback chain no longer exists in the file.', 'CODE_INSPECTION', 0.8, 'tenant(req)'),
    evidence('src/middleware/security-guards.ts', 'requireTenantContext() validates the requested tenantId (query/header) against the authenticated session\'s tenantId/role and only then sets req.tenantId, 403\'ing on mismatch (except PLATFORM_ADMIN) — executive-proof-packs.ts now uses this exact pattern, consistent with the other route files audited in Program 14A.', 'CODE_INSPECTION', 0.75, 'requireTenantContext'),
    evidence('src/tests/executive-proof-packs-tenant-spoofing.test.ts', 'Live-HTTP regression suite (5/5 passing, executed this program) proves all three required scenarios: (1) tenant A\'s own export/list succeeds and is scoped to tenant A; (2) tenant A session + x-tenant-id: tenant-b header on a request is denied 403 TENANT_ACCESS_DENIED; (3) tenant A session + alternate tenant in body/query params is also denied 403 — the server-derived tenant always wins. A PLATFORM_ADMIN-specific test confirms the one legitimate cross-tenant path still works as designed.', 'TEST_PROOF', 0.85),
    evidence('src/app.ts', 'A global `authMiddleware()` runs for all routes — whether it independently guarantees req.tenantId is trustworthy before reaching executive-proof-packs.ts specifically was not re-verified line-by-line in this pass; this finding is reported as a real, re-checkable code-pattern gap (no requireTenantContext call in the file), not as a fully proven live exploit.', 'CODE_INSPECTION', 0.45),
    evidence('src/middleware/rate-limit.ts', 'rateLimitMiddleware(DEFAULT_API_LIMIT) is wired globally in app.ts (`app.use(rateLimitMiddleware(DEFAULT_API_LIMIT))`) — a real, active sliding-window rate limiter exists for all routes, mitigating naive single-process DoS abuse.', 'CODE_INSPECTION', 0.65, 'rateLimitMiddleware'),
    evidence('src/middleware/rate-limit.ts', 'The rate limiter\'s own module comment states its state is an in-memory Map local to the process and explicitly documents that it does NOT share state across replicas in a multi-instance deployment — so it does not protect against distributed abuse spread across multiple instances/processes.', 'CODE_INSPECTION', 0.6),
    evidence('src/lib/audit/audit-service.ts, src/lib/governance/execution-approval-service.ts (Domain 4)', 'Repudiation risk tied to Domain 4 is now reduced: auditHash/approvalTamperHash are wired into the production audit and approval write paths (see aud-1, REMEDIATED), so a mutating action now produces an audit event linked into a verifiable per-tenant hash chain — accountability now extends to "this log cannot have been silently altered" at the write-path level, though aud-2 (no DB-enforced append-only constraint) and aud-3 (no read path) remain open.', 'CODE_INSPECTION', 0.65),
  ]
  const findings: SecurityFinding[] = [
    finding('thr-1', 'LOW', '[Program 14B-R: REMEDIATED] executive-proof-packs.ts now mounts requireTenantContext() and derives tenant identity solely from the server-verified req.tenantId, rejecting any client-supplied x-tenant-id/body/query tenant value that does not match the authenticated session. Verified by src/tests/executive-proof-packs-tenant-spoofing.test.ts (5/5 passing) covering all three required spoofing scenarios plus the PLATFORM_ADMIN cross-tenant case.', ['src/routes/executive-proof-packs.ts'], 'Remediated.'),
    finding('thr-2', 'LOW', 'Denial of Service: the only rate-limiting control (rateLimitMiddleware) is an in-memory, per-process sliding window with no cross-replica coordination — a horizontally-scaled deployment would not have a unified rate limit across instances.', ['src/middleware/rate-limit.ts'], 'Replace the in-memory store with a shared backing store (e.g. Redis) before horizontal scaling, per the limitation already documented in the module\'s own comment.'),
    finding('thr-3', 'MEDIUM', '[Program 14B-R: PARTIALLY REMEDIATED] Repudiation risk is reduced: the tamper-evidence primitives identified in Domain 4 (aud-1) are now wired into the production audit and approval write paths, so audit events are now cryptographically chained at write time. Severity remains MEDIUM rather than resolved because aud-2 (no DB-enforced append-only constraint) and aud-3 (no audit read path) are still open — a privileged actor with direct DB access could still alter rows undetected unless something recomputes and compares the chain, and nothing currently does so automatically.', ['src/lib/security/audit-integrity.ts', 'src/lib/audit/audit-service.ts', 'src/lib/governance/execution-approval-service.ts'], 'Add a periodic or on-read chain-verification job that recomputes tamperHash for stored rows and alerts on mismatch, and enforce append-only at the database layer (see Domain 4, aud-2).'),
  ]
  // Program 14B-R: thr-1 (CRITICAL) is remediated with a code fix + regression
  // test. thr-2 (LOW) is unrelated/unresolved. thr-3 (MEDIUM) is improved but
  // not fully closed. No CRITICAL or unresolved-HIGH finding remains, so the
  // domain moves FAILED -> PARTIAL.
  return { domain: 'threat-model', verdict: 'PARTIAL', confidence: 0.75, findings, evidence: ev }
}

// ─── Domain Registry Assembly ───────────────────────────────────────────────

const DOMAIN_VERIFIERS: Record<SecurityHardeningDomainId, () => SecurityHardeningDomainResult> = {
  'encryption-posture': verifyEncryptionPosture,
  'secrets-management': verifySecretsManagement,
  'token-lifecycle': verifyTokenLifecycle,
  'audit-integrity': verifyAuditIntegrity,
  'retention-controls': verifyRetentionControls,
  'threat-model': verifyThreatModel,
}

export function buildSecurityHardeningDomainResults(): SecurityHardeningDomainResult[] {
  return SECURITY_HARDENING_DOMAIN_IDS.map((id) => DOMAIN_VERIFIERS[id]())
}

// ─── Platform Verdict & Aggregation ─────────────────────────────────────────
// Same conservative priority order used by every prior authority in this
// repo (Program 13, 14A): FAILED anywhere -> platform FAILED; else UNKNOWN
// anywhere -> platform UNKNOWN; else PARTIAL anywhere -> PARTIAL; else
// VERIFIED only if every relevant (non-NOT_APPLICABLE) domain is VERIFIED.

function platformVerdictFrom(domains: SecurityHardeningDomainResult[]): SecurityHardeningAuthorityResult['platformVerdict'] {
  if (domains.some((d) => d.verdict === 'FAILED')) return 'FAILED'
  if (domains.some((d) => d.verdict === 'UNKNOWN')) return 'UNKNOWN'
  if (domains.some((d) => d.verdict === 'PARTIAL')) return 'PARTIAL'
  const relevant = domains.filter((d) => d.verdict !== 'NOT_APPLICABLE')
  if (relevant.length > 0 && relevant.every((d) => d.verdict === 'VERIFIED')) return 'VERIFIED'
  return 'UNKNOWN'
}

export function getSecurityHardeningAuthority(): SecurityHardeningAuthorityResult {
  const domains = buildSecurityHardeningDomainResults()
  const criticalFindings = domains.flatMap((d) => d.findings).filter((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH')
  const confidenceValues = domains.map((d) => d.confidence)
  const confidence = confidenceValues.length > 0 ? Math.round((confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length) * 100) / 100 : 0
  return {
    authority: 'SECURITY_HARDENING_AUTHORITY',
    generatedAt: GENERATED_AT,
    platformVerdict: platformVerdictFrom(domains),
    confidence,
    domains,
    criticalFindings,
  }
}
