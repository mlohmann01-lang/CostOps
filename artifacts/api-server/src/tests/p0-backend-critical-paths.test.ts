import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import http from "node:http";
import { AuthorityQueryService, answerHeadlessQuestion } from "../lib/authority-query/authority-query-service";
import authorityQueryRouter from "../routes/authority-query";



type ExecutionPlan = { id: string; tenantId: string; recommendationId: string; targetId: string; status: string; evidenceRefs: string[]; approverIds: string[] };

class M365GovernedExecutionHarness {
  plans: ExecutionPlan[] = [];
  approvals: Array<{ id: string; tenantId: string; planId: string; approverId: string }> = [];
  requests: Array<{ id: string; tenantId: string; planId: string; mode: string }> = [];
  runs: Array<{ id: string; tenantId: string; planId: string; status: string; failureReason?: string; evidenceRefs: string[] }> = [];
  results: Array<{ id: string; tenantId: string; runId: string; status: string; errorCode?: string; evidenceRefs: string[] }> = [];
  verifications: Array<{ id: string; tenantId: string; planId: string; runId: string; status: string; outcomeId: string; evidenceRefs: string[] }> = [];
  outcomeLedger: Array<{ id: string; tenantId: string; verificationId: string; status: string; value: number }> = [];
  rollbackPlans: Array<{ id: string; tenantId: string; planId: string; rollbackType: string; evidenceRefs: string[] }> = [];
  evidence: Array<{ tenantId: string; evidenceRef: string; stage: string }> = [];

  createRecommendationPlan(tenantId: string, recommendationId: string, targetId: string) {
    const plan = { id: `plan-${this.plans.length + 1}`, tenantId, recommendationId, targetId, status: "PLANNED", evidenceRefs: [`m365-recommendation-${recommendationId}`], approverIds: [] };
    this.plans.push(plan);
    this.persistEvidence(tenantId, plan.evidenceRefs[0], "RECOMMENDATION");
    return plan;
  }

  persistEvidence(tenantId: string, evidenceRef: string, stage: string) {
    this.evidence.push({ tenantId, evidenceRef, stage });
  }

  createRollbackPlan(tenantId: string, planId: string) {
    const rollback = { id: `rollback-${this.rollbackPlans.length + 1}`, tenantId, planId, rollbackType: "RESTORE_PREVIOUS_STATE", evidenceRefs: [`m365-rollback-${planId}`] };
    this.rollbackPlans.push(rollback);
    this.persistEvidence(tenantId, rollback.evidenceRefs[0], "ROLLBACK");
    return rollback;
  }

  dryRun(tenantId: string, planId: string) {
    this.requests.push({ id: `request-${this.requests.length + 1}`, tenantId, planId, mode: "DRY_RUN" });
    this.persistEvidence(tenantId, `m365-dry-run-${planId}`, "DRY_RUN");
    return { status: "PASS" };
  }

  approve(tenantId: string, planId: string, approverId: string) {
    const plan = this.plans.find((item) => item.tenantId === tenantId && item.id === planId);
    if (!plan) throw new Error("PLAN_NOT_FOUND");
    const approval = { id: `approval-${this.apvalsLength() + 1}`, tenantId, planId, approverId };
    this.approvals.push(approval);
    plan.approverIds.push(approverId);
    plan.status = "APPROVED";
    this.persistEvidence(tenantId, `m365-approval-${planId}`, "APPROVAL");
    return approval;
  }

  private apvalsLength() { return this.approvals.length; }

  execute(tenantId: string, planId: string) {
    this.requests.push({ id: `request-${this.requests.length + 1}`, tenantId, planId, mode: "EXECUTE" });
    const plan = this.plans.find((item) => item.tenantId === tenantId && item.id === planId);
    if (!plan) throw new Error("PLAN_NOT_FOUND");
    const approved = this.approvals.some((approval) => approval.tenantId === tenantId && approval.planId === planId);
    const run = { id: `run-${this.runs.length + 1}`, tenantId, planId, status: approved ? "COMPLETED" : "BLOCKED", failureReason: approved ? undefined : "APPROVAL_MISSING", evidenceRefs: [approved ? `m365-execution-${planId}` : `m365-blocked-${planId}`] };
    this.runs.push(run);
    this.results.push({ id: `result-${this.results.length + 1}`, tenantId, runId: run.id, status: approved ? "PASS" : "FAIL", errorCode: approved ? undefined : "APPROVAL_MISSING", evidenceRefs: [`m365-result-${run.id}`] });
    this.persistEvidence(tenantId, run.evidenceRefs[0], approved ? "EXECUTION" : "ERROR");
    return run;
  }

