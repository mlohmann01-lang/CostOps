// Headless Question Resolver for Headless Certen.
//
// Resolves a question id to a deterministic HeadlessAnswer by reading the
// same static/default data sources already used by the Authority Catalog,
// Economic Control Chain, Outcome Finance, Technology Authority, Executive
// Command Center and Outcome Protection pages. No new calculations are
// invented here, no backend/API is called, and no LLM prose is generated.
//
// Honest data bias: where the underlying default data is genuinely partial
// or missing (e.g. finance reconciliation not yet connected), the answer
// reflects that honestly rather than fabricating a fully positive answer.

import { defaultAuthorities } from "../authorityCatalog/defaultAuthorities";
import { getDefaultEconomicControlChain } from "../economicControlChain/defaultEconomicControlChain";
import { getDefaultOutcomeFinance } from "../outcomeFinance/defaultOutcomeFinance";
import { demoProtectedOutcomes, summarizeOutcomeProtection } from "../../hooks/useOutcomeProtectionData";
import { formatCurrency } from "../display/formatters";
import { headlessQuestionCatalog, type HeadlessQuestion } from "./headlessQuestionCatalog";
import type { HeadlessAnswer, HeadlessEvidenceRef, HeadlessRecommendedAction } from "./headlessAnswerModel";

export type { HeadlessQuestion } from "./headlessQuestionCatalog";
export type {
  HeadlessAnswer,
  HeadlessAudience,
  HeadlessQuestionCategory,
  HeadlessEvidenceRef,
  HeadlessRecommendedAction,
} from "./headlessAnswerModel";
export { headlessQuestionCatalog } from "./headlessQuestionCatalog";

function money(value?: number): string {
  return formatCurrency(value);
}

function findQuestionById(questionId: string): HeadlessQuestion | undefined {
  return headlessQuestionCatalog.find((q) => q.id === questionId);
}

function notAvailableAnswer(question: HeadlessQuestion, answer: string): HeadlessAnswer {
  return {
    questionId: question.id,
    question: question.question,
    answer,
    confidence: "NOT_AVAILABLE",
    evidence: [],
    recommendedActions: [],
    sourceSurfaces: question.sourceSurfaces,
    state: "NOT_AVAILABLE",
  };
}

function resolveWhatValueHasCertenIdentified(question: HeadlessQuestion): HeadlessAnswer {
  const outcomeFinance = getDefaultOutcomeFinance();
  const identifiedValue = outcomeFinance.metrics.identifiedValue;

  if (identifiedValue === undefined) {
    return notAvailableAnswer(
      question,
      "Certen has not yet identified any value. Connect sources to begin discovery and opportunity analysis.",
    );
  }

  const evidence: HeadlessEvidenceRef[] = [
    { label: "Outcome Finance", type: "LEDGER", href: "/executive/outcome-finance" },
  ];
  const recommendedActions: HeadlessRecommendedAction[] = [
    { label: "Review Executive Command Center", href: "/", priority: "MEDIUM" },
  ];

  return {
    questionId: question.id,
    question: question.question,
    answer: `Certen has identified ${money(identifiedValue)} in annual value opportunity.`,
    confidence: "MEDIUM",
    evidence,
    recommendedActions,
    sourceSurfaces: question.sourceSurfaces,
    state: "ANSWERED",
  };
}

function resolveWhatValueHasBeenVerified(question: HeadlessQuestion): HeadlessAnswer {
  const outcomeFinance = getDefaultOutcomeFinance();
  const verifiedValue = outcomeFinance.metrics.verifiedValue;
  const identifiedValue = outcomeFinance.metrics.identifiedValue;

  if (verifiedValue === undefined || verifiedValue === 0) {
    return notAvailableAnswer(
      question,
      "No value has been verified yet. Verification begins after governed actions are executed.",
    );
  }

  const evidence: HeadlessEvidenceRef[] = [
    { label: "Outcome Finance", type: "LEDGER", href: "/executive/outcome-finance" },
  ];
  const recommendedActions: HeadlessRecommendedAction[] = [
    { label: "Review verified outcomes", href: "/executive/outcome-finance", priority: "MEDIUM" },
  ];

  const partial = identifiedValue !== undefined && verifiedValue < identifiedValue;

  return {
    questionId: question.id,
    question: question.question,
    answer: `Certen has verified ${money(verifiedValue)} of annual value through governed execution.${
      partial ? ` This represents a portion of the ${money(identifiedValue)} identified.` : ""
    }`,
    confidence: "MEDIUM",
    evidence,
    recommendedActions,
    sourceSurfaces: question.sourceSurfaces,
    state: partial ? "PARTIAL" : "ANSWERED",
  };
}

