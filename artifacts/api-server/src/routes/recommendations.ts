import { Router } from "express";
import { db } from "@workspace/db";
import { recommendationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

const MOCK_M365_USERS = [
  { email: "james.hartley@acme.com", displayName: "James Hartley", sku: "E5", cost: 57, days: 187 },
  { email: "priya.nair@acme.com", displayName: "Priya Nair", sku: "E3", cost: 36, days: 134 },
  { email: "tom.walsh@acme.com", displayName: "Tom Walsh", sku: "E5", cost: 57, days: 220 },
  { email: "sarah.kim@acme.com", displayName: "Sarah Kim", sku: "BUSINESS_PREMIUM", cost: 32, days: 98 },
  { email: "dev.service@acme.com", displayName: "Dev Service Account", sku: "E3", cost: 36, days: 312 },
  { email: "alex.morgan@acme.com", displayName: "Alex Morgan", sku: "E5", cost: 57, days: 67 },
  { email: "lisa.chen@acme.com", displayName: "Lisa Chen", sku: "E3", cost: 36, days: 156 },
  { email: "noreply.alerts@acme.com", displayName: "Alert Notifications", sku: "E1", cost: 12, days: 445 },
  { email: "raj.patel@acme.com", displayName: "Raj Patel", sku: "E5", cost: 57, days: 91 },
  { email: "emma.wilson@acme.com", displayName: "Emma Wilson", sku: "E3", cost: 36, days: 203 },
];

function computeTrust(user: { email: string; days: number }) {
  const isService = user.email.includes("service") || user.email.includes("noreply");
  const identityConf = isService ? 0.6 : 0.9;
  const freshness = Math.min(user.days / 180, 1);
  const signalConf = user.days > 90 ? 0.85 : 0.65;
  const score = identityConf * 0.4 + freshness * 0.3 + signalConf * 0.3;
  let executionStatus: string;
  if (score >= 0.9) executionStatus = "AUTO_EXECUTE";
  else if (score >= 0.75) executionStatus = "APPROVAL_REQUIRED";
  else if (score >= 0.5) executionStatus = "INVESTIGATE";
  else executionStatus = "BLOCKED";
  return { trustScore: Math.round(score * 1000) / 1000, executionStatus };
}

router.get("/", async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    let rows;
    if (status && status !== "all") {
      rows = await db
        .select()
        .from(recommendationsTable)
        .where(eq(recommendationsTable.status, status))
        .orderBy(desc(recommendationsTable.createdAt));
    } else {
      rows = await db
        .select()
        .from(recommendationsTable)
        .orderBy(desc(recommendationsTable.createdAt));
    }
    return res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Error listing recommendations");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const [rec] = await db.select().from(recommendationsTable).where(eq(recommendationsTable.id, id));
    if (!rec) return res.status(404).json({ error: "Recommendation not found" });
    return res.json(rec);
  } catch (err) {
    req.log.error({ err }, "Error fetching recommendation");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/generate", async (req, res) => {
  try {
    const generated = [];
    for (const user of MOCK_M365_USERS) {
      const [existing] = await db
        .select()
        .from(recommendationsTable)
        .where(and(eq(recommendationsTable.userEmail, user.email), eq(recommendationsTable.status, "pending")));
      if (existing) continue;

      const { trustScore, executionStatus } = computeTrust(user);
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
          playbook: "INACTIVE_USER_LICENCE_RECLAIM",
          connector: "m365",
          lastActivity: new Date(Date.now() - user.days * 86_400_000),
          daysSinceActivity: user.days,
        })
        .returning();
      generated.push(rec);
    }
    return res.json({ generated: generated.length, recommendations: generated });
  } catch (err) {
    req.log.error({ err }, "Error generating recommendations");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/approve", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const [rec] = await db.select().from(recommendationsTable).where(eq(recommendationsTable.id, id));
    if (!rec) return res.status(404).json({ error: "Recommendation not found" });
    if (rec.status !== "pending") return res.status(400).json({ error: "Recommendation is not pending" });
    const [updated] = await db
      .update(recommendationsTable)
      .set({ status: "executed" })
      .where(eq(recommendationsTable.id, id))
      .returning();
    const { outcomeLedgerTable } = await import("@workspace/db");
    const [outcome] = await db
      .insert(outcomeLedgerTable)
      .values({
        recommendationId: rec.id,
        userEmail: rec.userEmail,
        displayName: rec.displayName,
        action: "REMOVE_LICENSE",
        licenceSku: rec.licenceSku,
        beforeCost: rec.monthlyCost,
        afterCost: 0,
        monthlySaving: rec.monthlyCost,
        annualisedSaving: rec.annualisedCost,
        approved: true,
        executed: true,
        executionMode: "SIMULATED",
        evidence: { trustScore: rec.trustScore, executionStatus: rec.executionStatus },
        approvedAt: new Date(),
        executedAt: new Date(),
      })
      .returning();
    return res.json({ recommendation: updated, outcome });
  } catch (err) {
    req.log.error({ err }, "Error approving recommendation");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/reject", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const [rec] = await db.select().from(recommendationsTable).where(eq(recommendationsTable.id, id));
    if (!rec) return res.status(404).json({ error: "Recommendation not found" });
    if (rec.status !== "pending") return res.status(400).json({ error: "Recommendation is not pending" });
    const reason = req.body?.reason as string | undefined;
    const [updated] = await db
      .update(recommendationsTable)
      .set({ status: "rejected", rejectionReason: reason ?? null })
      .where(eq(recommendationsTable.id, id))
      .returning();
    return res.json({ recommendation: updated });
  } catch (err) {
    req.log.error({ err }, "Error rejecting recommendation");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
