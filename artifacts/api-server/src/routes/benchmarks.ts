import { Router } from "express";
import { benchmarkRecoverableValue } from "../lib/benchmarks/benchmark-engine";
import { generateBenchmarkOpportunities } from "../lib/benchmarks/benchmark-opportunity-engine";
import { OpportunityRepository } from "../lib/opportunities/opportunity-repository";
import { BenchmarkRepository } from "../lib/benchmarks/benchmark-repository";

const router = Router();
const repo = new BenchmarkRepository();
const opportunityRepo = new OpportunityRepository();

function tenantIdFrom(req: any) { return String(req.tenantId ?? req.query.tenantId ?? "default"); }
function summary(benchmarks: ReturnType<BenchmarkRepository["list"]>) {
  const opportunities = generateBenchmarkOpportunities(benchmarks);
  return { benchmarksEvaluated: 24, highImpactGaps: benchmarks.filter((benchmark) => benchmark.impactLevel === "HIGH").length, recoverableValue: opportunities.reduce((sum, opportunity) => sum + opportunity.projectedMonthlySavings * 12, 0), generatedOpportunities: opportunities.length };
}

router.get("/", (req, res) => {
  const tenantId = tenantIdFrom(req);
  const benchmarks = repo.list(tenantId);
  return res.json({ tenantId, summary: summary(benchmarks), benchmarks: benchmarks.map((benchmark) => ({ ...benchmark, recoverableValue: benchmarkRecoverableValue(benchmark) })) });
});

router.get("/high-impact", (req, res) => {
  const tenantId = tenantIdFrom(req);
  return res.json({ tenantId, benchmarks: repo.highImpact(tenantId) });
});

router.get("/opportunities", (req, res) => {
  const tenantId = tenantIdFrom(req);
  return res.json({ tenantId, opportunities: opportunityRepo.getBySource(tenantId, "BENCHMARK") });
});

router.get("/:id", (req, res) => {
  const benchmark = repo.getById(tenantIdFrom(req), String(req.params.id));
  if (!benchmark) return res.status(404).json({ error: "BENCHMARK_NOT_FOUND" });
  return res.json({ ...benchmark, recoverableValue: benchmarkRecoverableValue(benchmark) });
});

export default router;
