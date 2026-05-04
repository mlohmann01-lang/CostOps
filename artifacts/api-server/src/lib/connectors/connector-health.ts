import type { ConnectorHealth, FreshnessBand } from "./types";

export function freshnessBandFromDays(days: number | null): FreshnessBand {
  if (days == null) return "UNKNOWN";
  if (days <= 7) return "0_7";
  if (days <= 30) return "8_30";
  if (days <= 90) return "31_90";
  return "GT_90";
}

export function freshnessScoreFromBand(band: FreshnessBand): number {
  if (band === "0_7") return 1.0;
  if (band === "8_30") return 0.8;
  if (band === "31_90") return 0.5;
  if (band === "GT_90") return 0.2;
  return 0.0;
}

export function reliabilityFromHealth(health: ConnectorHealth): number {
  if (health === "HEALTHY") return 1.0;
  if (health === "DEGRADED") return 0.5;
  return 0.0;
}
