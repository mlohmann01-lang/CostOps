import { randomUUID } from "crypto";
import type { ChangeWindowType, GovernanceSchedule, ScheduleState } from "./types";
import { evaluateSchedulingPolicy } from "./scheduling-policy-engine";

export function buildSchedule(input:{tenantId:string; campaignId:string; executionRequests:any[]; dryRuns:any[]; scheduleName:string; changeWindowType:ChangeWindowType; scheduledStart:string; scheduledEnd:string; timezone:string; connectorHealth?:"HEALTHY"|"DEGRADED"; governanceComplexity?:number;}) : GovernanceSchedule {
  const rollbackSupported = input.executionRequests.filter((r)=>r.rollbackRequired!==false).length;
  const rollbackCoverage = Math.round((rollbackSupported/Math.max(1,input.executionRequests.length))*100);
  const riskScore = input.executionRequests.reduce((n,r)=>n + (String(r.actionRiskClass)==='A'?1:String(r.actionRiskClass)==='B'?2:String(r.actionRiskClass)==='C'?3:4),0)/Math.max(1,input.executionRequests.length);
  const riskLevel = riskScore<=1.5?"LOW":riskScore<=2.5?"MEDIUM":"HIGH";
  const policy = evaluateSchedulingPolicy({ executionRequests: input.executionRequests, dryRuns: input.dryRuns, connectorHealth: input.connectorHealth, rollbackCoverage });
  const approvalReadiness = policy.eligible ? "READY_FOR_REVIEW" : "NOT_READY";
  const state: ScheduleState = policy.eligible ? "REVIEW_READY" : "BLOCKED";
  const now = new Date().toISOString();
  return { scheduleId:`sch_${randomUUID()}`, tenantId:input.tenantId, campaignId:input.campaignId, executionRequestIds:input.executionRequests.map((r)=>String(r.executionRequestId)), scheduleName:input.scheduleName, changeWindowType:input.changeWindowType, scheduledStart:input.scheduledStart, scheduledEnd:input.scheduledEnd, timezone:input.timezone, riskLevel, approvalState: policy.eligible ? "APPROVAL_PENDING" : "BLOCKED", rollbackCoverage, executionMode:"MANUAL_SUPERVISION_ONLY", scheduleState:state, createdAt:now, updatedAt:now, governanceComplexity: Number(input.governanceComplexity ?? 0), approvalReadiness };
}