function resolveWhatValueIsProtected(question: HeadlessQuestion): HeadlessAnswer {
  const dashboard = summarizeOutcomeProtection(demoProtectedOutcomes);

  if (dashboard.protectedOutcomes === 0) {
    return notAvailableAnswer(
      question,
      "No protected outcomes exist yet. Protected value will appear after verified outcomes are created and retention monitoring begins.",
    );
  }

  const evidence: HeadlessEvidenceRef[] = [
    { label: "Outcome Protection", type: "PROTECTION", href: "/outcome-protection" },
  ];
  const recommendedActions: HeadlessRecommendedAction[] = [];
  if (dashboard.driftedAnnualValue > 0) {
    recommendedActions.push({
      label: "Open Remediation Queue",
      href: "/outcome-protection",
      priority: "HIGH",
    });
  }

  const hasDrift = dashboard.driftedAnnualValue > 0;

  return {
    questionId: question.id,
    question: question.question,
    answer: `Certen is currently protecting ${money(dashboard.protectedAnnualValue)} of annualized verified value, of which ${money(
      dashboard.retainedAnnualValue,
    )} remains retained.${hasDrift ? ` ${money(dashboard.driftedAnnualValue)} has drifted and requires remediation.` : ""}`,
    confidence: hasDrift ? "MEDIUM" : "HIGH",
    evidence,
    recommendedActions,
    sourceSurfaces: question.sourceSurfaces,
    state: hasDrift ? "PARTIAL" : "ANSWERED",
  };
}

function resolveWhatValueHasFinanceValidated(question: HeadlessQuestion): HeadlessAnswer {
  const outcomeFinance = getDefaultOutcomeFinance();
  const financeVerifiedValue = outcomeFinance.metrics.financeVerifiedValue;

  if (financeVerifiedValue === undefined) {
    return {
      questionId: question.id,
      question: question.question,
      answer:
        "Finance-verified value is not available yet. Verified outcomes exist, but finance reconciliation is incomplete.",
      confidence: "NOT_AVAILABLE",
      evidence: [
        {
          label: "Outcome Finance",
          type: "RECONCILIATION",
          href: "/executive/outcome-finance",
        },
      ],
      recommendedActions: [
        {
          label: "Connect finance system",
          href: "/executive/outcome-finance",
          priority: "HIGH",
        },
      ],
      sourceSurfaces: ["Outcome Finance"],
      state: "PARTIAL",
    };
  }

  return {
    questionId: question.id,
    question: question.question,
    answer: `Finance has validated ${money(financeVerifiedValue)} of annual value through reconciliation.`,
    confidence: "HIGH",
    evidence: [{ label: "Outcome Finance", type: "RECONCILIATION", href: "/executive/outcome-finance" }],
    recommendedActions: [],
    sourceSurfaces: question.sourceSurfaces,
    state: "ANSWERED",
  };
}

function resolveWhatVarianceExists(question: HeadlessQuestion): HeadlessAnswer {
  const outcomeFinance = getDefaultOutcomeFinance();
  const { identifiedValue, financeVerifiedValue, variance } = outcomeFinance.metrics;

  if (variance === undefined) {
    return {
      questionId: question.id,
      question: question.question,
      answer: `Variance cannot be calculated yet. Certen has identified ${
        identifiedValue !== undefined ? money(identifiedValue) : "no"
      } in projected value, but finance-verified value is not yet available.`,
      confidence: "NOT_AVAILABLE",
      evidence: [{ label: "Outcome Finance", type: "RECONCILIATION", href: "/executive/outcome-finance" }],
      recommendedActions: [
        { label: "Connect finance system", href: "/executive/outcome-finance", priority: "HIGH" },
      ],
      sourceSurfaces: question.sourceSurfaces,
      state: "PARTIAL",
    };
  }

  return {
    questionId: question.id,
    question: question.question,
    answer: `The variance between projected (${money(identifiedValue)}) and finance-verified (${money(
      financeVerifiedValue,
    )}) value is ${money(variance)}.`,
    confidence: "HIGH",
    evidence: [{ label: "Outcome Finance", type: "RECONCILIATION", href: "/executive/outcome-finance" }],
    recommendedActions: [],
    sourceSurfaces: question.sourceSurfaces,
    state: "ANSWERED",
  };
}