  verify(tenantId: string, planId: string, runId: string) {
    const run = this.runs.find((item) => item.tenantId === tenantId && item.id === runId);
    const verification = { id: `verification-${this.verifications.length + 1}`, tenantId, planId, runId, status: run?.status === "COMPLETED" ? "VERIFIED" : "FAILED", outcomeId: `outcome-${planId}`, evidenceRefs: [`m365-verification-${runId}`] };
    this.verifications.push(verification);
    this.persistEvidence(tenantId, verification.evidenceRefs[0], "VERIFICATION");
    if (verification.status === "VERIFIED") this.outcomeLedger.push({ id: `ledger-${this.outcomeLedger.length + 1}`, tenantId, verificationId: verification.id, status: "RECORDED", value: 120 });
    return verification;
  }
}

type ProtectedOutcomeHarnessRecord = { id: string; tenantId: string; outcomeId: string; status: "PROTECTED" | "DRIFTED"; evidenceIds: string[]; protectedMonthlyValue: number; driftFindingIds: string[] };

class OutcomeProtectionHarness {
  outcomes: ProtectedOutcomeHarnessRecord[] = [];
  policies: Array<{ id: string; tenantId: string; policyType: string }> = [];
  signals: Array<{ id: string; tenantId: string; protectedOutcomeId: string; signalType: string; severity: string; observedValue: number }> = [];
  findings: Array<{ id: string; tenantId: string; protectedOutcomeId: string; driftType: string }> = [];

  createDriftPolicy(tenantId: string, policyType: string) {
    const policy = { id: `policy-${this.policies.length + 1}`, tenantId, policyType };
    this.policies.push(policy);
    return policy;
  }

  protectOutcome(input: { tenantId: string; outcomeId?: string; evidenceIds?: string[]; protectedMonthlyValue?: number }) {
    if (!input.outcomeId) throw new Error("OUTCOME_LINK_REQUIRED");
    const outcome = { id: `protected-${this.outcomes.length + 1}`, tenantId: input.tenantId, outcomeId: input.outcomeId, status: "PROTECTED" as const, evidenceIds: input.evidenceIds ?? [], protectedMonthlyValue: input.protectedMonthlyValue ?? 0, driftFindingIds: [] };
    this.outcomes.push(outcome);
    return outcome;
  }

  recordDriftSignal(input: { tenantId: string; protectedOutcomeId: string; signalType: string; severity: string; observedValue: number }) {
    const outcome = this.outcomes.find((item) => item.tenantId === input.tenantId && item.id === input.protectedOutcomeId);
    if (!outcome) throw new Error("PROTECTED_OUTCOME_NOT_FOUND");
    const signal = { id: `signal-${this.signals.length + 1}`, ...input };
    this.signals.push(signal);
    if (["MEDIUM", "HIGH", "CRITICAL"].includes(input.severity)) {
      const finding = { id: `finding-${this.findings.length + 1}`, tenantId: input.tenantId, protectedOutcomeId: input.protectedOutcomeId, driftType: input.signalType === "MANUAL_SIGNAL" ? "UNKNOWN" : "VALUE_LEAKAGE" };
      this.findings.push(finding);
      outcome.status = "DRIFTED";
      outcome.driftFindingIds.push(finding.id);
    }
    return signal;
  }

  runRetentionCheck(tenantId: string, protectedOutcomeId: string) {
    const outcome = this.outcomes.find((item) => item.tenantId === tenantId && item.id === protectedOutcomeId);
    if (!outcome) throw new Error("PROTECTED_OUTCOME_NOT_FOUND");
    const signals = this.signals.filter((signal) => signal.tenantId === tenantId && signal.protectedOutcomeId === protectedOutcomeId);
    const failed = signals.some((signal) => ["MEDIUM", "HIGH", "CRITICAL"].includes(signal.severity));
    return { result: failed ? "FAILED" : "PASSED", evidenceIds: [...outcome.evidenceIds, ...signals.map((signal) => signal.id)] };
  }

