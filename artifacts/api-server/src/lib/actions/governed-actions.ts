import { platformEventService } from "../events/platform-event-service";

export type GovernedActionDomain = "M365" | "AI" | "SAAS" | "CLOUD" | "ITAM" | "DATA" | "OTHER";
export type GovernedActionSourceType = "OPPORTUNITY" | "RECOMMENDATION" | "GOVERNANCE_FINDING" | "DRIFT_EVENT" | "MANUAL";
export type GovernedActionStatus = "DISCOVERED" | "PRIORITISED" | "READY" | "AWAITING_APPROVAL" | "APPROVED" | "QUEUED" | "EXECUTING" | "EXECUTED" | "VERIFYING" | "VERIFIED" | "RETAINED" | "DRIFTED" | "CLOSED" | "CANCELLED" | "REJECTED";
export type GovernedActionPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type GovernedActionReadiness = "ELIGIBLE" | "APPROVAL_REQUIRED" | "BLOCKED";
export type GovernedActionBlastRadius = "LOW" | "MEDIUM" | "HIGH";
export type GovernedActionRollbackCapability = "FULL" | "PARTIAL" | "NONE";
export type GovernedActionEventType = "CREATED" | "PRIORITISED" | "APPROVAL_REQUESTED" | "APPROVED" | "REJECTED" | "QUEUED" | "EXECUTION_STARTED" | "EXECUTION_COMPLETED" | "VERIFICATION_STARTED" | "VERIFIED" | "RETAINED" | "DRIFT_DETECTED" | "CLOSED" | "CANCELLED";

