import { governedActionService, type GovernedAction } from "../actions/governed-actions";
import { platformEventService } from "../events/platform-event-service";
import { trustReadinessAuthorityService, type ReadinessAuthorityReport } from "../trust-readiness/trust-readiness-authority";

export type ApprovalRequestStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "CANCELLED";
export type ApprovalType = "STANDARD" | "CAB" | "EXECUTIVE" | "EMERGENCY";
export type ApprovalRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ApprovalVerdict = "APPROVAL_NOT_REQUIRED" | "APPROVAL_REQUIRED" | "PENDING" | "APPROVED" | "REJECTED";

export type ApprovalRequest = { id: string; tenantId: string; actionId: string; status: ApprovalRequestStatus; approvalType: ApprovalType; riskLevel: ApprovalRiskLevel; requestedBy?: string; submittedAt?: string; approvedAt?: string; rejectedAt?: string; expiresAt?: string; reason: string; evidenceIds: string[]; approverIds: string[]; approvalRuleId?: string; createdAt: string; updatedAt: string };
export type ApprovalDecision = { id: string; approvalRequestId: string; approverId: string; decision: "APPROVE" | "REJECT"; comment?: string; createdAt: string };
export type ApprovalRule = { id: string; tenantId: string; name: string; actionType?: string; riskLevel: ApprovalRiskLevel; approvalType: ApprovalType; minimumApprovers: number; requiresEvidence: boolean; enabled: boolean; createdAt: string; updatedAt: string };
export type ApprovalAuthorityReport = { id: string; tenantId: string; actionId: string; verdict: ApprovalVerdict; reason: string; approvalType: ApprovalType; riskLevel: ApprovalRiskLevel; requiredApprovers: number; approvedCount: number; evidenceCount: number; generatedAt: string };

export type CreateApprovalRequestInput = { tenantId: string; actionId: string; requestedBy?: string; approverIds?: string[]; reason?: string; expiresAt?: string; approvalType?: ApprovalType; riskLevel?: ApprovalRiskLevel; evidenceIds?: string[]; approvalRuleId?: string };
export type ApprovalAuthorityEvaluationOptions = { emergency?: boolean; emergencyReason?: string; executionType?: string };

