import { Router } from "express";
import { db, outcomeLedgerTable, recommendationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

interface SpendTrend {
  month: string;
  spend: number;
  trend: number;
}

// Generate synthetic spend trend for demo purposes
function generateSyntheticTrend(months: number): SpendTrend[] {
  const result: SpendTrend[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);
    const month = date.toISOString().slice(0, 7); // YYYY-MM format

    // Simulate gradual increase in spend with some variance
    const baseSpend = 50000;
    const monthIndex = months - i;
    const spend = baseSpend + monthIndex * 2500 + Math.random() * 5000;
    const trend = monthIndex > 1 ? ((spend - (baseSpend + (monthIndex - 1) * 2500)) / (baseSpend + (monthIndex - 1) * 2500)) * 100 : 0;

    result.push({
      month,
      spend: Math.round(spend * 100) / 100,
      trend: Math.round(trend * 100) / 100,
    });
  }

  return result;
}

router.get("/", async (req, res) => {
  try {
    const tenantId = (req.query.tenantId as string) ?? "default";
    const months = Math.min(parseInt(req.query.months as string) || 6, 24);
    const domain = req.query.domain as string | undefined;

    // Try to calculate from outcome ledger
    const outcomes = await db
      .select()
      .from(outcomeLedgerTable)
      .where(eq(outcomeLedgerTable.tenantId, tenantId))
      .orderBy(desc(outcomeLedgerTable.createdAt))
      .limit(1000);

    if (outcomes.length > 0) {
      const spendByMonth: { [key: string]: number } = {};

      // Group outcomes by month
      for (const outcome of outcomes) {
        const month = outcome.createdAt.toISOString().slice(0, 7);
        if (!spendByMonth[month]) {
          spendByMonth[month] = 0;
        }
        spendByMonth[month] += outcome.monthlySaving;
      }

      const result: SpendTrend[] = [];
      const now = new Date();

      for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        const month = date.toISOString().slice(0, 7);

        const spend = spendByMonth[month] ?? 50000;
        const prevSpend = i < months - 1 ? result[result.length - 1]?.spend ?? 50000 : 50000;
        const trend = prevSpend > 0 ? ((spend - prevSpend) / prevSpend) * 100 : 0;

        result.push({
          month,
          spend: Math.round(spend * 100) / 100,
          trend: Math.round(trend * 100) / 100,
        });
      }

      return res.json(result);
    }

    // Fallback to synthetic data
    return res.json(generateSyntheticTrend(months));
  } catch (err) {
    req.log.error({ err }, "Error calculating spend trend");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