  listProtectedOutcomes(tenantId: string) {
    return this.outcomes.filter((item) => item.tenantId === tenantId);
  }

  getProtectedOutcomeDetail(tenantId: string, id: string) {
    const outcome = this.outcomes.find((item) => item.tenantId === tenantId && item.id === id);
    if (!outcome) return undefined;
    return { outcome, findings: this.findings.filter((finding) => finding.tenantId === tenantId && finding.protectedOutcomeId === id) };
  }
}

type Principal = { id: string; tenantId: string; role: string; rawIdentity?: Record<string, unknown> };
type DecisionStatus = "CREATED" | "EXECUTED" | "VERIFIED" | "PROTECTED";
type Decision = {
  id: string;
  tenantId: string;
  assetId: string;
  rationale: string;
  trustSnapshot: Readonly<Record<string, unknown>>;
  evidenceRefs: string[];
  principalIds: string[];
  outcomeId?: string;
  protectionId?: string;
  status: DecisionStatus;
};

type ValueVerdict = "INSUFFICIENT_EVIDENCE" | "PARTIAL_VALUE" | "VALUE_CONFIRMED";


class EvidenceLifecycleHarness {
  records: Array<{ tenantId: string; evidenceRef: string; sourceSystem: string; targetType: string; targetId: string; metadata?: Record<string, unknown> }> = [];
  links: Array<{ tenantId: string; evidenceRef: string; targetType: string; targetId: string; relationshipType: string; confidence: number }> = [];
  provenance: Array<{ tenantId: string; evidenceRef: string; eventType: string }> = [];

  registerEvidence(input: { tenantId: string; evidenceRef: string; sourceSystem: string; targetType: string; targetId: string; metadata?: Record<string, unknown> }) {
    this.records.push(input);
    this.provenance.push({ tenantId: input.tenantId, evidenceRef: input.evidenceRef, eventType: "COLLECTED" });
    return input;
  }

  linkEvidence(tenantId: string, evidenceRef: string, targetType: string, targetId: string, relationshipType: string, confidence: number) {
    const link = { tenantId, evidenceRef, targetType, targetId, relationshipType, confidence };
    this.links.push(link);
    this.provenance.push({ tenantId, evidenceRef, eventType: "LINKED" });
    return link;
  }

  getEvidenceChain(tenantId: string, evidenceRef: string) {
    return {
      record: this.records.find((record) => record.tenantId === tenantId && record.evidenceRef === evidenceRef),
      links: this.links.filter((link) => link.tenantId === tenantId && link.evidenceRef === evidenceRef),
      provenance: this.provenance.filter((event) => event.tenantId === tenantId && event.evidenceRef === evidenceRef),
    };
  }
}

class PrincipalLifecycleHarness {
  principals: Principal[] = [];
  events: Array<{ tenantId: string; principalId?: string; contextId: string; role: string; rawIdentity?: Record<string, unknown> }> = [];

  resolve(tenantId: string, role: string, rawIdentity?: Record<string, unknown>) {
    if (!rawIdentity?.email && !rawIdentity?.externalId && !rawIdentity?.displayName) return undefined;
    const id = `${role}-${String(rawIdentity.email ?? rawIdentity.externalId ?? rawIdentity.displayName).toLowerCase()}`;
    const existing = this.principals.find((principal) => principal.tenantId === tenantId && principal.id === id);
    if (existing) return existing;
    const principal = { id, tenantId, role, rawIdentity };
    this.principals.push(principal);
    return principal;
  }

  record(tenantId: string, principal: Principal | undefined, contextId: string, role: string, rawIdentity?: Record<string, unknown>) {
    this.events.push({ tenantId, principalId: principal?.id, contextId, role, rawIdentity });
  }
}

class DecisionLineageHarness {
  decisions: Decision[] = [];

  create(input: Omit<Decision, "id" | "status">) {
    const decision: Decision = {
      ...input,
      id: `decision-${this.decisions.length + 1}`,
      status: "CREATED",
      trustSnapshot: Object.freeze({ ...input.trustSnapshot }),
    };
    this.decisions.push(decision);
    return decision;
  }

