import type { ActionRiskProfile } from "../action-risk";

export type ActorRole = "ADMIN" | "APPROVER" | "VIEWER";

export type AuthorizationResult = {
  allowed: boolean;
  reason: string;
  actorId: string;
  tenantId: string;
  role?: ActorRole;
};

const ACTOR_REGISTRY: Record<string, { tenantId: string; role: ActorRole }> = {
  "admin@contoso.com": { tenantId: "default", role: "ADMIN" },
  "approver@contoso.com": { tenantId: "default", role: "APPROVER" },
  "viewer@contoso.com": { tenantId: "default", role: "VIEWER" },
};

function authorize(actorId: string | undefined, tenantId: string, actionRiskProfile?: ActionRiskProfile): AuthorizationResult {
  if (!actorId) {
    return { allowed: false, reason: "MISSING_ACTOR_ID", actorId: actorId ?? "", tenantId };
  }

  const actor = ACTOR_REGISTRY[actorId];
  if (!actor) {
    return { allowed: false, reason: "UNKNOWN_ACTOR", actorId, tenantId };
  }

  if (actor.tenantId !== tenantId) {
    return { allowed: false, reason: "ACTOR_TENANT_MISMATCH", actorId, tenantId, role: actor.role };
  }

  if (actor.role === "VIEWER") {
    return { allowed: false, reason: "INSUFFICIENT_ROLE", actorId, tenantId, role: actor.role };
  }

  if (actionRiskProfile?.riskClass === "C") {
    return { allowed: false, reason: "ACTION_RISK_CLASS_C_BLOCKED", actorId, tenantId, role: actor.role };
  }

  if (actionRiskProfile?.riskClass === "B" && !["ADMIN", "APPROVER"].includes(actor.role)) {
    return { allowed: false, reason: "CLASS_B_REQUIRES_APPROVER", actorId, tenantId, role: actor.role };
  }

  return { allowed: true, reason: "AUTHORIZED", actorId, tenantId, role: actor.role };
}

export function canApprove(actorId: string | undefined, tenantId: string, recommendation: any): AuthorizationResult {
  return authorize(actorId, tenantId, recommendation?.actionRiskProfile);
}

export function canExecute(actorId: string | undefined, tenantId: string, recommendation: any): AuthorizationResult {
  return authorize(actorId, tenantId, recommendation?.actionRiskProfile);
}
