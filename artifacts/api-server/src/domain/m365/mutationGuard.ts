export interface M365MutationGuardContext {
  runtimeEnvironment?: string;
  tenantId?: string;
  actorId?: string;
  recommendationId?: string;
  approvalState?: string;
  riskClass?: string;
  trustScore?: number;
  connectorCapability?: string;
  idempotencyKey?: string;
}

export function assertLiveM365MutationAllowed(context: M365MutationGuardContext): void {
  if (process.env.ENABLE_LIVE_M365_EXECUTION !== "true") {
    throw new Error("Live M365 licence mutation is disabled in this beta runtime.");
  }

  if (context.runtimeEnvironment !== "LIVE") {
    throw new Error("Live M365 mutation requires LIVE runtime.");
  }

  if (!context.idempotencyKey) {
    throw new Error("Live M365 mutation requires an idempotency key.");
  }

  if (context.approvalState !== "APPROVED") {
    throw new Error("Live M365 mutation requires approved governance state.");
  }

  if (context.connectorCapability !== "GOVERNED_EXECUTION") {
    throw new Error("M365 connector is not enabled for governed execution.");
  }

  if ((context.trustScore ?? 0) < 90) {
    throw new Error("M365 mutation blocked because trust score is below threshold.");
  }

  if (context.riskClass !== "LOW") {
    throw new Error("M365 beta mutation only permits LOW risk actions.");
  }
}