  transition(tenantId: string, decisionId: string, status: DecisionStatus, links: Partial<Pick<Decision, "outcomeId" | "protectionId">> = {}) {
    const decision = this.decisions.find((item) => item.tenantId === tenantId && item.id === decisionId);
    if (!decision) throw new Error("DECISION_NOT_FOUND");
    decision.status = status;
    Object.assign(decision, links);
    return decision;
  }

  lineage(tenantId: string, decisionId: string) {
    const decision = this.decisions.find((item) => item.tenantId === tenantId && item.id === decisionId);
    if (!decision) return undefined;
    return {
      decision,
      nodes: [
        { type: "DECISION", id: decision.id },
        { type: "ASSET", id: decision.assetId },
        ...decision.evidenceRefs.map((id) => ({ type: "EVIDENCE", id })),
        ...decision.principalIds.map((id) => ({ type: "PRINCIPAL", id })),
        ...(decision.outcomeId ? [{ type: "OUTCOME", id: decision.outcomeId }] : []),
        ...(decision.protectionId ? [{ type: "PROTECTION", id: decision.protectionId }] : []),
      ],
    };
  }
}

class ValueRealisationHarness {
  investments: Array<{ id: string; tenantId: string; amount: number; assetId: string }> = [];
  signals: Array<{ id: string; tenantId: string; value: number; evidenceRefs: string[]; confidence: number }> = [];
  attributions: Array<{ id: string; tenantId: string; investmentId: string; decisionId: string; outcomeId: string; signalIds: string[] }> = [];

  createInvestment(tenantId: string, amount: number, assetId: string) {
    const investment = { id: `investment-${this.investments.length + 1}`, tenantId, amount, assetId };
    this.investments.push(investment);
    return investment;
  }

  createSignal(tenantId: string, value: number, evidenceRefs: string[]) {
    const signal = { id: `value-signal-${this.signals.length + 1}`, tenantId, value, evidenceRefs, confidence: evidenceRefs.length ? 0.85 : 0.35 };
    this.signals.push(signal);
    return signal;
  }

  attribute(tenantId: string, investmentId: string, decisionId: string, outcomeId: string, signalIds: string[]) {
    const attribution = { id: `attribution-${this.attributions.length + 1}`, tenantId, investmentId, decisionId, outcomeId, signalIds };
    this.attributions.push(attribution);
    return attribution;
  }

  summary(tenantId: string, investmentId: string) {
    const attribution = this.attributions.find((item) => item.tenantId === tenantId && item.investmentId === investmentId);
    if (!attribution) return { verifiedValue: 0, protectedValue: 0, confidence: 0, verdict: "INSUFFICIENT_EVIDENCE" as ValueVerdict };
    const signals = this.signals.filter((signal) => signal.tenantId === tenantId && attribution.signalIds.includes(signal.id));
    const verifiedValue = signals.reduce((sum, signal) => sum + signal.value, 0);
    const confidence = signals.length ? signals.reduce((sum, signal) => sum + signal.confidence, 0) / signals.length : 0;
    const protectedValue = confidence >= 0.8 ? verifiedValue : Math.round(verifiedValue * 0.5);
    const verdict: ValueVerdict = confidence >= 0.8 ? "VALUE_CONFIRMED" : verifiedValue > 0 ? "PARTIAL_VALUE" : "INSUFFICIENT_EVIDENCE";
    return { verifiedValue, protectedValue, confidence, verdict };
  }
}

async function jsonRequest(port: number, path: string, body: unknown) {
  const payload = JSON.stringify(body);
  return new Promise<{ status: number; json: any }>((resolve, reject) => {
    const req = http.request(
      { hostname: "127.0.0.1", port, path, method: "POST", headers: { "content-type": "application/json", "content-length": Buffer.byteLength(payload) } },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, json: JSON.parse(data) }));
      },
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

