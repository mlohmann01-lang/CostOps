import type { Opportunity, OpportunityReadiness, OpportunitySource } from "../opportunities/opportunity-types";
import type { ExecutivePriority, ExecutivePriorityBand, ExecutiveRiskLevel, ExecutionEase, StrategicImportance, TimeToRealize } from "./executive-priority-types";

const readinessScore: Record<OpportunityReadiness, number> = { ELIGIBLE: 100, APPROVAL_REQUIRED: 75, MANUAL_ONLY: 45, BLOCKED: 20 };
const easeScore: Record<ExecutionEase, number> = { EASY: 100, MODERATE: 65, HARD: 35 };
const timeScore: Record<TimeToRealize, number> = { IMMEDIATE: 100, SHORT: 75, MEDIUM: 50, LONG: 25 };
const strategicScore: Record<StrategicImportance, number> = { HIGH: 100, MEDIUM: 60, LOW: 30 };

const sourceDefaults: Record<OpportunitySource, { strategicImportance: StrategicImportance; timeToRealize: TimeToRealize; executionEase: ExecutionEase }> = {
  TRUST: { strategicImportance: "MEDIUM", timeToRealize: "SHORT", executionEase: "MODERATE" },
  VENDOR_CHANGE: { strategicImportance: "HIGH", timeToRealize: "MEDIUM", executionEase: "MODERATE" },
  RENEWAL: { strategicImportance: "HIGH", timeToRealize: "SHORT", executionEase: "MODERATE" },
  BENCHMARK: { strategicImportance: "MEDIUM", timeToRealize: "MEDIUM", executionEase: "MODERATE" },
  CONTRACT: { strategicImportance: "HIGH", timeToRealize: "SHORT", executionEase: "MODERATE" },
  DRIFT: { strategicImportance: "HIGH", timeToRealize: "IMMEDIATE", executionEase: "EASY" },
  UTILIZATION: { strategicImportance: "MEDIUM", timeToRealize: "SHORT", executionEase: "EASY" },
};

function clamp(score: number) { return Math.max(0, Math.min(100, Math.round(score))); }
function band(score: number): ExecutivePriorityBand { return score >= 85 ? "CRITICAL" : score >= 70 ? "HIGH" : score >= 50 ? "MEDIUM" : "LOW"; }
function riskFor(opportunity: Opportunity): ExecutiveRiskLevel { if (opportunity.urgency === "CRITICAL" && opportunity.readiness === "BLOCKED") return "CRITICAL"; if (opportunity.readiness === "BLOCKED" || opportunity.trustScore < 65) return "HIGH"; if (opportunity.readiness === "MANUAL_ONLY" || opportunity.confidenceScore < 75) return "MEDIUM"; return "LOW"; }
function easeFor(opportunity: Opportunity, base: ExecutionEase): ExecutionEase { if (opportunity.readiness === "ELIGIBLE" && base !== "HARD") return "EASY"; if (opportunity.readiness === "BLOCKED") return "HARD"; return base; }
function nextAction(readiness: OpportunityReadiness) { return readiness === "ELIGIBLE" ? "Move to execution queue" : readiness === "APPROVAL_REQUIRED" ? "Submit for approval" : readiness === "BLOCKED" ? "Resolve trust blockers" : "Review manually"; }

export function scoreExecutiveOpportunity(opportunity: Opportunity, maxMonthlySavings: number): Omit<ExecutivePriority, "priorityRank"> {
  const defaults = sourceDefaults[opportunity.source];
  const executionEase = easeFor(opportunity, defaults.executionEase);
  const timeToRealize = defaults.timeToRealize;
  const strategicImportance = defaults.strategicImportance;
  const riskLevel = riskFor(opportunity);
  const valueScore = Math.min(100, (opportunity.projectedMonthlySavings / Math.max(1, maxMonthlySavings)) * 100);
  let executiveScore = valueScore * 0.3 + readinessScore[opportunity.readiness] * 0.2 + opportunity.trustScore * 0.15 + opportunity.confidenceScore * 0.15 + strategicScore[strategicImportance] * 0.1 + timeScore[timeToRealize] * 0.05 + easeScore[executionEase] * 0.05;
  if (riskLevel === "HIGH") executiveScore -= 10;
  if (riskLevel === "CRITICAL") executiveScore -= 20;
  if (opportunity.readiness === "BLOCKED") executiveScore -= 25;
  if (opportunity.readiness === "MANUAL_ONLY") executiveScore -= 15;
  if (opportunity.trustScore < 60) executiveScore -= 15;
  const roundedScore = clamp(executiveScore);
  const rationale = ["Scoring dimensions estimated from opportunity source"];
  if (opportunity.projectedMonthlySavings >= maxMonthlySavings * 0.5) rationale.push("High projected monthly savings");
  if (opportunity.readiness === "ELIGIBLE") rationale.push("Ready for execution");
  if (opportunity.readiness === "APPROVAL_REQUIRED") rationale.push("Approval required but high value");
  if (opportunity.readiness === "BLOCKED") rationale.push("Blocked by readiness constraints");
  if (opportunity.trustScore < 60) rationale.push("Low trust score reduces priority");
  if (timeToRealize === "IMMEDIATE" || timeToRealize === "SHORT") rationale.push("Fast time-to-realize");
  if (strategicImportance === "HIGH") rationale.push(opportunity.source === "RENEWAL" || opportunity.source === "CONTRACT" ? "Strategically important renewal window" : "Strategically important opportunity source");
  return { priorityId: `prio-${opportunity.id}`, tenantId: opportunity.tenantId, opportunityId: opportunity.id, title: opportunity.title, source: opportunity.source, domain: opportunity.domain, projectedMonthlySavings: opportunity.projectedMonthlySavings, projectedAnnualSavings: opportunity.projectedMonthlySavings * 12, trustScore: opportunity.trustScore, confidenceScore: opportunity.confidenceScore, readiness: opportunity.readiness, riskLevel, executionEase, timeToRealize, strategicImportance, executiveScore: roundedScore, priorityBand: band(roundedScore), rationale, recommendedNextAction: nextAction(opportunity.readiness), createdAt: opportunity.createdAt };
}

export function prioritizeExecutiveOpportunities(opportunities: Opportunity[]): ExecutivePriority[] {
  const maxMonthlySavings = Math.max(1, ...opportunities.map((opportunity) => opportunity.projectedMonthlySavings));
  return opportunities.map((opportunity) => scoreExecutiveOpportunity(opportunity, maxMonthlySavings)).sort((a, b) => b.executiveScore - a.executiveScore || b.projectedMonthlySavings - a.projectedMonthlySavings || a.title.localeCompare(b.title)).map((priority, index) => ({ ...priority, priorityRank: index + 1 }));
}