function resolveWhatRequiresApproval(question: HeadlessQuestion): HeadlessAnswer {
  const chain = getDefaultEconomicControlChain();
  const approveStage = chain.stages.find((s) => s.key === "APPROVE");

  if (!approveStage || !approveStage.active) {
    return {
      questionId: question.id,
      question: question.question,
      answer:
        "No actions currently require approval. The Approve stage of the Economic Control Chain is not yet active — approvals will appear once opportunities are identified.",
      confidence: "NOT_AVAILABLE",
      evidence: [{ label: "Economic Control Chain", type: "EXECUTION", href: "/" }],
      recommendedActions: [
        { label: "Connect sources to begin discovery", href: "/intelligence/authority-catalog", priority: "MEDIUM" },
      ],
      sourceSurfaces: question.sourceSurfaces,
      state: "NOT_AVAILABLE",
    };
  }

  return {
    questionId: question.id,
    question: question.question,
    answer: "Actions are awaiting approval in the Economic Control Chain.",
    confidence: "MEDIUM",
    evidence: [{ label: "Economic Control Chain", type: "EXECUTION", href: "/" }],
    recommendedActions: [{ label: "Review approvals", href: "/approvals", priority: "HIGH" }],
    sourceSurfaces: question.sourceSurfaces,
    state: "ANSWERED",
  };
}

function resolveWhatRequiresAttention(question: HeadlessQuestion): HeadlessAnswer {
  const authoritiesActive = defaultAuthorities.filter((a) => a.status === "ACTIVE").length;
  const authoritiesTotal = defaultAuthorities.length;
  const chain = getDefaultEconomicControlChain();
  const outcomeFinance = getDefaultOutcomeFinance();

  const attentionItems: string[] = [];
  if (authoritiesActive < authoritiesTotal) {
    attentionItems.push(
      `${authoritiesTotal - authoritiesActive} of ${authoritiesTotal} authorities are not yet active`,
    );
  }
  if (outcomeFinance.metrics.financeVerifiedValue === undefined) {
    attentionItems.push("finance reconciliation is incomplete");
  }
  if (chain.activeStageCount < 7) {
    attentionItems.push(`only ${chain.activeStageCount} of 7 economic control chain stages are active`);
  }

  if (attentionItems.length === 0) {
    return {
      questionId: question.id,
      question: question.question,
      answer: "Nothing currently requires attention. Authorities, finance reconciliation and the economic control chain are all healthy.",
      confidence: "HIGH",
      evidence: [{ label: "Executive Command Center", type: "EXECUTION", href: "/" }],
      recommendedActions: [],
      sourceSurfaces: question.sourceSurfaces,
      state: "ANSWERED",
    };
  }

  return {
    questionId: question.id,
    question: question.question,
    answer: `Certen has identified items requiring attention: ${attentionItems.join("; ")}.`,
    confidence: "MEDIUM",
    evidence: [{ label: "Executive Command Center", type: "EXECUTION", href: "/" }],
    recommendedActions: [
      { label: "Open Executive Command Center", href: "/", priority: "HIGH" },
    ],
    sourceSurfaces: question.sourceSurfaces,
    state: "PARTIAL",
  };
}

function resolveWhereAreWeExposed(question: HeadlessQuestion): HeadlessAnswer {
  const dashboard = summarizeOutcomeProtection(demoProtectedOutcomes);

  if (dashboard.atRiskOutcomes === 0 && dashboard.driftedOutcomes === 0) {
    return {
      questionId: question.id,
      question: question.question,
      answer: "No drift or at-risk exposure has been identified in protected outcomes.",
      confidence: "HIGH",
      evidence: [{ label: "Outcome Protection", type: "PROTECTION", href: "/outcome-protection" }],
      recommendedActions: [],
      sourceSurfaces: question.sourceSurfaces,
      state: "ANSWERED",
    };
  }

  return {
    questionId: question.id,
    question: question.question,
    answer: `Certen has identified exposure across ${dashboard.atRiskOutcomes} at-risk and ${dashboard.driftedOutcomes} drifted outcomes, representing ${money(
      dashboard.driftedAnnualValue,
    )} of drifted annual value with ${dashboard.remediationOpen} open remediation actions.`,
    confidence: "MEDIUM",
    evidence: [{ label: "Outcome Protection", type: "PROTECTION", href: "/outcome-protection" }],
    recommendedActions: [
      { label: "Open Remediation Queue", href: "/outcome-protection", priority: "HIGH" },
    ],
    sourceSurfaces: question.sourceSurfaces,
    state: "PARTIAL",
  };
}

