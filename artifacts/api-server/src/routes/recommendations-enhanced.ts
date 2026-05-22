import { Router } from "express";
import { db, recommendationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

interface EnhancedRecommendation {
  id: number;
  name: string;
  description: string;
  domain: string;
  savingAmount: number;
  verdict: string;
  blastRadius: string;
  rollback: boolean;
  certId?: string;
  confidence: number;
  recurrence: string;
  proofChain: any[];
}

// Compute confidence score based on execution status
function computeConfidence(executionStatus: string): number {
  const statusMap: { [key: string]: number } = {
    GOVERNED_EXECUTION_ELIGIBLE: 90,
    APPROVAL_REQUIRED: 75,
    INVESTIGATE: 60,
    MANUAL_ONLY: 50,
    BLOCKED: 0,
    AUTO_EXECUTE: 95,
  };
  return statusMap[executionStatus] ?? 50;
}

// Compute recurrence based on blast radius
function computeRecurrence(riskClass: string): string {
  const riskToRecurrence: { [key: string]: string } = {
    A: "High",
    B: "Medium",
    C: "Low",
    D: "Low",
  };
  return riskToRecurrence[riskClass] ?? "Medium";
}

router.get("/", async (req, res) => {
  try {
    const tenantId = (req.query.tenantId as string) ?? "default";
    const domain = req.query.domain as string | undefined;
    const verdict = req.query.verdict as string | undefined;

    const rows = await db
      .select()
      .from(recommendationsTable)
      .where(eq(recommendationsTable.tenantId, tenantId))
      .orderBy(desc(recommendationsTable.createdAt));

    const enhanced: EnhancedRecommendation[] = rows
      .filter((rec) => !verdict || rec.executionStatus === verdict)
      .map((rec) => {
        const confidence = computeConfidence(rec.executionStatus);
        const recurrence = computeRecurrence(rec.recommendationRiskClass);

        return {
          id: rec.id,
          name: rec.displayName,
          description: `License: ${rec.licenceSku}, Monthly Cost: $${rec.monthlyCost}`,
          domain: domain ?? "M365",
          savingAmount: rec.expectedMonthlySaving || rec.monthlyCost,
          verdict: rec.executionStatus,
          blastRadius: rec.recommendationRiskClass === "A" ? "High" : rec.recommendationRiskClass === "B" ? "Medium" : "Low",
          rollback: true, // Assume rollback is generally available
          certId: rec.correlationId || undefined,
          confidence,
          recurrence,
          proofChain: rec.criticalBlockers as any[] || [],
        };
      });

    return res.json(enhanced);
  } catch (err) {
    req.log.error({ err }, "Error listing enhanced recommendations");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