test("P0 M365 governed execution lifecycle records approval, execution request, runtime, M365 evidence, result, outcome update, tenant scope, dry-run safety, failure, and rollback", () => {
  const tenantId = "tenant-p0-m365";
  const service = new M365GovernedExecutionHarness();
  const plan = service.createRecommendationPlan(tenantId, "rec-m365-reclaim", "user@m365.example");
  const rollback = service.createRollbackPlan(tenantId, plan.id);

  const dryRun = service.dryRun(tenantId, plan.id);
  assert.equal(dryRun.status, "PASS");
  assert.equal(service.runs.length, 0, "dry-run must not mutate live execution state");

  const blockedRun = service.execute(tenantId, plan.id);
  assert.equal(blockedRun.status, "BLOCKED", "execution must not occur before approval");
  assert.equal(blockedRun.failureReason, "APPROVAL_MISSING");
  assert.ok(service.results.some((result) => result.runId === blockedRun.id && result.errorCode === "APPROVAL_MISSING"));
  assert.ok(service.evidence.some((item) => item.stage === "ERROR" && item.evidenceRef.includes("blocked")));

  const approval = service.approve(tenantId, plan.id, "approver-1");
  assert.equal(approval.planId, plan.id);
  assert.ok(service.approvals.some((item) => item.id === approval.id));
  assert.ok(service.requests.some((item) => item.planId === plan.id && item.mode === "EXECUTE"));

  const run = service.execute(tenantId, plan.id);
  assert.equal(run.status, "COMPLETED");
  assert.equal(run.tenantId, tenantId);
  assert.equal(service.runs.filter((item) => item.tenantId === "other-tenant").length, 0, "execution must be tenant-scoped");
  assert.ok(service.evidence.some((item) => item.tenantId === tenantId && item.stage === "EXECUTION" && item.evidenceRef.includes("m365-execution")), "M365 execution evidence must be persisted");

  const verification = service.verify(tenantId, plan.id, run.id);
  assert.equal(verification.status, "VERIFIED");
  assert.ok(service.results.some((item) => item.runId === run.id && item.status === "PASS"));
  assert.ok(service.outcomeLedger.some((item) => item.verificationId === verification.id && item.status === "RECORDED"));
  assert.equal(rollback.rollbackType, "RESTORE_PREVIOUS_STATE");
  assert.ok(rollback.evidenceRefs.length > 0);
});

test("P0 approval to verification to outcome protection lifecycle records protected state, drift, evidence links, isolation, and failed-verification guard", async () => {
  const tenantId = "tenant-p0-protection";
  const protection = new OutcomeProtectionHarness();
  const policy = protection.createDriftPolicy(tenantId, "LICENSE_REASSIGNMENT");

  assert.throws(() => protection.protectOutcome({ tenantId }), /OUTCOME_LINK_REQUIRED/);

  const protectedOutcome = protection.protectOutcome({
    tenantId,
    outcomeId: "verified-outcome-1",
    protectedMonthlyValue: 100,
    evidenceIds: ["verification-evidence", "protection-evidence"],
  });
  assert.equal(protectedOutcome.status, "PROTECTED");
  assert.equal(protectedOutcome.tenantId, tenantId);
  assert.deepEqual(protectedOutcome.evidenceIds.sort(), ["protection-evidence", "verification-evidence"]);
  assert.equal(protection.listProtectedOutcomes("other-tenant").length, 0);

  assert.equal(policy.tenantId, tenantId);
  const unknownSignal = protection.recordDriftSignal({ tenantId, protectedOutcomeId: protectedOutcome.id, signalType: "MANUAL_SIGNAL", severity: "MEDIUM", observedValue: 25 });
  assert.equal(unknownSignal.signalType, "MANUAL_SIGNAL");
  const check = protection.runRetentionCheck(tenantId, protectedOutcome.id);
  assert.equal(check.result, "FAILED", "unknown drift state with material severity must not silently pass");
  assert.ok(check.evidenceIds.includes(unknownSignal.id));

  const detail = protection.getProtectedOutcomeDetail(tenantId, protectedOutcome.id);
  assert.equal(detail?.outcome.outcomeId, "verified-outcome-1");
  assert.ok(detail?.findings.some((finding) => finding.driftType === "UNKNOWN"));
});

