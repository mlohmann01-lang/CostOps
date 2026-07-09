// Executive Question Catalog for Headless Certen.
//
// This is the canonical list of executive questions Certen can answer
// without any UI. Future Slack/Teams/MCP/API adapters will look questions
// up against this catalog. No adapters live here — this is the layer
// underneath them.

import type { HeadlessAudience, HeadlessQuestionCategory } from "./headlessAnswerModel";

export interface HeadlessQuestion {
  id: string;
  question: string;
  audience: HeadlessAudience[];
  category: HeadlessQuestionCategory;
  aliases: string[];
  sourceSurfaces: string[];
}

export const headlessQuestionCatalog: HeadlessQuestion[] = [
  // Value Questions
  {
    id: "what_value_has_certen_identified",
    question: "What value has Certen identified?",
    audience: ["CFO", "CIO", "FINOPS", "EXECUTIVE"],
    category: "VALUE",
    aliases: [
      "what value has certen identified",
      "what value has been identified",
      "how much value has certen found",
    ],
    sourceSurfaces: ["Executive Command Center", "Outcome Finance"],
  },
  {
    id: "what_value_has_been_verified",
    question: "What value has been verified?",
    audience: ["CFO", "CIO", "FINOPS", "EXECUTIVE"],
    category: "VALUE",
    aliases: [
      "what value has been verified",
      "how much value is verified",
      "what is the verified value",
    ],
    sourceSurfaces: ["Executive Command Center", "Outcome Finance"],
  },
  {
    id: "what_value_is_protected",
    question: "What value is protected?",
    audience: ["CFO", "CIO", "FINOPS", "EXECUTIVE"],
    category: "VALUE",
    aliases: [
      "what value is protected",
      "how much value is protected",
      "what is the protected value",
    ],
    sourceSurfaces: ["Outcome Protection", "Executive Command Center"],
  },

  // Finance Questions
  {
    id: "what_value_has_finance_validated",
    question: "What value has finance validated?",
    audience: ["CFO", "FINOPS"],
    category: "FINANCE",
    aliases: [
      "what value has finance validated",
      "what value has finance verified",
      "what is finance verified value",
    ],
    sourceSurfaces: ["Outcome Finance"],
  },
  {
    id: "what_variance_exists",
    question: "What variance exists between projected and finance-verified value?",
    audience: ["CFO", "FINOPS"],
    category: "FINANCE",
    aliases: [
      "what variance exists between projected and finance-verified value",
      "what is the variance",
      "what is the finance variance",
    ],
    sourceSurfaces: ["Outcome Finance"],
  },

  // Approval Questions
  {
    id: "what_requires_approval",
    question: "What actions require approval?",
    audience: ["CFO", "CIO", "PLATFORM_ADMIN", "EXECUTIVE"],
    category: "APPROVAL",
    aliases: [
      "what actions require approval",
      "what requires approval",
      "what needs approval",
    ],
    sourceSurfaces: ["Economic Control Chain", "Executive Command Center"],
  },

  // Risk Questions
  {
    id: "what_requires_attention",
    question: "What requires attention?",
    audience: ["CIO", "ITAM", "PLATFORM_ADMIN", "EXECUTIVE"],
    category: "RISK",
    aliases: [
      "what requires attention",
      "what needs attention",
      "what should i be worried about",
    ],
    sourceSurfaces: ["Executive Command Center"],
  },
  {
    id: "where_are_we_exposed",
    question: "Where are we exposed?",
    audience: ["CIO", "ITAM", "FINOPS", "EXECUTIVE"],
    category: "RISK",
    aliases: [
      "where are we exposed",
      "what is our exposure",
      "where is the risk",
    ],
    sourceSurfaces: ["Outcome Protection", "Technology Authority"],
  },

  // Technology Questions
  {
    id: "what_do_we_own",
    question: "What technology do we own?",
    audience: ["CIO", "ITAM", "PLATFORM_ADMIN"],
    category: "TECHNOLOGY",
    aliases: [
      "what technology do we own",
      "what do we own",
      "what assets do we have",
    ],
    sourceSurfaces: ["Technology Authority"],
  },
  {
    id: "what_authorities_are_available",
    question: "What authorities are available?",
    audience: ["CIO", "ITAM", "PLATFORM_ADMIN"],
    category: "TECHNOLOGY",
    aliases: [
      "what authorities are available",
      "what authorities do we have",
      "what connectors are available",
    ],
    sourceSurfaces: ["Authority Catalog"],
  },

  // Readiness Questions
  {
    id: "is_certen_ready_to_execute",
    question: "Is Certen ready to execute?",
    audience: ["CIO", "PLATFORM_ADMIN", "EXECUTIVE"],
    category: "READINESS",
    aliases: [
      "is certen ready to execute",
      "is certen ready",
      "are we ready to execute",
    ],
    sourceSurfaces: ["Economic Control Chain", "Executive Command Center"],
  },
  {
    id: "what_should_i_do_next",
    question: "What should I do next?",
    audience: ["CFO", "CIO", "ITAM", "FINOPS", "PLATFORM_ADMIN", "EXECUTIVE"],
    category: "READINESS",
    aliases: [
      "what should i do next",
      "what's next",
      "what next",
    ],
    sourceSurfaces: ["Executive Command Center"],
  },
];