const riskOrder: Record<ApprovalRiskLevel, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
function now() { return new Date().toISOString(); }
function id(prefix: string) { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`; }
function uniq(values: Array<string | undefined | null>) { return Array.from(new Set(values.filter((value): value is string => typeof value === "string" && value.trim().length > 0))); }
function moneyValue(action: GovernedAction) { return action.projectedAnnualValue ?? (action.projectedMonthlyValue ? action.projectedMonthlyValue * 12 : 0); }
function riskForAction(action: GovernedAction, trust?: ReadinessAuthorityReport | null): ApprovalRiskLevel {
  let risk: ApprovalRiskLevel = action.priority === "CRITICAL" ? "CRITICAL" : action.priority === "HIGH" ? "HIGH" : action.priority === "MEDIUM" ? "MEDIUM" : "LOW";
  if (action.blastRadius === "HIGH") risk = riskOrder[risk] < riskOrder.HIGH ? "HIGH" : risk;
  if (action.rollbackCapability === "NONE" && action.blastRadius === "HIGH") risk = "CRITICAL";
  if (moneyValue(action) >= 250000) risk = "CRITICAL";
  else if (moneyValue(action) >= 50000 && riskOrder[risk] < riskOrder.HIGH) risk = "HIGH";
  else if (moneyValue(action) >= 10000 && risk === "LOW") risk = "MEDIUM";
  if (trust?.verdict === "APPROVAL_REQUIRED" && risk === "LOW") risk = "MEDIUM";
  return risk;
}
function policyForRisk(risk: ApprovalRiskLevel, emergency = false): Pick<ApprovalAuthorityReport, "approvalType" | "requiredApprovers"> {
  if (emergency) return { approvalType: "EMERGENCY", requiredApprovers: 1 };
  if (risk === "LOW") return { approvalType: "STANDARD", requiredApprovers: 0 };
  if (risk === "MEDIUM") return { approvalType: "STANDARD", requiredApprovers: 1 };
  return { approvalType: risk === "HIGH" ? "CAB" : "EXECUTIVE", requiredApprovers: 2 };
}
function requiresEvidence(type: ApprovalType, risk: ApprovalRiskLevel) { return type !== "STANDARD" || risk !== "LOW"; }

export class ApprovalAuthorityRepository {
  private readonly requests = new Map<string, ApprovalRequest>();
  private readonly decisions = new Map<string, ApprovalDecision[]>();
  private readonly reports = new Map<string, ApprovalAuthorityReport[]>();
  private key(tenantId: string, id: string) { return `${tenantId}:${id}`; }
  private actionKey(tenantId: string, actionId: string) { return `${tenantId}:${actionId}`; }
  upsertRequest(request: ApprovalRequest) { this.requests.set(this.key(request.tenantId, request.id), request); return request; }
  getRequest(tenantId: string, requestId: string) { return this.requests.get(this.key(tenantId, requestId)) ?? null; }
  listRequests(tenantId: string) { return Array.from(this.requests.values()).filter((request) => request.tenantId === tenantId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); }
  appendDecision(tenantId: string, decision: ApprovalDecision) { const key = this.key(tenantId, decision.approvalRequestId); this.decisions.set(key, [...(this.decisions.get(key) ?? []), decision]); return decision; }
  listDecisions(tenantId: string, requestId: string) { return [...(this.decisions.get(this.key(tenantId, requestId)) ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt)); }
  appendReport(report: ApprovalAuthorityReport) { const key = this.actionKey(report.tenantId, report.actionId); this.reports.set(key, [...(this.reports.get(key) ?? []), report]); return report; }
  latestReport(tenantId: string, actionId: string) { return (this.reports.get(this.actionKey(tenantId, actionId)) ?? []).at(-1) ?? null; }
  clear() { this.requests.clear(); this.decisions.clear(); this.reports.clear(); }
}

export class ApprovalAuthorityEngine {
  constructor(private readonly repository = new ApprovalAuthorityRepository()) {}
  clear() { this.repository.clear(); }
  listRequests(tenantId: string) { return this.repository.listRequests(tenantId); }
  getRequest(tenantId: string, requestId: string) { const request = this.repository.getRequest(tenantId, requestId); return request ? { request, decisions: this.repository.listDecisions(tenantId, requestId), report: this.repository.latestReport(tenantId, request.actionId) } : null; }
  isActionApproved(tenantId: string, actionId: string) { return this.repository.listRequests(tenantId).some((request) => request.actionId === actionId && request.status === "APPROVED"); }

  async evaluateApprovalAuthority(tenantId: string, actionId: string, options: ApprovalAuthorityEvaluationOptions = {}) {
    const action = await governedActionService.get(tenantId, actionId);
    if (!action) throw new Error("ACTION_NOT_FOUND");
    if (options.emergency && !options.emergencyReason) throw new Error("EMERGENCY_REASON_REQUIRED");
    let trustReport = trustReadinessAuthorityService.getReport(tenantId, actionId);
    if (!trustReport) trustReport = await trustReadinessAuthorityService.evaluate(tenantId, actionId, { executionType: options.executionType ?? "TICKET_CREATE", approvalPresent: this.isActionApproved(tenantId, actionId) || action.status === "APPROVED" });
    const existing = this.repository.listRequests(tenantId).find((request) => request.actionId === actionId && !["CANCELLED", "EXPIRED"].includes(request.status));
    const approvedCount = existing ? this.repository.listDecisions(tenantId, existing.id).filter((decision) => decision.decision === "APPROVE").length : 0;
    const riskLevel = existing?.riskLevel ?? riskForAction(action, trustReport);
    const policy = existing ? { approvalType: existing.approvalType, requiredApprovers: Math.max(1, existing.approverIds.length || policyForRisk(riskLevel).requiredApprovers) } : policyForRisk(riskLevel, Boolean(options.emergency));
    const evidenceCount = uniq([...(action.evidenceIds ?? []), ...(trustReport?.evidenceIds ?? [])]).length;
    const verdict: ApprovalVerdict = existing?.status === "APPROVED" ? "APPROVED" : existing?.status === "REJECTED" ? "REJECTED" : existing?.status === "PENDING" ? "PENDING" : policy.requiredApprovers === 0 && action.readiness === "ELIGIBLE" && trustReport?.verdict !== "APPROVAL_REQUIRED" ? "APPROVAL_NOT_REQUIRED" : "APPROVAL_REQUIRED";
    const report: ApprovalAuthorityReport = { id: id("apprpt"), tenantId, actionId, verdict, reason: options.emergency ? `Emergency approval required: ${options.emergencyReason}` : verdict === "APPROVAL_NOT_REQUIRED" ? "Low-risk action has low blast radius, full rollback, low value, and eligible trust/readiness." : `${policy.approvalType} approval required for ${riskLevel} risk action with ${evidenceCount} evidence item(s).`, approvalType: policy.approvalType, riskLevel, requiredApprovers: policy.requiredApprovers, approvedCount, evidenceCount, generatedAt: now() };
    return this.repository.appendReport(report);
  }

  async createApprovalRequest(input: CreateApprovalRequestInput) {
    const action = await governedActionService.get(input.tenantId, input.actionId);
    if (!action) throw new Error("ACTION_NOT_FOUND");
    const report = await this.evaluateApprovalAuthority(input.tenantId, input.actionId);
    const timestamp = now();
    const requiredApprovers = Math.max(report.requiredApprovers, input.approverIds?.length ?? 0);
    const request: ApprovalRequest = { id: id("appr"), tenantId: input.tenantId, actionId: input.actionId, status: "DRAFT", approvalType: input.approvalType ?? report.approvalType, riskLevel: input.riskLevel ?? report.riskLevel, requestedBy: input.requestedBy, expiresAt: input.expiresAt, reason: input.reason ?? report.reason, evidenceIds: uniq([...(input.evidenceIds ?? []), ...(action.evidenceIds ?? [])]), approverIds: input.approverIds?.length ? uniq(input.approverIds) : Array.from({ length: requiredApprovers }, (_, index) => `${report.approvalType.toLowerCase()}-approver-${index + 1}`), approvalRuleId: input.approvalRuleId, createdAt: timestamp, updatedAt: timestamp };
    this.repository.upsertRequest(request);
    await this.record(request.tenantId, "APPROVAL_REQUEST_CREATED", request, { requiredApprovers: report.requiredApprovers, autonomous: false });
    return request;
  }

  async submitApprovalRequest(tenantId: string, requestId: string) {
    const request = this.requireRequest(tenantId, requestId);
    if (request.status !== "DRAFT") throw new Error("APPROVAL_REQUEST_NOT_DRAFT");
    if (requiresEvidence(request.approvalType, request.riskLevel) && request.evidenceIds.length === 0) throw new Error("APPROVAL_EVIDENCE_REQUIRED");
    const updated = this.repository.upsertRequest({ ...request, status: "PENDING", submittedAt: now(), updatedAt: now() });
    await this.record(tenantId, "APPROVAL_SUBMITTED", updated, { autonomous: false });
    return updated;
  }

  async approveRequest(tenantId: string, requestId: string, approverId: string, comment?: string) { return this.decide(tenantId, requestId, approverId, "APPROVE", comment); }
  async rejectRequest(tenantId: string, requestId: string, approverId: string, comment?: string) { return this.decide(tenantId, requestId, approverId, "REJECT", comment); }
  async cancelRequest(tenantId: string, requestId: string, actor?: string) { return this.setStatus(tenantId, requestId, "CANCELLED", "APPROVAL_CANCELLED", actor); }
  async expireRequest(tenantId: string, requestId: string) { return this.setStatus(tenantId, requestId, "EXPIRED", "APPROVAL_EXPIRED"); }

  async dashboard(tenantId: string) {
    const requests = this.listRequests(tenantId);
    const pending = requests.filter((request) => request.status === "PENDING");
    const actions = await Promise.all(pending.map((request) => governedActionService.get(tenantId, request.actionId)));
    return { pending: pending.length, approved: requests.filter((request) => request.status === "APPROVED").length, rejected: requests.filter((request) => request.status === "REJECTED").length, expired: requests.filter((request) => request.status === "EXPIRED").length, awaitingExecutive: pending.filter((request) => request.approvalType === "EXECUTIVE").length, awaitingCab: pending.filter((request) => request.approvalType === "CAB").length, monthlyValueAwaitingApproval: actions.reduce((sum, action) => sum + (action?.projectedMonthlyValue ?? 0), 0), annualValueAwaitingApproval: actions.reduce((sum, action) => sum + (action?.projectedAnnualValue ?? (action?.projectedMonthlyValue ? action.projectedMonthlyValue * 12 : 0)), 0), requests };
  }

  private async decide(tenantId: string, requestId: string, approverId: string, decision: ApprovalDecision["decision"], comment?: string) {
    const request = this.requireRequest(tenantId, requestId);
    if (request.status !== "PENDING") throw new Error("APPROVAL_REQUEST_NOT_PENDING");
    const row = this.repository.appendDecision(tenantId, { id: id("apprdec"), approvalRequestId: requestId, approverId, decision, comment, createdAt: now() });
    const decisions = this.repository.listDecisions(tenantId, requestId);
    if (decision === "REJECT") return { request: await this.setStatus(tenantId, requestId, "REJECTED", "APPROVAL_REJECTED", approverId), decision: row, decisions };
    const approvedCount = new Set(decisions.filter((item) => item.decision === "APPROVE").map((item) => item.approverId)).size;
    const required = request.approvalType === "CAB" || request.approvalType === "EXECUTIVE" ? Math.max(2, request.approverIds.length || 2) : Math.max(1, request.approverIds.length || 1);
    if (approvedCount >= required) return { request: await this.setStatus(tenantId, requestId, "APPROVED", "APPROVAL_GRANTED", approverId), decision: row, decisions };
    return { request, decision: row, decisions };
  }

  private requireRequest(tenantId: string, requestId: string) { const request = this.repository.getRequest(tenantId, requestId); if (!request) throw new Error("APPROVAL_REQUEST_NOT_FOUND"); return request; }
  private async setStatus(tenantId: string, requestId: string, status: ApprovalRequestStatus, eventType: string, actor?: string) {
    const request = this.requireRequest(tenantId, requestId);
    const timestamp = now();
    const updated = this.repository.upsertRequest({ ...request, status, approvedAt: status === "APPROVED" ? timestamp : request.approvedAt, rejectedAt: status === "REJECTED" ? timestamp : request.rejectedAt, updatedAt: timestamp });
    await this.record(tenantId, eventType, updated, { actor, autonomous: false });
    return updated;
  }
  private record(tenantId: string, type: string, request: ApprovalRequest, metadata: Record<string, unknown> = {}) {
    return platformEventService.recordEvent({ tenantId, category: "APPROVAL", type, entityType: "ApprovalRequest", entityId: request.id, actorId: String(metadata.actor ?? request.requestedBy ?? "system"), sourceSystem: "approval-authority-engine", metadata: { ...metadata, actionId: request.actionId, approvalType: request.approvalType, riskLevel: request.riskLevel, status: request.status } });
  }
}

export const approvalAuthorityEngine = new ApprovalAuthorityEngine();
export function evaluateApprovalAuthority(tenantId: string, actionId: string, options?: ApprovalAuthorityEvaluationOptions) { return approvalAuthorityEngine.evaluateApprovalAuthority(tenantId, actionId, options); }
export function createApprovalRequest(input: CreateApprovalRequestInput) { return approvalAuthorityEngine.createApprovalRequest(input); }
export function submitApprovalRequest(tenantId: string, requestId: string) { return approvalAuthorityEngine.submitApprovalRequest(tenantId, requestId); }
export function approveRequest(tenantId: string, requestId: string, approverId: string, comment?: string) { return approvalAuthorityEngine.approveRequest(tenantId, requestId, approverId, comment); }
export function rejectRequest(tenantId: string, requestId: string, approverId: string, comment?: string) { return approvalAuthorityEngine.rejectRequest(tenantId, requestId, approverId, comment); }
export function cancelRequest(tenantId: string, requestId: string, actor?: string) { return approvalAuthorityEngine.cancelRequest(tenantId, requestId, actor); }
export function expireRequest(tenantId: string, requestId: string) { return approvalAuthorityEngine.expireRequest(tenantId, requestId); }
