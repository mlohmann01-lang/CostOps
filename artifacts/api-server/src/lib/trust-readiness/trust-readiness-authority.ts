import { platformEventService } from "../events/platform-event-service";
import { governedActionService, type GovernedAction } from "../actions/governed-actions";

export type ReadinessVerdict = "ELIGIBLE" | "APPROVAL_REQUIRED" | "BLOCKED" | "NEVER_ELIGIBLE";
export type ReadinessConfidence = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
export type ReadinessDimension = "IDENTITY_TRUST" | "USAGE_TRUST" | "OWNERSHIP_TRUST" | "FINANCIAL_TRUST" | "CONNECTOR_TRUST" | "APPROVAL_TRUST" | "ROLLBACK_TRUST" | "EXECUTION_TRUST" | "EVIDENCE_TRUST";
export type ReadinessDimensionStatus = "PASS" | "WARN" | "FAIL" | "UNKNOWN";
export type MissingEvidenceType = "IDENTITY" | "USAGE" | "OWNER" | "FINANCIAL" | "APPROVAL" | "CONNECTOR" | "ROLLBACK" | "EXECUTION" | "OUTCOME";
export type RequiredReadinessActionType = "ASSIGN_OWNER" | "REFRESH_CONNECTOR" | "COLLECT_USAGE_EVIDENCE" | "COLLECT_FINANCIAL_EVIDENCE" | "REQUEST_APPROVAL" | "ADD_ROLLBACK_PLAN" | "MANUAL_REVIEW" | "BLOCK_EXECUTION";
export type RequiredReadinessOwnerRole = "APPLICATION_OWNER" | "FINANCE_OWNER" | "IT_OWNER" | "GOVERNANCE_OWNER" | "EXECUTIVE_SPONSOR" | "CERTEN_OPERATOR";
export type ReadinessPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ReadinessDimensionResult = { dimension: ReadinessDimension; status: ReadinessDimensionStatus; score: number; reason: string; evidenceIds: string[] };
export type ReadinessBlocker = { id: string; dimension: string; severity: ReadinessPriority; reason: string; requiredAction: string };
export type MissingEvidence = { id: string; evidenceType: MissingEvidenceType; reason: string; requiredSource?: string };
export type RequiredReadinessAction = { id: string; actionType: RequiredReadinessActionType; ownerRole: RequiredReadinessOwnerRole; priority: ReadinessPriority; description: string };
export type ReadinessAuthorityReport = { id: string; tenantId: string; actionId: string; verdict: ReadinessVerdict; confidence: ReadinessConfidence; generatedAt: string; dimensions: ReadinessDimensionResult[]; blockers: ReadinessBlocker[]; missingEvidence: MissingEvidence[]; requiredActions: RequiredReadinessAction[]; evidenceIds: string[]; summary: string };

export type ReadinessAuthorityContext = {
  connectorStatus?: "CONNECTED" | "DEGRADED" | "DISCONNECTED" | "MISSING";
  executionMode?: "READ_ONLY" | "APPROVAL_REQUIRED" | "AUTO_EXECUTE_SAFE" | "SIMULATION" | "MANUAL" | "CONTROLLED";
  executionType?: string;
  rollbackSupported?: boolean;
  approvalPresent?: boolean;
};

