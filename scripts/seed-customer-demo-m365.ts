import fs from "node:fs/promises";
import path from "node:path";
import { db, executionApprovalsTable, executionBatchesTable, executionGovernancePoliciesTable, executionOrchestrationPlansTable, executionOutcomeVerificationsTable, recommendationsTable, suppressedRecommendationsTable } from "../lib/db/src/index.ts";

export async function seedCustomerDemoM365() {
  const fixturePath = path.resolve(process.cwd(), "fixtures/customer-demo-scenario-m365.json");
  const raw = await fs.readFile(fixturePath, "utf8");
  const fixture = JSON.parse(raw) as any;
  const tenantId = fixture.tenantId;
  const now = new Date();
  const correlationId = `demo-seed:${now.toISOString()}`;

  const eligible = fixture.records.filter((r:any)=>!r.isAdmin && !r.isServiceAccount && r.lastActivityAt);
  const suppressed = fixture.records.filter((r:any)=>r.isAdmin || r.isServiceAccount || !r.lastActivityAt);

  await db.insert(recommendationsTable).values(eligible.slice(0,5).map((r:any, i:number)=>({
    tenantId, userEmail:`${r.userId}@contoso.demo`, displayName:r.displayName, licenceSku:r.assignedLicences[0] ?? "M365_E3", monthlyCost:r.monthlyLicenceCost, annualisedCost:r.monthlyLicenceCost*12,
    trustScore:0.86, entityTrustScore:0.88, recommendationTrustScore:0.85, executionReadinessScore:0.8, executionStatus:"READY_FOR_ORCHESTRATION", playbook:"m365_cost_control", playbookId:"m365_inactive_user_reclaim", playbookName:"Inactive User Reclaim",
    connector:"M365", actionType:"REMOVE_LICENSE", targetEntityId:r.userId, targetEntityType:"USER", expectedMonthlySaving:r.monthlyLicenceCost, expectedAnnualSaving:r.monthlyLicenceCost*12, recommendationStatus:"READY_FOR_ORCHESTRATION", correlationId:`${correlationId}:rec:${i}`
  })));

  await db.insert(suppressedRecommendationsTable).values(suppressed.map((r:any, i:number)=>({ tenantId, playbookId:"m365_inactive_user_reclaim", targetEntityId:r.userId, reasonCode:r.isAdmin?"ADMIN_ACCOUNT":"SUPPRESSION_MISSING_EVIDENCE", reasonText:"Demo suppression", evidenceSnapshot:r, correlationId:`${correlationId}:sup:${i}` })));

  const [plan] = await db.insert(executionOrchestrationPlansTable).values({ tenantId, workflowId:"demo-workflow", sourceRecommendationIds: eligible.slice(0,3).map((x:any)=>x.userId), playbookId:"m365_inactive_user_reclaim", planType:"SUPERVISED", status:"READY", riskClassMax:"B", blastRadiusScore:45, blastRadiusBand:"MEDIUM", approvalRequired:true, createdByActorId:"demo-seed", correlationId }).returning();
  const [policy] = await db.insert(executionGovernancePoliciesTable).values({ tenantId, policyName:"Contoso Demo Policy", description:"Demo-safe governance policy", policyType:"DEMO", enabled:true, requiresApprovalRiskClass:"B", maxAnnualizedSavingsWithoutApproval:10000, restrictedActionTypes:["DELETE_USER"], restrictedPlaybooks:["production_bulk_termination"], createdBy:"demo-seed", updatedBy:"demo-seed" }).returning();
  await db.insert(executionApprovalsTable).values({ tenantId, entityType:"ORCHESTRATION_PLAN", entityId:String(plan.id), approvalType:"PLAN_EXECUTION", requiredApprovals:1, currentApprovals:0, approvalStatus:"PENDING", requestedBy:"demo-seed", approvalEvidence:{policyId:policy.id, demo:true} });
  const [batch] = await db.insert(executionBatchesTable).values({ tenantId, planId:plan.id, status:"READY", readiness:"READY", blastRadiusScore:35, blastRadiusBand:"LOW", riskClassMax:"B", isSampleBatch:true, sampleBatchStatus:"COMPLETED", sampleOutcomeVerified:true }).returning();
  await db.insert(executionOutcomeVerificationsTable).values({ tenantId, outcomeLedgerId:`demo-ledger-${plan.id}`, planId:plan.id, queueItemId:1, batchId:batch.id, actionType:"REMOVE_LICENSE", targetEntityId:eligible[0].userId, expectedOutcome:"COST_REDUCTION", expectedMonthlySaving:eligible[0].monthlyLicenceCost, expectedAnnualSaving:eligible[0].monthlyLicenceCost*12, verificationStatus:"VERIFIED", verificationMethod:"LEDGER_ONLY", verificationEvidence:{demo:true,savingsProofState:"AVAILABLE"}, correlationId });

  return { tenantName: fixture.tenantName, tenantId, demoSeededAt: now.toISOString() };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedCustomerDemoM365().then((r)=>{ console.log(JSON.stringify(r, null, 2)); }).catch((e)=>{ console.error(e); process.exit(1); });
}
