import { Router } from "express";
import { analyzeContract, buildContractIntelligenceRow, summarizeContracts } from "../lib/contracts/contract-intelligence-engine";
import { OpportunityRepository } from "../lib/opportunities/opportunity-repository";
import { ContractRepository } from "../lib/contracts/contract-repository";

const router = Router();
const repo = new ContractRepository();
const opportunities = new OpportunityRepository();

function tenantIdFrom(req: any) { return String(req.tenantId ?? req.query.tenantId ?? "default"); }

router.get("/", (req, res) => {
  const tenantId = tenantIdFrom(req);
  const contracts = repo.list(tenantId);
  return res.json({ tenantId, summary: summarizeContracts(contracts), contracts: contracts.map(buildContractIntelligenceRow) });
});

router.get("/high-risk", (req, res) => {
  const tenantId = tenantIdFrom(req);
  return res.json({ tenantId, contracts: repo.highRisk(tenantId).map(buildContractIntelligenceRow) });
});

router.get("/opportunities", (req, res) => {
  const tenantId = tenantIdFrom(req);
  return res.json({ tenantId, opportunities: opportunities.getBySource(tenantId, "CONTRACT") });
});

router.get("/:id", (req, res) => {
  const contract = repo.getById(tenantIdFrom(req), String(req.params.id));
  if (!contract) return res.status(404).json({ error: "CONTRACT_NOT_FOUND" });
  return res.json(buildContractIntelligenceRow(contract));
});

export default router;