const supportedExecutionTypes = new Set(["OWNER_ASSIGN", "AI_ASSET_APPROVE", "AI_ASSET_RETIRE", "TICKET_CREATE"]);
function now() { return new Date().toISOString(); }
function id(prefix: string) { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`; }
function evidence(action: GovernedAction, patterns: string[]) { return action.evidenceIds.filter((e) => patterns.some((p) => e.toLowerCase().includes(p))); }
function dim(dimension: ReadinessDimension, status: ReadinessDimensionStatus, score: number, reason: string, evidenceIds: string[] = []): ReadinessDimensionResult { return { dimension, status, score, reason, evidenceIds }; }
function blocker(dimension: string, severity: ReadinessPriority, reason: string, requiredAction: string): ReadinessBlocker { return { id: id("readiness-blocker"), dimension, severity, reason, requiredAction }; }
function missing(evidenceType: MissingEvidenceType, reason: string, requiredSource?: string): MissingEvidence { return { id: id("missing-evidence"), evidenceType, reason, requiredSource }; }
function required(actionType: RequiredReadinessActionType, ownerRole: RequiredReadinessOwnerRole, priority: ReadinessPriority, description: string): RequiredReadinessAction { return { id: id("readiness-action"), actionType, ownerRole, priority, description }; }

export class TrustReadinessAuthorityRepository {
  private readonly reports = new Map<string, ReadinessAuthorityReport>();
  private key(tenantId: string, actionId: string) { return `${tenantId}:${actionId}`; }
  save(report: ReadinessAuthorityReport) { this.reports.set(this.key(report.tenantId, report.actionId), report); return report; }
  get(tenantId: string, actionId: string) { return this.reports.get(this.key(tenantId, actionId)) ?? null; }
  list(tenantId: string) { return Array.from(this.reports.values()).filter((report) => report.tenantId === tenantId); }
  clear() { this.reports.clear(); }
}

export class TrustReadinessAuthorityService {
  constructor(private readonly repository = new TrustReadinessAuthorityRepository()) {}
  getReport(tenantId: string, actionId: string) { return this.repository.get(tenantId, actionId); }
  clear() { this.repository.clear(); }

  async evaluate(tenantId: string, actionId: string, context: ReadinessAuthorityContext = {}) {
    const action = await governedActionService.get(tenantId, actionId);
    if (!action) throw new Error("ACTION_NOT_FOUND");
    const dimensions = this.evaluateDimensions(action, context);
    const blockers: ReadinessBlocker[] = [];
    const missingEvidence: MissingEvidence[] = [];
    const requiredActions: RequiredReadinessAction[] = [];

    const add = (dimension: string, severity: ReadinessPriority, reason: string, requiredAction: string, actionType: RequiredReadinessActionType, ownerRole: RequiredReadinessOwnerRole, evidence?: MissingEvidence) => {
      blockers.push(blocker(dimension, severity, reason, requiredAction));
      requiredActions.push(required(actionType, ownerRole, severity, requiredAction));
      if (evidence) missingEvidence.push(evidence);
    };

    for (const result of dimensions) {
      if (result.status !== "FAIL" && result.status !== "WARN" && result.status !== "UNKNOWN") continue;
      if (result.dimension === "OWNERSHIP_TRUST" && result.status === "FAIL") add(result.dimension, "HIGH", result.reason, "Assign an accountable owner before execution.", "ASSIGN_OWNER", "APPLICATION_OWNER", missing("OWNER", "Owner evidence is missing.", "Application owner directory"));
      if (result.dimension === "CONNECTOR_TRUST") add(result.dimension, result.status === "FAIL" ? "HIGH" : "MEDIUM", result.reason, "Refresh or reconnect the execution connector.", "REFRESH_CONNECTOR", "IT_OWNER", missing("CONNECTOR", "Connector readiness evidence is missing or degraded.", "Connector runtime"));
      if (result.dimension === "APPROVAL_TRUST") add(result.dimension, result.status === "FAIL" ? "HIGH" : "MEDIUM", result.reason, "Request approval from the required approver.", "REQUEST_APPROVAL", "GOVERNANCE_OWNER", missing("APPROVAL", "Approval evidence is missing or rejected.", "Approval authority"));
      if (result.dimension === "ROLLBACK_TRUST") add(result.dimension, action.blastRadius === "HIGH" && action.rollbackCapability === "NONE" ? "HIGH" : "MEDIUM", result.reason, "Add or validate rollback plan before execution.", "ADD_ROLLBACK_PLAN", "IT_OWNER", missing("ROLLBACK", "Rollback evidence is incomplete.", "Rollback plan"));
      if (result.dimension === "EXECUTION_TRUST" && result.status === "FAIL") add(result.dimension, action.status === "CLOSED" || action.status === "CANCELLED" ? "CRITICAL" : "HIGH", result.reason, "Block execution until execution type and action state are supported.", "BLOCK_EXECUTION", "GOVERNANCE_OWNER", missing("EXECUTION", "Execution support evidence is missing.", "Execution connector registry"));
      if (result.dimension === "USAGE_TRUST" && result.status === "FAIL") add(result.dimension, "HIGH", result.reason, "Collect current usage evidence.", "COLLECT_USAGE_EVIDENCE", "CERTEN_OPERATOR", missing("USAGE", "Usage evidence is required for this action.", "Usage telemetry"));
      if (result.dimension === "FINANCIAL_TRUST" && result.status === "FAIL") add(result.dimension, "HIGH", result.reason, "Collect financial evidence.", "COLLECT_FINANCIAL_EVIDENCE", "FINANCE_OWNER", missing("FINANCIAL", "Financial evidence is required for this action.", "Cost ledger"));
      if (result.dimension === "EVIDENCE_TRUST" && result.status === "FAIL") add(result.dimension, "HIGH", result.reason, "Collect minimum execution evidence.", "MANUAL_REVIEW", "CERTEN_OPERATOR", missing("EXECUTION", "Evidence pack is empty.", "Evidence pack"));
      if (result.dimension === "IDENTITY_TRUST" && result.status === "FAIL") add(result.dimension, "HIGH", result.reason, "Resolve target identity or object reference.", "MANUAL_REVIEW", "IT_OWNER", missing("IDENTITY", "Target identity or object evidence is missing.", "Identity graph"));
    }

    const verdict = this.aggregateVerdict(dimensions, blockers);
    const confidence = this.aggregateConfidence(dimensions);
    const report: ReadinessAuthorityReport = { id: id("readiness-report"), tenantId, actionId, verdict, confidence, generatedAt: now(), dimensions, blockers, missingEvidence, requiredActions, evidenceIds: Array.from(new Set(dimensions.flatMap((d) => d.evidenceIds))), summary: `${verdict}: ${blockers.length} blocker(s), ${missingEvidence.length} missing evidence item(s), confidence ${confidence}.` };
    this.repository.save(report);
    await governedActionService.updateExecutionMetadata(tenantId, actionId, { readinessAuthorityVerdict: verdict, readinessAuthorityConfidence: confidence, readinessAuthorityGeneratedAt: report.generatedAt, readinessBlockerCount: blockers.length, missingEvidenceCount: missingEvidence.length, requiredReadinessActionCount: requiredActions.length });
    await platformEventService.recordEvent({ tenantId, category: "TRUST", type: "READINESS_AUTHORITY_EVALUATED", entityType: "GovernedAction", entityId: actionId, sourceSystem: "trust-readiness-authority", metadata: { verdict, confidence, blockerCount: blockers.length } });
    const verdictEvent = verdict === "BLOCKED" || verdict === "NEVER_ELIGIBLE" ? "READINESS_BLOCKED" : verdict === "APPROVAL_REQUIRED" ? "READINESS_APPROVAL_REQUIRED" : "READINESS_ELIGIBLE";
    await platformEventService.recordEvent({ tenantId, category: "TRUST", type: verdictEvent, entityType: "GovernedAction", entityId: actionId, sourceSystem: "trust-readiness-authority", metadata: { reportId: report.id, verdict } });
    return report;
  }

  dashboard(tenantId: string) {
    const reports = this.repository.list(tenantId);
    const topBlockers = reports.flatMap((r) => r.blockers).slice(0, 5);
    const requiredActions = reports.flatMap((r) => r.requiredActions).slice(0, 5);
    return { eligible: reports.filter((r) => r.verdict === "ELIGIBLE").length, approvalRequired: reports.filter((r) => r.verdict === "APPROVAL_REQUIRED").length, blocked: reports.filter((r) => r.verdict === "BLOCKED").length, neverEligible: reports.filter((r) => r.verdict === "NEVER_ELIGIBLE").length, highConfidence: reports.filter((r) => r.confidence === "HIGH").length, missingEvidence: reports.reduce((sum, r) => sum + r.missingEvidence.length, 0), topBlockers, requiredActions };
  }

  private evaluateDimensions(action: GovernedAction, context: ReadinessAuthorityContext) {
    const identity = evidence(action, ["identity", "user", "object"]);
    const usage = evidence(action, ["usage", "util", "activity"]);
    const financial = evidence(action, ["financial", "cost", "price", "saving"]);
    const connectorStatus = context.connectorStatus ?? ((action as any).connectorStatus as ReadinessAuthorityContext["connectorStatus"] | undefined) ?? (action.executionReadiness === "BLOCKED" ? "MISSING" : "CONNECTED");
    const executionType = context.executionType ?? (action as any).executionType ?? "TICKET_CREATE";
    const executionMode = context.executionMode ?? (action as any).executionMode ?? "CONTROLLED";
    return [
      dim("IDENTITY_TRUST", !action.sourceId ? "FAIL" : identity.length ? "PASS" : "UNKNOWN", identity.length ? 95 : action.sourceId ? 50 : 0, !action.sourceId ? "Target identity/object is missing." : identity.length ? "Identity/object evidence exists." : "No identity evidence was supplied.", identity),
      dim("USAGE_TRUST", usage.length ? "PASS" : action.domain === "M365" || action.domain === "SAAS" || action.domain === "AI" ? "FAIL" : "UNKNOWN", usage.length ? 90 : 0, usage.length ? "Current usage evidence exists." : "Usage evidence is missing or not applicable.", usage),
      dim("OWNERSHIP_TRUST", action.ownerId ? "PASS" : "FAIL", action.ownerId ? 100 : 0, action.ownerId ? "Owner is assigned." : "Owner missing for execution-capable action.", action.ownerId ? [action.ownerId] : []),
      dim("FINANCIAL_TRUST", action.actualAnnualValue || action.projectedAnnualValue || action.actualMonthlyValue || action.projectedMonthlyValue ? financial.length ? "PASS" : "WARN" : "FAIL", financial.length ? 90 : 50, financial.length ? "Financial evidence exists." : "Value exists but financial evidence is estimated or missing.", financial),
      dim("CONNECTOR_TRUST", connectorStatus === "CONNECTED" ? "PASS" : connectorStatus === "DEGRADED" ? "WARN" : "FAIL", connectorStatus === "CONNECTED" ? 100 : connectorStatus === "DEGRADED" ? 60 : 0, `Connector status is ${connectorStatus ?? "MISSING"}.`, connectorStatus === "CONNECTED" ? ["connector-connected"] : []),
      dim("APPROVAL_TRUST", action.status === "REJECTED" ? "FAIL" : action.status === "APPROVED" || action.readiness === "ELIGIBLE" || context.approvalPresent ? "PASS" : action.readiness === "APPROVAL_REQUIRED" || action.status === "AWAITING_APPROVAL" ? "WARN" : "UNKNOWN", action.status === "APPROVED" ? 100 : 60, "Approval state evaluated.", action.approverId ? [action.approverId] : []),
      dim("ROLLBACK_TRUST", action.rollbackCapability === "FULL" || context.rollbackSupported === true ? "PASS" : action.rollbackCapability === "PARTIAL" ? "WARN" : action.blastRadius === "HIGH" ? "FAIL" : "WARN", action.rollbackCapability === "FULL" ? 100 : action.rollbackCapability === "PARTIAL" ? 60 : 0, `Rollback capability is ${action.rollbackCapability}.`, evidence(action, ["rollback"])),
      dim("EXECUTION_TRUST", action.status === "CLOSED" || action.status === "CANCELLED" ? "FAIL" : !supportedExecutionTypes.has(String(executionType)) ? "FAIL" : executionMode === "MANUAL" || executionMode === "SIMULATION" || executionMode === "READ_ONLY" ? "WARN" : "PASS", supportedExecutionTypes.has(String(executionType)) ? 90 : 0, `Execution type ${executionType} with mode ${executionMode}.`, evidence(action, ["exec"])),
      dim("EVIDENCE_TRUST", action.evidenceIds.length === 0 && (action.blastRadius === "HIGH" || (action.projectedAnnualValue ?? 0) > 0) ? "FAIL" : action.evidenceIds.length < 2 ? "WARN" : "PASS", action.evidenceIds.length > 1 ? 90 : action.evidenceIds.length ? 60 : 0, "Evidence pack completeness evaluated.", action.evidenceIds),
    ];
  }

  private aggregateVerdict(dimensions: ReadinessDimensionResult[], blockers: ReadinessBlocker[]): ReadinessVerdict {
    if (blockers.some((b) => b.severity === "CRITICAL")) return "NEVER_ELIGIBLE";
    if (dimensions.some((d) => d.status === "FAIL" && ["CONNECTOR_TRUST", "IDENTITY_TRUST", "OWNERSHIP_TRUST", "EXECUTION_TRUST"].includes(d.dimension))) return "BLOCKED";
    if (dimensions.some((d) => d.dimension === "ROLLBACK_TRUST" && d.status === "FAIL")) return "APPROVAL_REQUIRED";
    if (dimensions.some((d) => d.status === "FAIL" || (d.status === "WARN" && ["APPROVAL_TRUST", "CONNECTOR_TRUST", "USAGE_TRUST", "FINANCIAL_TRUST", "ROLLBACK_TRUST", "EVIDENCE_TRUST", "EXECUTION_TRUST"].includes(d.dimension)))) return "APPROVAL_REQUIRED";
    return "ELIGIBLE";
  }

  private aggregateConfidence(dimensions: ReadinessDimensionResult[]): ReadinessConfidence {
    if (dimensions.some((d) => d.status === "FAIL")) return "LOW";
    if (dimensions.some((d) => d.status === "WARN")) return "MEDIUM";
    if (dimensions.some((d) => d.status === "UNKNOWN" && ["IDENTITY_TRUST", "OWNERSHIP_TRUST", "CONNECTOR_TRUST", "EVIDENCE_TRUST"].includes(d.dimension))) return "LOW";
    return dimensions.every((d) => d.status === "PASS" || d.status === "UNKNOWN") ? "HIGH" : "UNKNOWN";
  }
}

export const trustReadinessAuthorityService = new TrustReadinessAuthorityService();
export function evaluateReadinessAuthority(tenantId: string, actionId: string, context?: ReadinessAuthorityContext) { return trustReadinessAuthorityService.evaluate(tenantId, actionId, context); }
