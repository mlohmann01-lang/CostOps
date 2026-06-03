import type { ShadowITTrustBand, ShadowITTrustInput, ShadowITTrustResult } from "./shadow-it-types";

function band(score: number): ShadowITTrustBand {
  if (score >= 90) return "TRUSTED";
  if (score >= 75) return "HIGH";
  if (score >= 55) return "INVESTIGATE";
  if (score > 0) return "LOW_CONFIDENCE";
  return "BLOCKED";
}

export function scoreShadowITTrust(input: ShadowITTrustInput): ShadowITTrustResult {
  const trustScore = Math.min(100, Math.max(0,
    (input.ownerKnown ? 25 : 0) +
    (input.signInEvidenceAvailable ? 25 : 0) +
    (input.userCountAvailable ? 20 : 0) +
    (input.applicationMetadataAvailable ? 30 : 0)
  ));
  const trustReasons = [
    input.ownerKnown ? "Application owner known" : "Application owner missing",
    input.signInEvidenceAvailable ? "Sign-in evidence available" : "Sign-in evidence missing",
    input.userCountAvailable ? "User count available" : "User count missing",
    input.applicationMetadataAvailable ? "Application metadata available" : "Application metadata missing",
  ];
  return { trustScore, trustBand: band(trustScore), trustReasons };
}