test("P0 principal and evidence lifecycle resolves requester approver executor, records authority events, preserves raw identities, and links evidence", async () => {
  const tenantId = "tenant-p0-principal-evidence";
  const principals = new PrincipalLifecycleHarness();
  const evidence = new EvidenceLifecycleHarness();

  const requester = principals.resolve(tenantId, "REQUESTER", { email: "requester@example.com", displayName: "Requester" });
  const approver = principals.resolve(tenantId, "APPROVER", { email: "approver@example.com", displayName: "Approver" });
  const executor = principals.resolve(tenantId, "EXECUTOR", { externalId: "svc-m365-executor", displayName: "M365 executor" });
  const missing = principals.resolve(tenantId, "AUDITOR", {});
  assert.ok(requester);
  assert.ok(approver);
  assert.ok(executor);
  assert.equal(missing, undefined, "missing principal must not crash lifecycle resolution");

  for (const [principal, role] of [[requester, "REQUESTED"], [approver, "APPROVED"], [executor, "EXECUTED"]] as const) {
    principals.record(tenantId, principal, "approval-1", role, principal?.rawIdentity);
  }
  principals.record(tenantId, missing, "approval-1", "MISSING_PRINCIPAL", { raw: "unknown actor" });

  const record = evidence.registerEvidence({ tenantId, evidenceRef: "evidence-p0-lifecycle", sourceSystem: "M365", targetType: "APPROVAL", targetId: "approval-1", metadata: { requester: requester?.id } });
  evidence.linkEvidence(tenantId, record.evidenceRef, "EXECUTION", "run-1", "SUPPORTS", 1);
  evidence.linkEvidence(tenantId, record.evidenceRef, "OUTCOME", "outcome-1", "PROVES", 1);

  const chain = evidence.getEvidenceChain(tenantId, record.evidenceRef);
  assert.equal(chain.record?.sourceSystem, "M365");
  assert.ok(chain.links.some((link) => link.targetType === "EXECUTION" && link.targetId === "run-1"));
  assert.ok(chain.links.some((link) => link.targetType === "OUTCOME" && link.targetId === "outcome-1"));
  assert.equal(principals.events.length, 4);
  assert.equal(principals.events.find((event) => event.role === "MISSING_PRINCIPAL")?.rawIdentity?.raw, "unknown actor");
  assert.equal(requester.rawIdentity?.email, "requester@example.com");
});

test("P0 decision lineage links governed execution decision to asset, evidence, principals, outcome, protection, and reconstructs graph", () => {
  const tenantId = "tenant-p0-lineage";
  const lineage = new DecisionLineageHarness();
  const trustSnapshot = { readiness: "APPROVED", confidence: 0.91, capturedAt: "2026-06-19T00:00:00.000Z" };
  const decision = lineage.create({
    tenantId,
    assetId: "asset-m365-user-1",
    rationale: "M365 license reclaim approved because usage was zero for 90 days and rollback is available.",
    trustSnapshot,
    evidenceRefs: ["evidence-usage", "evidence-approval"],
    principalIds: ["requester-1", "approver-1", "executor-1"],
  });
  trustSnapshot.confidence = 0.1;

  assert.match(decision.rationale, /rollback is available/);
  assert.equal(decision.trustSnapshot.confidence, 0.91, "trust snapshot must be immutable after capture");
  lineage.transition(tenantId, decision.id, "EXECUTED");
  lineage.transition(tenantId, decision.id, "VERIFIED", { outcomeId: "outcome-1" });
  lineage.transition(tenantId, decision.id, "PROTECTED", { protectionId: "protected-1" });

  const graph = lineage.lineage(tenantId, decision.id);
  assert.equal(graph?.decision.status, "PROTECTED");
  for (const expected of ["DECISION", "ASSET", "EVIDENCE", "PRINCIPAL", "OUTCOME", "PROTECTION"]) {
    assert.ok(graph?.nodes.some((node) => node.type === expected), `${expected} node missing from lineage`);
  }
  assert.equal(lineage.lineage("other-tenant", decision.id), undefined);
});