function resolveWhatDoWeOwn(question: HeadlessQuestion): HeadlessAnswer {
  // Technology Authority (TechnologyPortfolio.tsx) derives its asset view from
  // a live/demo data hook (useTechnologyPortfolio). There is no static default
  // asset list comparable to defaultAuthorities — when no tenant/demo data is
  // connected the page itself shows "No technology assets have been discovered
  // yet." We reflect that same honest state here rather than fabricating an
  // asset count, since the resolver may run without any connected source.
  return {
    questionId: question.id,
    question: question.question,
    answer:
      "Certen has not yet discovered a technology estate from a static/default data source. Connect Microsoft 365, Flexera, ServiceNow, ERP or cloud sources to populate the Technology Authority.",
    confidence: "NOT_AVAILABLE",
    evidence: [{ label: "Technology Authority", type: "AUTHORITY", href: "/technology-portfolio" }],
    recommendedActions: [
      { label: "Connect Microsoft 365", href: "/technology-portfolio", priority: "HIGH" },
    ],
    sourceSurfaces: question.sourceSurfaces,
    state: "NOT_AVAILABLE",
  };
}

function resolveWhatAuthoritiesAreAvailable(question: HeadlessQuestion): HeadlessAnswer {
  const total = defaultAuthorities.length;
  const active = defaultAuthorities.filter((a) => a.status === "ACTIVE").length;
  const available = defaultAuthorities.filter((a) => a.status === "AVAILABLE").length;

  const evidence: HeadlessEvidenceRef[] = [
    { label: "Authority Catalog", type: "AUTHORITY", href: "/intelligence/authority-catalog" },
  ];
  const recommendedActions: HeadlessRecommendedAction[] = [
    { label: "Connect additional authorities", href: "/intelligence/authority-catalog", priority: "MEDIUM" },
  ];

  return {
    questionId: question.id,
    question: question.question,
    answer: `Certen has ${total} authorities in the catalog: ${active} active, ${available} available to connect, and ${
      total - active - available
    } in preview or planned. Only ${active} of ${total} authorities are currently active.`,
    confidence: active === total ? "HIGH" : "MEDIUM",
    evidence,
    recommendedActions,
    sourceSurfaces: question.sourceSurfaces,
    state: active === total ? "ANSWERED" : "PARTIAL",
  };
}

function resolveIsCertenReadyToExecute(question: HeadlessQuestion): HeadlessAnswer {
  const chain = getDefaultEconomicControlChain();

  const evidence: HeadlessEvidenceRef[] = [
    { label: "Economic Control Chain", type: "EXECUTION", href: "/" },
  ];

  if (chain.healthStatus === "Healthy") {
    return {
      questionId: question.id,
      question: question.question,
      answer: "Yes. All 7 stages of the Economic Control Chain are active, so Certen is ready to execute.",
      confidence: "HIGH",
      evidence,
      recommendedActions: [],
      sourceSurfaces: question.sourceSurfaces,
      state: "ANSWERED",
    };
  }

  if (chain.healthStatus === "Setup Required") {
    return {
      questionId: question.id,
      question: question.question,
      answer: `No. Certen is not yet ready to execute. ${chain.narrative}`,
      confidence: "NOT_AVAILABLE",
      evidence,
      recommendedActions: [
        { label: "Connect sources to begin discovery", href: "/intelligence/authority-catalog", priority: "HIGH" },
      ],
      sourceSurfaces: question.sourceSurfaces,
      state: "NOT_AVAILABLE",
    };
  }

  return {
    questionId: question.id,
    question: question.question,
    answer: `Not yet fully. Only ${chain.activeStageCount} of 7 economic control chain stages are active. ${chain.narrative}`,
    confidence: "LOW",
    evidence,
    recommendedActions: [
      { label: "Complete ownership and commercial mapping", href: "/intelligence/authority-catalog", priority: "MEDIUM" },
    ],
    sourceSurfaces: question.sourceSurfaces,
    state: "PARTIAL",
  };
}

