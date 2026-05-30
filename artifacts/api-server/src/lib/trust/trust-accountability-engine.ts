import type {
  TrustAccountabilityRollup,
  TrustResolutionTask,
  TrustResolutionTaskAccountabilityStatus,
  TrustResolutionTaskEscalationLevel,
  TrustResolutionTaskPriority,
  TrustResolutionTaskSlaStatus,
  TrustTaskOwner,
} from "./trust-resolution-task-types";

const HOUR_MS = 60 * 60 * 1000;
const escalationRank: Record<TrustResolutionTaskEscalationLevel, number> = { NONE: 0, MANAGER: 1, DIRECTOR: 2, EXECUTIVE: 3 };

export function slaHoursForPriority(priority: TrustResolutionTaskPriority) {
  if (priority === "HIGH") return 24;
  if (priority === "LOW") return 168;
  return 72;
}

export function assignDefaultOwner(findingType: string): TrustTaskOwner {
  const ownerName = ({
    IDENTITY_CONFLICT: "IAM Team",
    MISSING_OWNER: "IT Asset Management",
    STALE_SOURCE: "Connector Operations",
    CONNECTOR_DEGRADED: "Platform Operations",
    MISSING_USAGE_EVIDENCE: "M365 Operations",
    ENTITLEMENT_CONFLICT: "SAM Governance",
    POLICY_BLOCKED: "Governance Owner",
    UNKNOWN_COST_CENTRE: "Finance Operations",
  } as Record<string, string>)[findingType] ?? "Governance Operations";
  return { ownerId: ownerName.toLowerCase().replaceAll(" ", "-"), ownerName, ownerType: "TEAM" };
}

export function computeDueAt(createdAt: string, slaHours: number) {
  return new Date(new Date(createdAt).getTime() + slaHours * HOUR_MS).toISOString();
}

export function computeSlaStatus(task: Pick<TrustResolutionTask, "status" | "dueAt" | "slaHours">, now = new Date()): TrustResolutionTaskSlaStatus {
  if (task.status === "RESOLVED" || task.status === "DISMISSED") return "ON_TRACK";
  const due = new Date(task.dueAt).getTime();
  const atRiskAt = due - task.slaHours * HOUR_MS * 0.25;
  const current = now.getTime();
  if (current < atRiskAt) return "ON_TRACK";
  if (current <= due) return "AT_RISK";
  return "OVERDUE";
}

export function computeEscalationLevel(task: Pick<TrustResolutionTask, "status" | "dueAt" | "slaHours">, now = new Date()): TrustResolutionTaskEscalationLevel {
  if (task.status === "RESOLVED" || task.status === "DISMISSED") return "NONE";
  if (computeSlaStatus(task, now) !== "OVERDUE") return "NONE";
  const overdueHours = (now.getTime() - new Date(task.dueAt).getTime()) / HOUR_MS;
  if (overdueHours < 24) return "MANAGER";
  if (overdueHours <= 72) return "DIRECTOR";
  return "EXECUTIVE";
}

export function computeAccountabilityStatus(task: Pick<TrustResolutionTask, "status" | "owner" | "ownerName" | "ownerId" | "dueAt" | "slaHours" | "escalationLevel">, now = new Date()): TrustResolutionTaskAccountabilityStatus {
  if (task.status === "RESOLVED" || task.status === "DISMISSED") return "RESOLVED";
  const ownerAssigned = Boolean(task.ownerName || task.ownerId || task.owner);
  if (!ownerAssigned) return "UNASSIGNED";
  const computedEscalation = computeEscalationLevel(task, now);
  if (task.escalationLevel !== "NONE" || computedEscalation !== "NONE") return "ESCALATED";
  const sla = computeSlaStatus(task, now);
  if (sla === "OVERDUE") return "OVERDUE";
  if (sla === "AT_RISK") return "AT_RISK";
  return "ASSIGNED";
}

export function applyAccountabilityState(task: TrustResolutionTask, now = new Date()): TrustResolutionTask {
  const slaStatus = computeSlaStatus(task, now);
  const computedEscalation = computeEscalationLevel(task, now);
  const escalationLevel = task.escalationLevel === "NONE" ? computedEscalation : higherEscalation(task.escalationLevel, computedEscalation);
  return { ...task, slaStatus, escalationLevel, accountabilityStatus: computeAccountabilityStatus({ ...task, escalationLevel }, now) };
}

export function buildAccountabilityRollup(tasks: TrustResolutionTask[], now = new Date()): TrustAccountabilityRollup {
  const refreshed = tasks.map((task) => applyAccountabilityState(task, now));
  const generatedAt = now.toISOString();
  const currentMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const active = refreshed.filter((task) => task.status !== "RESOLVED" && task.status !== "DISMISSED");
  const highestEscalationLevel = active.reduce<TrustResolutionTaskEscalationLevel>((highest, task) => higherEscalation(highest, task.escalationLevel), "NONE");
  return {
    openTasks: refreshed.filter((task) => task.status === "OPEN").length,
    inProgressTasks: refreshed.filter((task) => task.status === "IN_PROGRESS").length,
    overdueTasks: active.filter((task) => task.slaStatus === "OVERDUE").length,
    atRiskTasks: active.filter((task) => task.slaStatus === "AT_RISK").length,
    escalatedTasks: active.filter((task) => task.escalationLevel !== "NONE" || task.accountabilityStatus === "ESCALATED").length,
    resolvedThisMonth: refreshed.filter((task) => task.resolvedAt?.startsWith(currentMonth)).length,
    blockedValueOpen: active.reduce((sum, task) => sum + Number(task.unlockValue ?? 0), 0),
    blockedValueOverdue: active.filter((task) => task.slaStatus === "OVERDUE").reduce((sum, task) => sum + Number(task.unlockValue ?? 0), 0),
    highestEscalationLevel,
    generatedAt,
  };
}

function higherEscalation(a: TrustResolutionTaskEscalationLevel, b: TrustResolutionTaskEscalationLevel): TrustResolutionTaskEscalationLevel {
  return escalationRank[b] > escalationRank[a] ? b : a;
}
