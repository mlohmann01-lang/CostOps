export function evaluateExecutionPolicy(input: {
  actionType: string;
  actionRiskClass: string;
  rollbackSupported: boolean;
  lifecycleState: string;
  connectorHealth: "HEALTHY"|"DEGRADED"|"DOWN";
  approvalStale: boolean;
  governanceChainComplete: boolean;
  executionMode: string;
}) {
  const blocks: string[] = [];
  if (input.actionType !== "REMOVE_LICENSE") blocks.push("UNSUPPORTED_ACTION");
  if (!["A", "B"].includes(input.actionRiskClass)) blocks.push("UNSUPPORTED_RISK_CLASS");
  if (!input.rollbackSupported) blocks.push("ROLLBACK_REQUIRED");
  if (input.lifecycleState !== "TRUSTED") blocks.push("LIFECYCLE_NOT_TRUSTED");
  if (input.connectorHealth !== "HEALTHY") blocks.push("CONNECTOR_UNHEALTHY");
  if (input.approvalStale) blocks.push("APPROVAL_STALE");
  if (!input.governanceChainComplete) blocks.push("INCOMPLETE_GOVERNANCE_CHAIN");
  if (input.executionMode === "AUTO_EXECUTE_SAFE") blocks.push("AUTO_EXECUTE_GLOBALLY_DISABLED");
  return { allowed: blocks.length === 0, blocks };
}
