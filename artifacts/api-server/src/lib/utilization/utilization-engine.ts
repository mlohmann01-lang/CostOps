import type { UtilizationBand, UtilizationInput, UtilizationRecord, UtilizationSummary } from "./utilization-types";

export function utilizationBandFor(utilizationPercent: number): UtilizationBand {
  if (utilizationPercent <= 0) return "UNUSED";
  if (utilizationPercent <= 25) return "LOW";
  if (utilizationPercent <= 60) return "MEDIUM";
  return "HIGH";
}

export function calculateUtilization(input: UtilizationInput): UtilizationRecord {
  const utilizationPercent = input.assignedCount > 0 ? Math.round((input.activeCount / input.assignedCount) * 100) : 0;
  const utilizationBand = utilizationBandFor(utilizationPercent);
  const unusedRatio = input.assignedCount > 0 ? Math.max(0, (input.assignedCount - input.activeCount) / input.assignedCount) : 0;
  const wasteEstimate = utilizationBand === "HIGH" ? 0 : Math.round(input.monthlyCost * unusedRatio);
  return { ...input, utilizationPercent, utilizationBand, wasteEstimate };
}

export function summarizeUtilization(records: UtilizationRecord[], generatedOpportunities = 0): UtilizationSummary {
  return { assetsAnalysed: records.reduce((sum, record) => sum + record.assignedCount, 0), unusedValue: records.reduce((sum, record) => sum + record.wasteEstimate, 0), lowUtilization: records.filter((record) => record.utilizationBand === "LOW" || record.utilizationBand === "UNUSED").length, generatedOpportunities };
}
