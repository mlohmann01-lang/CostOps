import type { TrustFinding } from "./trust-types";
import {
  applyAccountabilityState,
  assignDefaultOwner,
  buildAccountabilityRollup,
  computeAccountabilityStatus,
  computeDueAt,
  computeEscalationLevel,
  computeSlaStatus,
  slaHoursForPriority,
} from "./trust-accountability-engine";
import { TrustResolutionTaskRepository } from "./trust-resolution-task-repository";
import type {
  CreateTrustResolutionTaskInput,
  TrustResolutionTask,
  TrustResolutionTaskEscalationLevel,
  TrustResolutionTaskEvent,
  TrustResolutionTaskOwnerType,
  TrustResolutionTaskPriority,
  TrustResolutionTaskStatus,
} from "./trust-resolution-task-types";

function priorityForSeverity(severity: string): TrustResolutionTaskPriority {
  if (severity === "CRITICAL" || severity === "HIGH") return "HIGH";
  if (severity === "LOW") return "LOW";
  return "MEDIUM";
}

function titleForFinding(finding: TrustFinding) {
  return `${finding.findingType.replaceAll("_", " ").toLowerCase()} resolution`;
}

export class TrustResolutionTaskService {
  constructor(private readonly repo = new TrustResolutionTaskRepository()) {}

  createFromFinding(input: { tenantId: string; finding: TrustFinding; owner?: string; ownerId?: string; ownerName?: string; ownerType?: TrustResolutionTaskOwnerType; title?: string; description?: string; now?: Date }) {
    const createdAt = (input.now ?? new Date()).toISOString();
    const priority = priorityForSeverity(input.finding.severity);
    const slaHours = slaHoursForPriority(priority);
    const dueAt = computeDueAt(createdAt, slaHours);
    const defaultOwner = assignDefaultOwner(input.finding.findingType);
    const ownerName = input.ownerName ?? input.owner ?? defaultOwner.ownerName;
    const draft = {
      status: "OPEN" as const,
      owner: ownerName ?? "Governance Operations",
      ownerName,
      ownerId: input.ownerId ?? defaultOwner.ownerId,
      dueAt,
      slaHours,
      escalationLevel: "NONE" as const,
    };
    const createInput: CreateTrustResolutionTaskInput = {
      tenantId: input.tenantId,
      findingId: input.finding.findingId,
      affectedRecommendationIds: input.finding.affectedRecommendationIds,
      taskType: input.finding.findingType,
      title: input.title ?? titleForFinding(input.finding),
      description: input.description ?? input.finding.description,
      owner: ownerName,
      ownerId: input.ownerId ?? defaultOwner.ownerId,
      ownerName,
      ownerType: input.ownerType ?? defaultOwner.ownerType,
      assignedAt: createdAt,
      priority,
      unlockValue: input.finding.affectedValue,
      resolutionHint: input.finding.remediationHint,
      slaHours,
      dueAt,
      slaStatus: computeSlaStatus(draft, input.now ?? new Date()),
      escalationLevel: "NONE",
      accountabilityStatus: computeAccountabilityStatus(draft, input.now ?? new Date()),
      createdAt,
    };
    const result = this.repo.create(createInput);
    const task = applyAccountabilityState(result.task, input.now ?? new Date());
    this.repo.updateAccountability(input.tenantId, task);
    const events: TrustResolutionTaskEvent[] = [];
    if (!result.duplicate) events.push(this.emit("TRUST_RESOLUTION_TASK_CREATED", task, { duplicate: false, ownerName: task.ownerName, dueAt: task.dueAt }));
    return { task, duplicate: result.duplicate, events };
  }

  list(tenantId: string, now = new Date()) { return this.repo.list(tenantId).map((task) => this.refresh(task, now)); }
  get(tenantId: string, taskId: string, now = new Date()) { const task = this.repo.get(tenantId, taskId); return task ? this.refresh(task, now) : null; }

  setStatus(input: { tenantId: string; taskId: string; status: TrustResolutionTaskStatus; now?: Date }) {
    const before = this.repo.get(input.tenantId, input.taskId);
    if (!before) return null;
    const refreshed = applyAccountabilityState({ ...before, status: input.status, escalationLevel: input.status === "RESOLVED" || input.status === "DISMISSED" ? "NONE" : before.escalationLevel }, input.now ?? new Date());
    const task = this.repo.setStatus(input.tenantId, input.taskId, input.status, refreshed)!;
    const finalTask = this.refresh(task, input.now ?? new Date());
    const events = [this.emit("TRUST_RESOLUTION_TASK_STATUS_CHANGED", finalTask, { beforeStatus: before.status, afterStatus: finalTask.status, accountabilityStatus: finalTask.accountabilityStatus })];
    if (input.status === "RESOLVED") events.push(this.emit("TRUST_FINDING_RESOLVED", finalTask, { findingId: finalTask.findingId }));
    return { task: finalTask, events };
  }

