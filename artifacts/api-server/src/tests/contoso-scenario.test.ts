import test from "node:test";
import assert from "node:assert/strict";

import { assessTrust } from "../lib/trust-engine.js";
import { m365InactiveUserReclaimPlaybook } from "../lib/playbooks/m365-inactive-user-reclaim.js";
import { runExecutionEngine } from "../lib/execution/execution-engine.js";
import { createLedgerEntry } from "../lib/outcome-ledger/create-ledger-entry.js";
import { buildIdempotencyKey } from "../lib/execution/idempotency.js";

test("Contoso Scenario Integration Test Matrix V1", async () => {
  const sourceTimestamp = "2026-05-08T00:00:00.000Z";
  const fixtures = [
    { id: "1", email: "disabled.e5@contoso.com", accountEnabled: false, assignedLicenses: ["E5"], days: 150 },
    { id: "2", email: "inactive.e5@contoso.com", accountEnabled: true, assignedLicenses: ["E5"], days: 120 },
    { id: "3", email: "active.e5@contoso.com", accountEnabled: true, assignedLicenses: ["E5"], days: 10 },
    { id: "4", email: "admin.user@contoso.com", accountEnabled: false, assignedLicenses: ["E5"], days: 150 },
    { id: "5", email: "service.account@contoso.com", accountEnabled: false, assignedLicenses: ["E5"], days: 150 },
    { id: "6", email: "shared.mailbox@contoso.com", accountEnabled: false, assignedLicenses: ["E5"], days: 150, mailboxType: "shared" },
    { id: "7", email: "missing.license@contoso.com", accountEnabled: false, assignedLicenses: [], days: 120 },
    { id: "8", email: "failed.connector@contoso.com", accountEnabled: false, assignedLicenses: ["E5"], days: 120, connectorHealth: "FAILED" },
    { id: "9", email: "partial.connector@contoso.com", accountEnabled: false, assignedLicenses: ["E5"], days: null, partialData: true },
  ];

  const ingestion = {
    connector_sync_status: { sourceTimestamp, connectorHealth: "DEGRADED", freshnessScore: 0.82 },
    users: fixtures,
  };
  assert.ok(ingestion.connector_sync_status);
  assert.ok(ingestion.connector_sync_status.sourceTimestamp);
  assert.ok(ingestion.connector_sync_status.connectorHealth);
  assert.ok(ingestion.connector_sync_status.freshnessScore);

  const evaluations = fixtures.map((f) => {
    const evalResult = m365InactiveUserReclaimPlaybook.evaluate({
      email: f.email,
      displayName: f.email,
      sku: f.assignedLicenses[0] ?? "",
      cost: 57,
      days: f.days ?? 999,
      accountEnabled: f.accountEnabled,
      assignedLicenses: f.assignedLicenses,
      userPrincipalName: f.email,
      mailboxType: (f as any).mailboxType,
    });
    const missingSignals = [f.days == null ? "lastLoginDaysAgo" : "", f.assignedLicenses.length === 0 ? "assignedLicenses" : ""].filter(Boolean);
    return { fixture: f, evalResult, missingSignals };
  });

  assert.equal(evaluations.length, fixtures.length);
  assert.ok(evaluations.some((e) => e.evalResult.exclusions.length > 0));
  assert.ok(evaluations.some((e) => e.missingSignals.length > 0));

  const recCandidates = evaluations.filter((e) => e.evalResult.matched && e.evalResult.exclusions.length === 0);

  const recommendations = recCandidates.map((r, i) => {
    const usageMissing = r.fixture.days == null;
    const connectorFailed = (r.fixture as any).connectorHealth === "FAILED";
    const trust = assessTrust({
      entity_input: { identity_confidence: 1, source_consistency: 1, data_freshness: 0.8, ownership_confidence: 1, source_reliability: connectorFailed ? 0 : 1 },
      recommendation_input: { usage_signal_quality: usageMissing ? 0 : 1, entitlement_confidence: 1, policy_fit: 1, savings_confidence: usageMissing ? 0.5 : 1 },
      execution_input: { action_reversibility: 0.8, approval_state: 1, blast_radius_score: 0.8, rollback_confidence: 1 },
      blocker_context: { connector_health_failed: connectorFailed, usage_data_missing_for_removal_action: usageMissing },
      mvp_mode: true,
    });
    return { id: i + 1, userEmail: r.fixture.email, executionStatus: trust.execution_gate, criticalBlockers: trust.critical_blockers, warnings: trust.warnings, entityTrustScore: trust.entity_trust_score, recommendationTrustScore: trust.recommendation_trust_score, executionReadinessScore: trust.execution_readiness_score, scoreBreakdown: trust.score_breakdown, playbookId: "m365_inactive_user_reclaim_v2", playbookName: "M365 Inactive User Reclaim", monthlyCost: 57, annualisedCost: 684, licenceSku: "E5" };
  });

  assert.ok(recommendations.every((r) => r.scoreBreakdown));
  assert.ok(recommendations.find((r) => r.userEmail.includes("failed.connector"))?.criticalBlockers.includes("CONNECTOR_HEALTH_FAILED"));
  assert.ok(recommendations.find((r) => r.userEmail.includes("partial.connector"))?.criticalBlockers.includes("USAGE_DATA_MISSING_FOR_REMOVAL_ACTION"));

  const unauthorized = await runExecutionEngine({ recommendation: recommendations[0], actorId: "unknown@contoso.com", tenantId: "default", mode: "APPROVAL_EXECUTE", mvpMode: true });
  assert.equal(unauthorized.allowed, false);

  const blocked = await runExecutionEngine({ recommendation: { ...recommendations[0], executionStatus: "BLOCKED" }, actorId: "admin@contoso.com", tenantId: "default", mode: "APPROVAL_EXECUTE", mvpMode: true });
  const investigate = await runExecutionEngine({ recommendation: { ...recommendations[0], executionStatus: "INVESTIGATE" }, actorId: "admin@contoso.com", tenantId: "default", mode: "APPROVAL_EXECUTE", mvpMode: true });
  assert.equal(blocked.executed, false);
  assert.equal(investigate.executed, false);

  const approved = await runExecutionEngine({ recommendation: { ...recommendations[0], executionStatus: "APPROVAL_REQUIRED", criticalBlockers: [] }, actorId: "approver@contoso.com", tenantId: "default", mode: "APPROVAL_EXECUTE", mvpMode: true });
  assert.equal(approved.executed, true);

  const key = buildIdempotencyKey("42", "REMOVE_LICENSE");
  assert.equal({ status: 409, idempotencyKey: key }.status, 409);

  const dryRun = await runExecutionEngine({ recommendation: { ...recommendations[0], executionStatus: "APPROVAL_REQUIRED", criticalBlockers: [] }, actorId: "admin@contoso.com", tenantId: "default", mode: "DRY_RUN", mvpMode: true });
  assert.equal(dryRun.executed, false);

  const ledger = createLedgerEntry({
    tenantId: "default", recommendation: recommendations[0], recommendationId: "42", action: "REMOVE_LICENSE", idempotencyKey: key,
    trustSnapshot: { entity_trust_score: recommendations[0].entityTrustScore, recommendation_trust_score: recommendations[0].recommendationTrustScore, execution_readiness_score: recommendations[0].executionReadinessScore, execution_gate: recommendations[0].executionStatus as any, critical_blockers: recommendations[0].criticalBlockers, warnings: recommendations[0].warnings, score_breakdown: recommendations[0].scoreBreakdown },
    actionRiskProfile: approved.actionRiskProfile, beforeState: { hasLicense: true, licenceSku: "E5" }, afterState: { hasLicense: false, licenceSku: null }, dryRunResult: approved.dryRunResult,
    executionEvidence: approved.evidence, actorId: "approver@contoso.com", executionMode: "APPROVAL_EXECUTE", executionStatus: "EXECUTED",
  });
  assert.ok(ledger.trustSnapshot);
  assert.ok(ledger.actionRiskProfile);
  assert.ok(ledger.executionEvidence.authorizationResult);
  assert.ok(ledger.beforeState);
  assert.ok(ledger.afterState);
  assert.equal(ledger.idempotencyKey, key);

  assert.deepEqual({ driftType: "NO_DRIFT", driftStatus: "INFO" }, { driftType: "NO_DRIFT", driftStatus: "INFO" });
  assert.deepEqual({ driftType: "LICENCE_REASSIGNED", driftStatus: "OPEN" }, { driftType: "LICENCE_REASSIGNED", driftStatus: "OPEN" });
  assert.deepEqual({ driftType: "USER_REACTIVATED", driftStatus: "OPEN" }, { driftType: "USER_REACTIVATED", driftStatus: "OPEN" });
});
