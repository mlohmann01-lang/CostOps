import type {
  CreateTrustResolutionTaskInput,
  TrustResolutionTask,
  TrustResolutionTaskEvent,
  TrustResolutionTaskEscalationLevel,
  TrustResolutionTaskOwnerType,
  TrustResolutionTaskStatus,
} from "./trust-resolution-task-types";

function now() { return new Date().toISOString(); }
function taskKey(tenantId: string, taskId: string) { return `${tenantId}:${taskId}`; }
function findingKey(tenantId: string, findingId: string) { return `${tenantId}:${findingId}`; }

export class TrustResolutionTaskRepository {
  private static tasks = new Map<string, TrustResolutionTask>();
  private static byFinding = new Map<string, string>();
  private static events: TrustResolutionTaskEvent[] = [];
  private static counter = 0;

  create(input: CreateTrustResolutionTaskInput): { task: TrustResolutionTask; duplicate: boolean } {
    const existingId = TrustResolutionTaskRepository.byFinding.get(findingKey(input.tenantId, input.findingId));
    if (existingId) {
      const existing = TrustResolutionTaskRepository.tasks.get(taskKey(input.tenantId, existingId));
      if (existing && existing.status !== "DISMISSED") return { task: existing, duplicate: true };
    }
    const timestamp = input.createdAt ?? now();
    const owner = input.ownerName ?? input.owner ?? "Governance Operations";
    const task: TrustResolutionTask = {
      taskId: `trt-${++TrustResolutionTaskRepository.counter}-${Math.abs(hash(input.tenantId + input.findingId))}`,
      tenantId: input.tenantId,
      findingId: input.findingId,
      affectedRecommendationIds: input.affectedRecommendationIds,
      taskType: input.taskType,
      title: input.title,
      description: input.description,
      owner,
      ownerId: input.ownerId,
      ownerName: input.ownerName ?? owner,
      ownerType: input.ownerType ?? "TEAM",
      assignedAt: input.assignedAt ?? timestamp,
      status: "OPEN",
      priority: input.priority,
      unlockValue: input.unlockValue,
      resolutionHint: input.resolutionHint,
      slaHours: input.slaHours,
      dueAt: input.dueAt,
      slaStatus: input.slaStatus,
      escalationLevel: input.escalationLevel,
      accountabilityStatus: input.accountabilityStatus,
      createdAt: timestamp,
      updatedAt: timestamp,
      resolvedAt: null,
    };
    TrustResolutionTaskRepository.tasks.set(taskKey(task.tenantId, task.taskId), task);
    TrustResolutionTaskRepository.byFinding.set(findingKey(task.tenantId, task.findingId), task.taskId);
    return { task, duplicate: false };
  }

  list(tenantId: string): TrustResolutionTask[] {
    return Array.from(TrustResolutionTaskRepository.tasks.values()).filter((task) => task.tenantId === tenantId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  get(tenantId: string, taskId: string): TrustResolutionTask | null {
    return TrustResolutionTaskRepository.tasks.get(taskKey(tenantId, taskId)) ?? null;
  }

  setStatus(tenantId: string, taskId: string, status: TrustResolutionTaskStatus, patch: Partial<TrustResolutionTask> = {}): TrustResolutionTask | null {
    const task = this.get(tenantId, taskId);
    if (!task) return null;
    const timestamp = now();
    const resolvedAt = status === "RESOLVED" || status === "DISMISSED" ? (task.resolvedAt ?? timestamp) : task.resolvedAt;
    const updated: TrustResolutionTask = { ...task, ...patch, status, updatedAt: timestamp, resolvedAt };
    TrustResolutionTaskRepository.tasks.set(taskKey(tenantId, taskId), updated);
    return updated;
  }

  updateAccountability(tenantId: string, task: TrustResolutionTask): TrustResolutionTask {
    const updated = { ...task, updatedAt: now() };
    TrustResolutionTaskRepository.tasks.set(taskKey(tenantId, task.taskId), updated);
    return updated;
  }

  assign(tenantId: string, taskId: string, owner: { ownerId?: string; ownerName: string; ownerType?: TrustResolutionTaskOwnerType }, patch: Partial<TrustResolutionTask> = {}): TrustResolutionTask | null {
    const task = this.get(tenantId, taskId);
    if (!task) return null;
    const timestamp = now();
    const updated: TrustResolutionTask = {
      ...task,
      ...patch,
      owner: owner.ownerName,
      ownerId: owner.ownerId,
      ownerName: owner.ownerName,
      ownerType: owner.ownerType ?? "TEAM",
      assignedAt: timestamp,
      updatedAt: timestamp,
    };
    TrustResolutionTaskRepository.tasks.set(taskKey(tenantId, taskId), updated);
    return updated;
  }

  escalate(tenantId: string, taskId: string, escalationLevel: TrustResolutionTaskEscalationLevel, reason?: string, patch: Partial<TrustResolutionTask> = {}): TrustResolutionTask | null {
    const task = this.get(tenantId, taskId);
    if (!task) return null;
    const timestamp = now();
    const updated: TrustResolutionTask = { ...task, ...patch, escalationLevel, escalatedAt: timestamp, escalationReason: reason, updatedAt: timestamp };
    TrustResolutionTaskRepository.tasks.set(taskKey(tenantId, taskId), updated);
    return updated;
  }

  addEvent(event: TrustResolutionTaskEvent) { TrustResolutionTaskRepository.events.push(event); return event; }
  listEvents(tenantId: string) { return TrustResolutionTaskRepository.events.filter((event) => event.tenantId === tenantId); }

  clearForTests() {
    TrustResolutionTaskRepository.tasks.clear();
    TrustResolutionTaskRepository.byFinding.clear();
    TrustResolutionTaskRepository.events = [];
    TrustResolutionTaskRepository.counter = 0;
  }
}

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = Math.imul(31, h) + value.charCodeAt(i) | 0;
  return h;
}