export type GovernedAction = {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  domain: GovernedActionDomain;
  sourceType: GovernedActionSourceType;
  sourceId: string;
  ownerId?: string;
  approverId?: string;
  status: GovernedActionStatus;
  priority: GovernedActionPriority;
  readiness: GovernedActionReadiness;
  trustScore?: number;
  projectedMonthlyValue?: number;
  projectedAnnualValue?: number;
  actualMonthlyValue?: number;
  actualAnnualValue?: number;
  blastRadius: GovernedActionBlastRadius;
  rollbackCapability: GovernedActionRollbackCapability;
  recommendationIds: string[];
  evidenceIds: string[];
  outcomeIds: string[];
  executionReadiness?: "ELIGIBLE" | "APPROVAL_REQUIRED" | "BLOCKED" | "NEVER_ELIGIBLE";
  executionStatus?: "PLANNED" | "DRY_RUN" | "APPROVED" | "EXECUTING" | "COMPLETED" | "FAILED" | "ROLLED_BACK";
  latestExecutionId?: string;
  dryRunAvailable?: boolean;
  readinessAuthorityVerdict?: "ELIGIBLE" | "APPROVAL_REQUIRED" | "BLOCKED" | "NEVER_ELIGIBLE";
  readinessAuthorityConfidence?: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  readinessAuthorityGeneratedAt?: string;
  readinessBlockerCount?: number;
  missingEvidenceCount?: number;
  requiredReadinessActionCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type GovernedActionEvent = {
  id: string;
  tenantId: string;
  actionId: string;
  eventType: GovernedActionEventType;
  actor?: string;
  notes?: string;
  createdAt: string;
};

export type CreateGovernedActionInput = Omit<GovernedAction, "id" | "createdAt" | "updatedAt" | "recommendationIds" | "evidenceIds" | "outcomeIds"> & {
  id?: string;
  recommendationIds?: string[];
  evidenceIds?: string[];
  outcomeIds?: string[];
  createdAt?: string;
  updatedAt?: string;
};

type TransitionOptions = { tenantId?: string; actor?: string; notes?: string };
type OutcomeInput = { id?: string; outcomeId?: string; evidenceIds?: string[]; evidenceId?: string; actualMonthlyValue?: number; actualAnnualValue?: number; monthlyValue?: number; annualValue?: number } & Record<string, unknown>;
type EvidenceSource = "RECOMMENDATION" | "EXECUTION" | "OUTCOME" | "ACTION";

const validTransitions: Record<GovernedActionStatus, GovernedActionStatus[]> = {
  DISCOVERED: ["PRIORITISED"],
  PRIORITISED: ["READY", "CANCELLED"],
  READY: ["AWAITING_APPROVAL", "APPROVED", "REJECTED"],
  AWAITING_APPROVAL: ["APPROVED", "REJECTED"],
  APPROVED: ["QUEUED"],
  QUEUED: ["EXECUTING"],
  EXECUTING: ["EXECUTED", "CANCELLED"],
  EXECUTED: ["VERIFYING"],
  VERIFYING: ["VERIFIED", "DRIFTED"],
  VERIFIED: ["RETAINED", "DRIFTED"],
  RETAINED: ["DRIFTED", "CLOSED"],
  DRIFTED: ["READY", "CLOSED"],
  CLOSED: [],
  CANCELLED: [],
  REJECTED: [],
};

const eventByStatus: Partial<Record<GovernedActionStatus, GovernedActionEventType>> = {
  PRIORITISED: "PRIORITISED",
  AWAITING_APPROVAL: "APPROVAL_REQUESTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  QUEUED: "QUEUED",
  EXECUTING: "EXECUTION_STARTED",
  EXECUTED: "EXECUTION_COMPLETED",
  VERIFYING: "VERIFICATION_STARTED",
  VERIFIED: "VERIFIED",
  RETAINED: "RETAINED",
  DRIFTED: "DRIFT_DETECTED",
  CLOSED: "CLOSED",
  CANCELLED: "CANCELLED",
};

const ledgerTypeByEvent: Partial<Record<GovernedActionEventType, string>> = {
  CREATED: "GOVERNED_ACTION_CREATED",
  APPROVED: "GOVERNED_ACTION_APPROVED",
  REJECTED: "GOVERNED_ACTION_REJECTED",
  EXECUTION_STARTED: "GOVERNED_ACTION_EXECUTION_STARTED",
  EXECUTION_COMPLETED: "GOVERNED_ACTION_EXECUTION_COMPLETED",
  VERIFIED: "GOVERNED_ACTION_VERIFIED",
  RETAINED: "GOVERNED_ACTION_RETAINED",
  DRIFT_DETECTED: "GOVERNED_ACTION_DRIFTED",
  CLOSED: "GOVERNED_ACTION_CLOSED",
};

function now() { return new Date().toISOString(); }
function id(prefix: string) { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`; }
function uniq(values: Array<string | undefined | null>) { return Array.from(new Set(values.filter((value): value is string => typeof value === "string" && value.trim().length > 0))); }
function numberOrUndefined(value: unknown): number | undefined { return typeof value === "number" && Number.isFinite(value) ? value : undefined; }

function platformCategory(eventType: GovernedActionEventType) {
  if (eventType === "APPROVED" || eventType === "REJECTED" || eventType === "APPROVAL_REQUESTED") return "APPROVAL" as const;
  if (eventType === "EXECUTION_STARTED" || eventType === "EXECUTION_COMPLETED" || eventType === "QUEUED") return "EXECUTION" as const;
  if (eventType === "VERIFIED" || eventType === "RETAINED" || eventType === "VERIFICATION_STARTED") return "OUTCOME" as const;
  if (eventType === "DRIFT_DETECTED") return "DRIFT" as const;
  return "SYSTEM" as const;
}

function normalizeDomain(value: unknown): GovernedActionDomain {
  const raw = String(value ?? "").toUpperCase();
  if (["M365", "AI", "SAAS", "CLOUD", "ITAM", "DATA", "OTHER"].includes(raw)) return raw as GovernedActionDomain;
  if (raw.includes("MICROSOFT") || raw.includes("OFFICE") || raw.includes("M365")) return "M365";
  if (raw.includes("AWS") || raw.includes("AZURE") || raw.includes("GCP") || raw.includes("CLOUD")) return "CLOUD";
  if (raw.includes("SNOWFLAKE") || raw.includes("DATA")) return "DATA";
  if (raw.includes("AI")) return "AI";
  if (raw.includes("SAAS") || raw.includes("ATLASSIAN") || raw.includes("ADOBE")) return "SAAS";
  return "OTHER";
}

function priorityFromRecommendation(recommendation: Record<string, unknown>): GovernedActionPriority {
  const explicit = String(recommendation.priority ?? recommendation.severity ?? "").toUpperCase();
  if (["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(explicit)) return explicit as GovernedActionPriority;
  const annual = numberOrUndefined(recommendation.projectedAnnualSavings) ?? numberOrUndefined(recommendation.expectedAnnualSaving) ?? numberOrUndefined(recommendation.projectedAnnualValue) ?? 0;
  const risk = String(recommendation.actionRiskClass ?? recommendation.recommendationRiskClass ?? "").toUpperCase();
  if (annual >= 100000 || risk === "D") return "CRITICAL";
  if (annual >= 25000 || risk === "C") return "HIGH";
  if (annual >= 5000 || risk === "B") return "MEDIUM";
  return "LOW";
}

function readinessFromRecommendation(recommendation: Record<string, unknown>): GovernedActionReadiness {
  const raw = String(recommendation.executionReadiness ?? recommendation.recommendationExecutionMode ?? recommendation.readiness ?? recommendation.executionStatus ?? "").toUpperCase();
  if (raw.includes("BLOCKED") || raw.includes("NEVER") || raw.includes("MANUAL_ONLY")) return "BLOCKED";
  if (raw.includes("APPROVAL")) return "APPROVAL_REQUIRED";
  return "ELIGIBLE";
}

function statusFromReadiness(readiness: GovernedActionReadiness): GovernedActionStatus {
  if (readiness === "APPROVAL_REQUIRED") return "READY";
  if (readiness === "BLOCKED") return "DISCOVERED";
  return "READY";
}

function evidenceIdsFrom(value: unknown): string[] {
  if (Array.isArray(value)) return uniq(value.map((entry) => typeof entry === "string" ? entry : String((entry as Record<string, unknown>)?.id ?? (entry as Record<string, unknown>)?.evidenceId ?? "")));
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const fromRefs = evidenceIdsFrom(obj.proofReferences ?? obj.evidenceRefs ?? obj.evidenceIds ?? obj.sources);
    const direct = typeof obj.id === "string" ? [obj.id] : [];
    return uniq([...fromRefs, ...direct]);
  }
  return [];
}

export class GovernedActionTransitionError extends Error {
  constructor(readonly from: GovernedActionStatus, readonly to: GovernedActionStatus) {
    super(`INVALID_GOVERNED_ACTION_TRANSITION:${from}->${to}`);
  }
}

export class GovernedActionRepository {
  private readonly actions = new Map<string, GovernedAction>();
  private readonly events = new Map<string, GovernedActionEvent[]>();
  private key(tenantId: string, actionId: string) { return `${tenantId}:${actionId}`; }

  async create(input: CreateGovernedActionInput): Promise<GovernedAction> {
    const createdAt = input.createdAt ?? now();
    const action: GovernedAction = {
      ...input,
      id: input.id ?? id("gact"),
      status: input.status ?? "DISCOVERED",
      recommendationIds: uniq(input.recommendationIds ?? []),
      evidenceIds: uniq(input.evidenceIds ?? []),
      outcomeIds: uniq(input.outcomeIds ?? []),
      createdAt,
      updatedAt: input.updatedAt ?? createdAt,
    };
    this.actions.set(this.key(action.tenantId, action.id), action);
    await this.appendEvent(action.tenantId, { id: id("gaevt"), tenantId: action.tenantId, actionId: action.id, eventType: "CREATED", createdAt }, action);
    return action;
  }

  async upsert(action: GovernedAction): Promise<GovernedAction> {
    this.actions.set(this.key(action.tenantId, action.id), action);
    return action;
  }

  async get(tenantId: string, actionId: string) { return this.actions.get(this.key(tenantId, actionId)) ?? null; }
  async list(tenantId: string) { return Array.from(this.actions.values()).filter((action) => action.tenantId === tenantId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); }
  async history(tenantId: string, actionId: string) { return [...(this.events.get(this.key(tenantId, actionId)) ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt)); }
  async clear() { this.actions.clear(); this.events.clear(); }

  async appendEvent(tenantId: string, event: GovernedActionEvent, action?: GovernedAction, beforeStatus?: GovernedActionStatus) {
    const key = this.key(tenantId, event.actionId);
    this.events.set(key, [...(this.events.get(key) ?? []), event]);
    const ledgerType = ledgerTypeByEvent[event.eventType];
    if (ledgerType) {
      const entity = action ?? await this.get(tenantId, event.actionId);
      await platformEventService.recordEvent({
        tenantId,
        category: platformCategory(event.eventType),
        type: ledgerType,
        actorId: event.actor,
        entityType: "GovernedAction",
        entityId: event.actionId,
        description: event.notes,
        sourceSystem: "governed-action-lifecycle-engine",
        occurredAt: event.createdAt,
        metadata: { beforeState: beforeStatus, afterState: entity?.status, actionId: event.actionId },
      });
    }
    return event;
  }
}

export class GovernedActionService {
  constructor(private readonly repository = new GovernedActionRepository()) {}

  create(input: CreateGovernedActionInput) { return this.repository.create(input); }
  get(tenantId: string, actionId: string) { return this.repository.get(tenantId, actionId); }
  list(tenantId: string) { return this.repository.list(tenantId); }
  history(tenantId: string, actionId: string) { return this.repository.history(tenantId, actionId); }
  clear() { return this.repository.clear(); }

  async updateExecutionMetadata(tenantId: string, actionId: string, metadata: Partial<Pick<GovernedAction, "executionReadiness" | "executionStatus" | "latestExecutionId" | "dryRunAvailable" | "readinessAuthorityVerdict" | "readinessAuthorityConfidence" | "readinessAuthorityGeneratedAt" | "readinessBlockerCount" | "missingEvidenceCount" | "requiredReadinessActionCount" | "evidenceIds">>) {
    const action = await this.repository.get(tenantId, actionId);
    if (!action) return null;
    const updated: GovernedAction = {
      ...action,
      ...metadata,
      evidenceIds: uniq([...(action.evidenceIds ?? []), ...(metadata.evidenceIds ?? [])]),
      updatedAt: now(),
    };
    return this.repository.upsert(updated);
  }

  async transition(actionId: string, targetStatus: GovernedActionStatus, options: TransitionOptions = {}) {
    const tenantId = options.tenantId ?? "default";
    const action = await this.repository.get(tenantId, actionId);
    if (!action) return null;
    if (!validTransitions[action.status].includes(targetStatus)) throw new GovernedActionTransitionError(action.status, targetStatus);
    const beforeStatus = action.status;
    const updated: GovernedAction = { ...action, status: targetStatus, updatedAt: now() };
    await this.repository.upsert(updated);
    const eventType = eventByStatus[targetStatus];
    if (eventType) await this.repository.appendEvent(tenantId, { id: id("gaevt"), tenantId, actionId, eventType, actor: options.actor, notes: options.notes, createdAt: updated.updatedAt }, updated, beforeStatus);
    return updated;
  }

  async createFromRecommendation(recommendation: Record<string, unknown>, overrides: Partial<CreateGovernedActionInput> = {}) {
    const tenantId = String(overrides.tenantId ?? recommendation.tenantId ?? "default");
    const recommendationId = String(recommendation.recommendationId ?? recommendation.id ?? recommendation.sourceId ?? id("rec"));
    const readiness = overrides.readiness ?? readinessFromRecommendation(recommendation);
    const monthly = numberOrUndefined(recommendation.projectedMonthlySavings) ?? numberOrUndefined(recommendation.expectedMonthlySaving) ?? numberOrUndefined(recommendation.projectedMonthlyValue);
    const annual = numberOrUndefined(recommendation.projectedAnnualSavings) ?? numberOrUndefined(recommendation.expectedAnnualSaving) ?? numberOrUndefined(recommendation.projectedAnnualValue);
    return this.create({
      tenantId,
      title: String(overrides.title ?? recommendation.title ?? recommendation.playbookName ?? recommendation.actionType ?? "Governed recommendation action"),
      description: String(overrides.description ?? recommendation.description ?? recommendation.latestRationaleId ?? "Recommendation converted into governed action"),
      domain: overrides.domain ?? normalizeDomain(recommendation.domain ?? recommendation.connector ?? recommendation.playbookId ?? recommendation.playbook),
      sourceType: "RECOMMENDATION",
      sourceId: recommendationId,
      ownerId: overrides.ownerId,
      approverId: overrides.approverId,
      status: overrides.status ?? statusFromReadiness(readiness),
      priority: overrides.priority ?? priorityFromRecommendation(recommendation),
      readiness,
      trustScore: overrides.trustScore ?? numberOrUndefined(recommendation.trustScore) ?? numberOrUndefined(recommendation.confidenceScore),
      projectedMonthlyValue: overrides.projectedMonthlyValue ?? monthly,
      projectedAnnualValue: overrides.projectedAnnualValue ?? annual,
      blastRadius: overrides.blastRadius ?? (String(recommendation.actionRiskClass ?? recommendation.recommendationRiskClass ?? "B").toUpperCase() === "D" ? "HIGH" : String(recommendation.actionRiskClass ?? recommendation.recommendationRiskClass ?? "B").toUpperCase() === "C" ? "MEDIUM" : "LOW"),
      rollbackCapability: overrides.rollbackCapability ?? (String(recommendation.rollbackNotes ?? "").toUpperCase().includes("NONE") ? "NONE" : "PARTIAL"),
      recommendationIds: uniq([recommendationId, ...(overrides.recommendationIds ?? [])]),
      evidenceIds: uniq([...evidenceIdsFrom(recommendation.evidencePointers), ...evidenceIdsFrom(recommendation.playbookEvidence), ...evidenceIdsFrom(recommendation.evidenceSummary), ...(overrides.evidenceIds ?? [])]),
      outcomeIds: overrides.outcomeIds ?? [],
      ...overrides,
    });
  }

  async attachOutcome(actionId: string, outcome: OutcomeInput, options: { tenantId?: string; actor?: string; notes?: string } = {}) {
    const tenantId = options.tenantId ?? "default";
    const action = await this.repository.get(tenantId, actionId);
    if (!action) return null;
    const outcomeId = String(outcome.outcomeId ?? outcome.id ?? id("outcome"));
    const updated: GovernedAction = {
      ...action,
      outcomeIds: uniq([...action.outcomeIds, outcomeId]),
      evidenceIds: uniq([...action.evidenceIds, ...evidenceIdsFrom(outcome.evidenceIds), outcome.evidenceId]),
      actualMonthlyValue: numberOrUndefined(outcome.actualMonthlyValue) ?? numberOrUndefined(outcome.monthlyValue) ?? action.actualMonthlyValue,
      actualAnnualValue: numberOrUndefined(outcome.actualAnnualValue) ?? numberOrUndefined(outcome.annualValue) ?? action.actualAnnualValue,
      updatedAt: now(),
    };
    await this.repository.upsert(updated);
    if (updated.status === "VERIFYING") return this.transition(actionId, "VERIFIED", { tenantId, actor: options.actor, notes: options.notes ?? "Outcome attached and verification became eligible" });
    return updated;
  }

  async evidenceSummary(tenantId: string, actionId: string) {
    const action = await this.repository.get(tenantId, actionId);
    if (!action) return null;
    const categorize = (evidenceId: string): EvidenceSource => {
      const raw = evidenceId.toLowerCase();
      if (raw.includes("exec")) return "EXECUTION";
      if (raw.includes("outcome") || raw.includes("verify")) return "OUTCOME";
      if (raw.includes("rec") || action.recommendationIds.some((recId) => raw.includes(recId.toLowerCase()))) return "RECOMMENDATION";
      return "ACTION";
    };
    const evidence = action.evidenceIds.map((evidenceId) => ({ evidenceId, source: categorize(evidenceId) }));
    return {
      actionId,
      tenantId,
      totalEvidence: evidence.length,
      evidenceIds: action.evidenceIds,
      bySource: evidence.reduce<Record<EvidenceSource, string[]>>((acc, item) => {
        acc[item.source].push(item.evidenceId);
        return acc;
      }, { RECOMMENDATION: [], EXECUTION: [], OUTCOME: [], ACTION: [] }),
      recommendationIds: action.recommendationIds,
      outcomeIds: action.outcomeIds,
      evidence,
    };
  }

  async dashboard(tenantId: string) {
    const actions = await this.repository.list(tenantId);
    return {
      ready: actions.filter((action) => action.status === "READY").length,
      awaitingApproval: actions.filter((action) => action.status === "AWAITING_APPROVAL").length,
      approved: actions.filter((action) => action.status === "APPROVED").length,
      executing: actions.filter((action) => action.status === "EXECUTING").length,
      verifying: actions.filter((action) => action.status === "VERIFYING").length,
      verified: actions.filter((action) => action.status === "VERIFIED").length,
      retained: actions.filter((action) => action.status === "RETAINED").length,
      drifted: actions.filter((action) => action.status === "DRIFTED").length,
      blocked: actions.filter((action) => action.readiness === "BLOCKED").length,
      projectedValue: actions.reduce((sum, action) => sum + (action.projectedAnnualValue ?? action.projectedMonthlyValue ?? 0), 0),
      verifiedValue: actions.filter((action) => ["VERIFIED", "RETAINED", "CLOSED"].includes(action.status)).reduce((sum, action) => sum + (action.actualAnnualValue ?? action.actualMonthlyValue ?? 0), 0),
    };
  }
}

export const governedActionService = new GovernedActionService();

export function transitionGovernedAction(actionId: string, targetStatus: GovernedActionStatus, options?: TransitionOptions) {
  return governedActionService.transition(actionId, targetStatus, options);
}

export function createGovernedActionFromRecommendation(recommendation: Record<string, unknown>, overrides?: Partial<CreateGovernedActionInput>) {
  return governedActionService.createFromRecommendation(recommendation, overrides);
}

export function attachOutcomeToAction(actionId: string, outcome: OutcomeInput, options?: { tenantId?: string; actor?: string; notes?: string }) {
  return governedActionService.attachOutcome(actionId, outcome, options);
}

export function getActionEvidenceSummary(tenantId: string, actionId: string) {
  return governedActionService.evidenceSummary(tenantId, actionId);
}