  assign(input: { tenantId: string; taskId: string; ownerId?: string; ownerName: string; ownerType?: TrustResolutionTaskOwnerType; now?: Date }) {
    const before = this.repo.get(input.tenantId, input.taskId);
    if (!before) return null;
    if (before.status === "RESOLVED" || before.status === "DISMISSED") return { error: "TRUST_TASK_CLOSED" as const, task: before, events: [] };
    const provisional = { ...before, owner: input.ownerName, ownerId: input.ownerId, ownerName: input.ownerName, ownerType: input.ownerType ?? "TEAM" };
    const refreshed = applyAccountabilityState(provisional, input.now ?? new Date());
    const task = this.repo.assign(input.tenantId, input.taskId, { ownerId: input.ownerId, ownerName: input.ownerName, ownerType: input.ownerType }, refreshed)!;
    const finalTask = this.refresh(task, input.now ?? new Date());
    return { task: finalTask, events: [this.emit("TRUST_TASK_ASSIGNED", finalTask, { beforeOwner: before.ownerName ?? before.owner, afterOwner: finalTask.ownerName })] };
  }

  escalate(input: { tenantId: string; taskId: string; escalationLevel?: TrustResolutionTaskEscalationLevel; reason?: string; now?: Date }) {
    const before = this.repo.get(input.tenantId, input.taskId);
    if (!before) return null;
    if (before.status === "RESOLVED" || before.status === "DISMISSED") return { error: "TRUST_TASK_CLOSED" as const, task: before, events: [] };
    const level = input.escalationLevel ?? computeEscalationLevel(before, input.now ?? new Date());
    const refreshed = applyAccountabilityState({ ...before, escalationLevel: level }, input.now ?? new Date());
    const task = this.repo.escalate(input.tenantId, input.taskId, refreshed.escalationLevel, input.reason, refreshed)!;
    const finalTask = this.refresh(task, input.now ?? new Date());
    return { task: finalTask, events: [this.emit("TRUST_TASK_ESCALATED", finalTask, { escalationLevel: finalTask.escalationLevel, reason: input.reason ?? "SLA escalation" })] };
  }

  accountability(tenantId: string, now = new Date()) {
    const tasks = this.list(tenantId, now);
    const rollup = buildAccountabilityRollup(tasks, now);
    this.repo.addEvent({ eventType: "TRUST_ACCOUNTABILITY_ROLLUP_UPDATED", tenantId, taskId: "rollup", findingId: "rollup", createdAt: new Date().toISOString(), payload: rollup });
    return { tenantId, rollup, tasks };
  }

  overdue(tenantId: string, now = new Date()) {
    return this.list(tenantId, now).filter((task) => task.slaStatus === "OVERDUE" || task.escalationLevel !== "NONE" || task.accountabilityStatus === "ESCALATED");
  }

  private refresh(task: TrustResolutionTask, now: Date) {
    const refreshed = applyAccountabilityState(task, now);
    if (refreshed.slaStatus !== task.slaStatus || refreshed.escalationLevel !== task.escalationLevel || refreshed.accountabilityStatus !== task.accountabilityStatus) {
      this.repo.updateAccountability(task.tenantId, refreshed);
      if (refreshed.slaStatus === "OVERDUE" && task.slaStatus !== "OVERDUE") this.emit("TRUST_TASK_OVERDUE", refreshed, { dueAt: refreshed.dueAt });
      if (refreshed.slaStatus === "AT_RISK" && task.slaStatus !== "AT_RISK") this.emit("TRUST_TASK_AT_RISK", refreshed, { dueAt: refreshed.dueAt });
    }
    return refreshed;
  }

  private emit(eventType: TrustResolutionTaskEvent["eventType"], task: { tenantId: string; taskId: string; findingId: string }, payload: Record<string, unknown>) {
    return this.repo.addEvent({ eventType, tenantId: task.tenantId, taskId: task.taskId, findingId: task.findingId, createdAt: new Date().toISOString(), payload });
  }
}