function resolveWhatShouldIDoNext(question: HeadlessQuestion): HeadlessAnswer {
  const chain = getDefaultEconomicControlChain();
  const outcomeFinance = getDefaultOutcomeFinance();
  const authoritiesActive = defaultAuthorities.filter((a) => a.status === "ACTIVE").length;

  const actions: HeadlessRecommendedAction[] = [];
  if (authoritiesActive < defaultAuthorities.length) {
    actions.push({ label: "Connect Microsoft 365", href: "/technology-portfolio", priority: "HIGH" });
  }
  if (chain.activeStageCount < 7) {
    actions.push({ label: "Run Discovery", href: "/intelligence/authority-catalog", priority: "MEDIUM" });
  }
  if (outcomeFinance.metrics.financeVerifiedValue === undefined) {
    actions.push({ label: "Connect Finance System", href: "/executive/outcome-finance", priority: "MEDIUM" });
  }

  if (actions.length === 0) {
    return {
      questionId: question.id,
      question: question.question,
      answer: "No immediate next actions are outstanding. Continue monitoring protected value and verified outcomes.",
      confidence: "HIGH",
      evidence: [{ label: "Executive Command Center", type: "EXECUTION", href: "/" }],
      recommendedActions: [],
      sourceSurfaces: question.sourceSurfaces,
      state: "ANSWERED",
    };
  }

  return {
    questionId: question.id,
    question: question.question,
    answer: `The recommended next step is to ${actions[0].label.toLowerCase()}. ${
      actions.length > 1 ? `${actions.length - 1} additional action(s) are also recommended.` : ""
    }`.trim(),
    confidence: "MEDIUM",
    evidence: [{ label: "Executive Command Center", type: "EXECUTION", href: "/" }],
    recommendedActions: actions,
    sourceSurfaces: question.sourceSurfaces,
    state: "PARTIAL",
  };
}

type Resolver = (question: HeadlessQuestion) => HeadlessAnswer;

const resolvers: Record<string, Resolver> = {
  what_value_has_certen_identified: resolveWhatValueHasCertenIdentified,
  what_value_has_been_verified: resolveWhatValueHasBeenVerified,
  what_value_is_protected: resolveWhatValueIsProtected,
  what_value_has_finance_validated: resolveWhatValueHasFinanceValidated,
  what_variance_exists: resolveWhatVarianceExists,
  what_requires_approval: resolveWhatRequiresApproval,
  what_requires_attention: resolveWhatRequiresAttention,
  where_are_we_exposed: resolveWhereAreWeExposed,
  what_do_we_own: resolveWhatDoWeOwn,
  what_authorities_are_available: resolveWhatAuthoritiesAreAvailable,
  is_certen_ready_to_execute: resolveIsCertenReadyToExecute,
  what_should_i_do_next: resolveWhatShouldIDoNext,
};

export function resolveHeadlessQuestion(questionId: string): HeadlessAnswer {
  const question = findQuestionById(questionId);
  if (!question) {
    return {
      questionId,
      question: "",
      answer: "This question is not part of the Headless Certen executive question catalog.",
      confidence: "NOT_AVAILABLE",
      evidence: [],
      recommendedActions: [],
      sourceSurfaces: [],
      state: "NOT_AVAILABLE",
    };
  }

  const resolver = resolvers[question.id];
  if (!resolver) {
    return notAvailableAnswer(question, "This question does not yet have a resolver.");
  }
  return resolver(question);
}

export function findHeadlessQuestion(input: string): HeadlessQuestion | null {
  const trimmed = input.trim();

  const byId = headlessQuestionCatalog.find((q) => q.id === trimmed);
  if (byId) return byId;

  const byQuestionText = headlessQuestionCatalog.find((q) => q.question === trimmed);
  if (byQuestionText) return byQuestionText;

  const normalized = trimmed.toLowerCase();
  const byAlias = headlessQuestionCatalog.find((q) => q.aliases.includes(normalized));
  if (byAlias) return byAlias;

  return null;
}