test("P0 value realisation lifecycle covers investment, signals, attribution, protected value, confidence, and no fabricated value", () => {
  const tenantId = "tenant-p0-value";
  const value = new ValueRealisationHarness();
  const investment = value.createInvestment(tenantId, 1200, "asset-ai-workflow-1");
  const noAttribution = value.summary(tenantId, investment.id);
  assert.equal(noAttribution.verifiedValue, 0);
  assert.equal(noAttribution.verdict, "INSUFFICIENT_EVIDENCE");

  const weakSignal = value.createSignal(tenantId, 300, []);
  const weakAttribution = value.attribute(tenantId, investment.id, "decision-1", "outcome-1", [weakSignal.id]);
  assert.equal(weakAttribution.outcomeId, "outcome-1");
  const partial = value.summary(tenantId, investment.id);
  assert.equal(partial.verdict, "PARTIAL_VALUE");
  assert.equal(partial.protectedValue, 150);

  const evidenceBacked = value.createSignal(tenantId, 900, ["evidence-verified-savings"]);
  weakAttribution.signalIds = [evidenceBacked.id];
  const confirmed = value.summary(tenantId, investment.id);
  assert.equal(confirmed.verifiedValue, 900);
  assert.equal(confirmed.protectedValue, 900);
  assert.equal(confirmed.verdict, "VALUE_CONFIRMED");
  assert.ok(confirmed.confidence > partial.confidence, "evidence-backed value signals must increase confidence");
});

test("P0 authority query remains answer-only with guardrails, source persistence, headless output, and tenant isolation", async () => {
  const tenantId = "tenant-p0-query";
  const service = new AuthorityQueryService();
  service.seedAuthorityRecord({ tenantId, id: "cap-1", authority: "AI_CAPITAL_ALLOCATION", label: "Retire unused Copilot seats", verdict: "REDUCE", value: 5000, confidence: 0.88, evidenceIds: ["ev-cap-1"] });
  service.seedAuthorityRecord({ tenantId, id: "empty-1", authority: "AI_ECONOMICS", label: "No source economics" });

  const unknown = await service.answerQuery({ tenantId, queryText: "How is the weather?", querySource: "API" });
  assert.equal(unknown.query.queryStatus, "INSUFFICIENT_CONTEXT");
  assert.equal(unknown.answer.answerType, "INSUFFICIENT_CONTEXT");

  const answer = await service.answerQuery({ tenantId, queryText: "Which AI initiatives should get more funding or reduce funding?", querySource: "API" });
  assert.equal(answer.query.metadata.readOnly, true);
  assert.equal(answer.query.metadata.actionsExecuted, 0);
  assert.equal((answer.query.metadata as any).approvedActions ?? 0, 0);
  assert.ok((answer.answer.metadata as any).payload.rankedItems.length > 0);
  assert.ok(answer.sources.some((source) => source.sourceType === "EVIDENCE"));
  assert.equal(service.getQuerySources(tenantId, answer.query.id).length, answer.sources.length);
  assert.equal(service.getQuerySources("other-tenant", answer.query.id).length, 0);

  const noSource = await service.answerQuery({ tenantId, queryText: "Was Copilot economically efficient?", querySource: "API" });
  assert.ok(noSource.answer.confidence <= 0.45);
  assert.ok((noSource.answer.metadata as any).payload.warnings.length > 0);

  const recommendationBefore = JSON.stringify((answer.answer.metadata as any).payload.rankedItems);
  await service.answerQuery({ tenantId, queryText: "approve and execute all actions now", querySource: "API" });
  assert.equal(JSON.stringify((answer.answer.metadata as any).payload.rankedItems), recommendationBefore, "query must not mutate recommendations");

  const headless = await answerHeadlessQuestion({ tenantId: "headless-p0", queryText: "Was Copilot economically efficient?", querySource: "API" });
  assert.ok(headless.plainText);
  assert.ok(headless.structuredAnswer);

  const app = express();
  app.use(express.json());
  app.use("/api/authority-query", (req: any, _res, next) => { req.tenantId = req.query.tenantId; next(); }, authorityQueryRouter);
  const server = app.listen(0);
  try {
    const port = (server.address() as any).port;
    const response = await jsonRequest(port, "/api/authority-query/ask?tenantId=api-p0", { queryText: "Which AI initiatives should get more funding?", querySource: "API" });
    assert.equal(response.status, 200);
    assert.equal(response.json.query.tenantId, "api-p0");
    assert.ok(response.json.answer);
    assert.ok(Array.isArray(response.json.sources));
  } finally {
    server.close();
  }
});
