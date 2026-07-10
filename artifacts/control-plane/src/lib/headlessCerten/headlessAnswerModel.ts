// Core answer model for the Headless Certen executive question layer.
//
// This module defines the canonical, adapter-agnostic Answer shape that any
// future surface (Slack, Teams, MCP, public API, etc.) will render. It does
// not call any backend/API and contains no UI, routing, or LLM logic.

export type HeadlessAudience =
  | "CFO"
  | "CIO"
  | "ITAM"
  | "FINOPS"
  | "PLATFORM_ADMIN"
  | "EXECUTIVE";

export type HeadlessQuestionCategory =
  | "VALUE"
  | "RISK"
  | "FINANCE"
  | "PROTECTION"
  | "APPROVAL"
  | "TECHNOLOGY"
  | "READINESS";

export interface HeadlessEvidenceRef {
  label: string;
  type:
    | "AUTHORITY"
    | "LEDGER"
    | "RECONCILIATION"
    | "EVIDENCE_PACK"
    | "EXECUTION"
    | "PROTECTION"
    | "READINESS";
  href?: string;
}

export interface HeadlessRecommendedAction {
  label: string;
  href?: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

export interface HeadlessAnswer {
  questionId: string;
  question: string;
  answer: string;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "NOT_AVAILABLE";
  evidence: HeadlessEvidenceRef[];
  recommendedActions: HeadlessRecommendedAction[];
  sourceSurfaces: string[];
  state: "ANSWERED" | "PARTIAL" | "NOT_AVAILABLE";
}
