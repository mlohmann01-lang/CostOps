import type { RecommendationCandidate, RiskClass } from "./recommendation-candidate-types";
export interface OperationalSensitivityResult { candidateId: string; sensitivityClass: RiskClass; sensitivityReasons: string[]; approvalEscalationRequired: boolean; recommendationSuppressionRecommended: boolean; blastRadiusNotes: string[]; }
export const evaluateOperationalSensitivity = (candidate: RecommendationCandidate): OperationalSensitivityResult => {
  let score = 0; const reasons: string[] = []; const notes: string[] = []; const oc = candidate.operationalContext;
  if (oc.privileged) { score += 30; reasons.push("privileged indicator present"); }
  if (oc.serviceAccount) { score += 20; reasons.push("service account indicator present"); }
  if (oc.sharedMailbox) { score += 10; reasons.push("shared mailbox context"); }
  if (oc.vip) { score += 20; reasons.push("vip/executive context"); }
  if (oc.businessCriticalGroupMember) { score += 20; reasons.push("business critical membership"); }
  if (!oc.ownerDefined) { score += 15; reasons.push("ownership unclear"); }
  if ((oc.recentActivityDays ?? 999) < 14) { score += 10; reasons.push("recent activity indicates active dependency"); }
  if (oc.contractor) { score += 5; reasons.push("contractor persona caution"); }
  if (candidate.actionRiskProfile.actionRiskClass === "CRITICAL") score += 25;
  if (candidate.actionRiskProfile.blastRadius === "CRITICAL") notes.push("critical blast radius potential");
  const sensitivityClass: RiskClass = score >= 70 ? "CRITICAL" : score >= 45 ? "HIGH" : score >= 20 ? "MODERATE" : "LOW";
  return { candidateId: candidate.candidateId, sensitivityClass, sensitivityReasons: reasons, approvalEscalationRequired: sensitivityClass === "CRITICAL" || sensitivityClass === "HIGH", recommendationSuppressionRecommended: sensitivityClass === "CRITICAL" && candidate.actionRiskProfile.actionRiskClass === "CRITICAL", blastRadiusNotes: notes };
};
