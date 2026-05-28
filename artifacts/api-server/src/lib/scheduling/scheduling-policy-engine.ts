export interface SchedulingPolicyInput { executionRequests:any[]; dryRuns:any[]; connectorHealth?:"HEALTHY"|"DEGRADED"; now?:Date; rollbackCoverage:number; }
export function evaluateSchedulingPolicy(input: SchedulingPolicyInput) {
  const reasons:string[]=[]; const now=input.now??new Date();
  if (input.executionRequests.some((r)=>String(r.executionState)!=="REQUESTED"&&String(r.executionState)!=="APPROVED_FOR_EXECUTION")) reasons.push("ONLY_EXECUTION_READY_REQUESTS_ELIGIBLE");
  for (const r of input.executionRequests) {
    const sim = input.dryRuns.find((d)=>String(d.executionRequestId)===String(r.executionRequestId));
    if (!sim || String(sim.simulationState)!=="READY_FOR_EXECUTION") reasons.push(`DRY_RUN_NOT_READY:${r.executionRequestId}`);
    if (new Date(r.expiresAt).getTime() < now.getTime()) reasons.push(`STALE_APPROVAL:${r.executionRequestId}`);
    if (["B","C","D"].includes(String(r.actionRiskClass)) && input.rollbackCoverage < 100) reasons.push(`ROLLBACK_COVERAGE_INCOMPLETE:${r.executionRequestId}`);
  }
  if (input.connectorHealth === "DEGRADED") reasons.push("DEGRADED_CONNECTOR_BLOCK");
  return { eligible: reasons.length===0, reasons };
}
