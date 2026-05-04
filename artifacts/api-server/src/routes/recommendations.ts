import { Router } from "express";
import { db } from "@workspace/db";
import { recommendationsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";

const router = Router();

const MOCK_USERS = [
  { email: "james.hartley@acme.com", displayName: "James Hartley", sku: "E5", cost: 57, days: 187 },
  { email: "priya.nair@acme.com", displayName: "Priya Nair", sku: "E3", cost: 36, days: 134 },
  { email: "tom.walsh@acme.com", displayName: "Tom Walsh", sku: "E5", cost: 57, days: 220 },
  { email: "sarah.kim@acme.com", displayName: "Sarah Kim", sku: "BUSINESS_PREMIUM", cost: 32, days: 98 },
  { email: "dev.service@acme.com", displayName: "Dev Service Account", sku: "E3", cost: 36, days: 312 },
  { email: "alex.morgan@acme.com", displayName: "Alex Morgan", sku: "E5", cost: 57, days: 67 },
  { email: "lisa.chen@acme.com", displayName: "Lisa Chen", sku: "E3", cost: 36, days: 156 },
  { email: "mike.johnson@acme.com", displayName: "Mike Johnson", sku: "BUSINESS_PREMIUM", cost: 32, days: 43 },
  { email: "noreply.system@acme.com", displayName: "No-Reply System", sku: "E3", cost: 36, days: 450 },
  { email: "rachel.adams@acme.com", displayName: "Rachel Adams", sku: "E5", cost: 57, days: 29 },
];

function calcTrustScore(days: number, email: string): number {
  const identityConf = email.includes("service") || email.includes("noreply") ? 0.6 : 0.9;
  const freshness = Math.min(days / 180, 1);
  const signalConf = days > 90 ? 0.85 : 0.65;
  return Math.round((identityConf * 0.4 + freshness * 0.3 + signalConf * 0.3) * 100) / 100;
}

function calcExecutionStatus(score: number): string {
  if (score >= 0.9) return "AUTO_EXECUTE";
  if (score >= 0.75) return "APPROVAL_REQUIRED";
  if (score >= 0.5) return "INVESTIGATE";
  return "BLOCKED";
}

router.get("/", async (req, res) => {
  try {
    const statusFilter = req.query.status as string | undefined;
    const playbookFilter = req.query.playbook as string | undefined;

    let rows = await db.select().from(recommendationsTable).orderBy(recommendationsTable.createdAt);

    if (statusFilter && statusFilter !== "all") {
      rows = rows.filter((r) => r.status === statusFilter);
    }
    if (playbookFilter) {
      rows = rows.filter((r) => r.playbook === playbookFilter);
    }

    res.json(
      rows.map((r) => ({
        id: r.id,
        userEmail: r.userEmail,
        displayName: r.displayName,
        licenceSku: r.licenceSku,
        monthlyCost: r.monthlyCost,
        annualisedCost: r.annualisedCost,
        trustScore: r.trustScore,
        executionStatus: r.executionStatus,
        status: r.status,
        playbook: r.playbook,
        connector: r.connector,
        lastActivity: r.lastActivity ? r.lastActivity.toISOString() : null,
        daysSinceActivity: r.daysSinceActivity,
        rejectionReason: r.rejectionReason,
        createdAt: r.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Error listing recommendations");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/generate", async (req, res) => {
  try {
    const generated = [];
    for (const user of MOCK_USERS) {
      const trustScore = calcTrustScore(user.days, user.email);
      const executionStatus = calcExecutionStatus(trustScore);
      const lastActivity = new Date(Date.now() - user.days * 24 * 60 * 60 * 1000);

      const [existing] = await db
        .select()
        .from(recommendationsTable)
        .where(and(eq(recommendationsTable.userEmail, user.email), eq(recommendationsTable.status, "pending")));

      if (existing) continue;

      const [rec] = await db
        .insert(recommendationsTable)
        .values({
          userEmail: user.email,
          displayName: user.displayName,
          licenceSku: user.sku,
          monthlyCost: user.cost,
          annualisedCost: user.cost * 12,
          trustScore,
          executionStatus,
          status: "pending",
          playbook: "inactive_user_licence_reclaim",
          connector: "m365",
          lastActivity,
          daysSinceActivity: user.days,
          rejectionReason: null,
        })
        .returning();

      generated.push({
        id: rec.id,
        userEmail: rec.userEmail,
        displayName: rec.displayName,
        licenceSku: rec.licenceSku,
        monthlyCost: rec.monthlyCost,
        annualisedCost: rec.annualisedCost,
        trustScore: rec.trustScore,
        executionStatus: rec.executionStatus,
        status: rec.status,
        playbook: rec.playbook,
        connector: rec.connector,
        lastActivity: rec.lastActivity ? rec.lastActivity.toISOString() : null,
        daysSinceActivity: rec.daysSinceActivity,
        rejectionReason: rec.rejectionReason,
        createdAt: rec.createdAt.toISOString(),
      });
    }

    res.json({ generated: generated.length, recommendations: generated });
  } catch (err) {
    req.log.error({ err }, "Error generating recommendations");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const [rec] = await db.select().from(recommendationsTable).where(eq(recommendationsTable.id, id));
    if (!rec) return res.status(404).json({ error: "Recommendation not found" });

    res.json({
      id: rec.id,
      userEmail: rec.userEmail,
      displayName: rec.displayName,
      licenceSku: rec.licenceSku,
      monthlyCost: rec.monthlyCost,
      annualisedCost: rec.annualisedCost,
      trustScore: rec.trustScore,
      executionStatus: rec.executionStatus,
      status: rec.status,
      playbook: rec.playbook,
      connector: rec.connector,
      lastActivity: rec.lastActivity ? rec.lastActivity.toISOString() : null,
      daysSinceActivity: rec.daysSinceActivity,
      rejectionReason: rec.rejectionReason,
      createdAt: rec.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching recommendation");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
