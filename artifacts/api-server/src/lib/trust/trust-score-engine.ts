import type { TrustBand, TrustDimension, TrustScore } from "./trust-types";

export function trustBandForScore(score: number): TrustBand {
  const bounded = Math.max(0, Math.min(100, Math.round(score)));
  if (bounded >= 90) return "TRUSTED";
  if (bounded >= 75) return "HIGH";
  if (bounded >= 60) return "INVESTIGATE";
  if (bounded >= 40) return "LOW_CONFIDENCE";
  return "BLOCKED";
}

export function trustLabelForBand(band: TrustBand): string {
  switch (band) {
    case "TRUSTED": return "Trusted for governed execution";
    case "HIGH": return "High confidence with minor review items";
    case "INVESTIGATE": return "Investigate before execution";
    case "LOW_CONFIDENCE": return "Low confidence; evidence gaps block automation";
    case "BLOCKED": return "Blocked until trust issues are resolved";
  }
}

export function buildTrustScore(input: { score: number; reasons?: string[]; dimensions?: Partial<Record<TrustDimension, number>> }): TrustScore {
  const score = Math.max(0, Math.min(100, Math.round(input.score)));
  const band = trustBandForScore(score);
  const reasons = input.reasons?.filter(Boolean) ?? [];
  return {
    score,
    band,
    label: trustLabelForBand(band),
    reasons: reasons.length > 0 ? reasons : ["Trust score computed from available runtime evidence; no standalone percentage is shown without this reason."],
    dimensions: input.dimensions,
  };
}

export function combineTrustDimensions(dimensions: Partial<Record<TrustDimension, number>>, reasons: string[] = []): TrustScore {
  const values = Object.values(dimensions).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (values.length === 0) {
    return buildTrustScore({ score: 60, reasons: ["Source data incomplete; returning INVESTIGATE instead of inventing precision.", ...reasons], dimensions });
  }
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return buildTrustScore({ score: average, reasons, dimensions });
}
