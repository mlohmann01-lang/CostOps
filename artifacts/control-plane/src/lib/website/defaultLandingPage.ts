// Static content model for the public Certen marketing homepage (Program 9).
//
// This is a content-only module — no UI, no live platform data, no fabricated
// statistics. It reuses existing static data sources rather than duplicating
// logic: the Economic Control Chain (Program 4/Section 4), the headless
// question catalog (Program 7/Section 5), and the Exposure Report's sample
// metric shape (Section 7). Honest-data bias applies: nothing here claims to
// be live customer data.

import { getDefaultEconomicControlChain, type ChainStageKey } from '../economicControlChain/defaultEconomicControlChain'
import { headlessQuestionCatalog } from '../headlessCerten/headlessQuestionCatalog'
import type { HeadlessAudience } from '../headlessCerten/headlessAnswerModel'

// ─── Section 1 — Hero ───────────────────────────────────────────────────────

export interface HeroContent {
  headlineLines: [string, string]
  subheadline: string
  primaryCta: string
  secondaryCta: string
  trustBanner: string[]
}

export const TRUST_BANNER_ASSURANCES: string[] = [
  'Read-only review',
  'No changes made',
  'Discovery only',
  'No licence modifications',
  'No automated execution',
  'Access can be revoked at any time',
]

export const RUN_EXPOSURE_REVIEW_CTA = 'Run Free M365 Exposure Review'

const hero: HeroContent = {
  headlineLines: ['You approved the technology budget.', 'Can you prove what it delivered?'],
  subheadline:
    'Certen helps organisations uncover value, execute improvements, validate outcomes, reconcile savings to finance and protect gains from drift.',
  primaryCta: RUN_EXPOSURE_REVIEW_CTA,
  secondaryCta: 'See Economic Control Chain',
  trustBanner: TRUST_BANNER_ASSURANCES,
}

// ─── Section 2 — Market Problem ─────────────────────────────────────────────

export interface MarketProblemCard {
  title: string
  body: string
}

export interface MarketProblemContent {
  titleLines: [string, string]
  cards: MarketProblemCard[]
}

const marketProblem: MarketProblemContent = {
  titleLines: ['Technology investment is growing.', 'Proof of value is lagging.'],
  cards: [
    { title: 'Investment', body: 'Technology and AI spending continues to increase.' },
    { title: 'Visibility', body: 'Most organisations know what they spend.' },
    { title: 'Proof', body: 'Few can prove what value was delivered.' },
  ],
}

// ─── Section 3 — Uncover / Execute / Protect ────────────────────────────────

export interface CommercialModelColumn {
  title: string
  body: string
}

export interface CommercialModelContent {
  columns: CommercialModelColumn[]
}

const commercialModel: CommercialModelContent = {
  columns: [
    { title: 'Uncover', body: 'Find exposure, waste, duplication and ownership gaps.' },
    { title: 'Execute', body: 'Turn recommendations into governed actions.' },
    { title: 'Protect', body: 'Monitor outcomes and prevent savings drift.' },
  ],
}

// ─── Section 4 — Economic Control Chain ─────────────────────────────────────

export interface ChainStageSummary {
  key: ChainStageKey
  title: string
  description: string
}

export interface EconomicControlChainContent {
  stages: ChainStageSummary[]
}

function buildEconomicControlChainContent(): EconomicControlChainContent {
  const chain = getDefaultEconomicControlChain()
  return {
    stages: chain.stages.map((stage) => ({
      key: stage.key,
      title: stage.title,
      description: stage.description,
    })),
  }
}

// ─── Section 5 — Questions Certen Answers ───────────────────────────────────

export interface QuestionsByAudience {
  audience: HeadlessAudience
  audienceLabel: string
  questions: string[]
}

const SECTION_5_QUESTION_IDS: Record<HeadlessAudience, string[]> = {
  CFO: ['what_value_has_been_verified', 'what_value_has_finance_validated', 'what_variance_exists'],
  CIO: ['what_do_we_own', 'where_are_we_exposed', 'what_should_i_do_next'],
  EXECUTIVE: ['what_requires_attention', 'what_value_is_protected'],
  ITAM: ['what_authorities_are_available', 'what_requires_approval'],
  FINOPS: [],
  PLATFORM_ADMIN: [],
}

const AUDIENCE_LABELS: Record<HeadlessAudience, string> = {
  CFO: 'CFO',
  CIO: 'CIO',
  ITAM: 'ITAM',
  FINOPS: 'FinOps',
  PLATFORM_ADMIN: 'Platform Admin',
  EXECUTIVE: 'Executive',
}

function questionTextById(id: string): string {
  const found = headlessQuestionCatalog.find((q) => q.id === id)
  if (!found) {
    throw new Error(`Landing page question id "${id}" not found in headlessQuestionCatalog`)
  }
  return found.question
}

function buildQuestionsByAudience(): QuestionsByAudience[] {
  const audiences: HeadlessAudience[] = ['CFO', 'CIO', 'EXECUTIVE', 'ITAM']
  return audiences.map((audience) => ({
    audience,
    audienceLabel: AUDIENCE_LABELS[audience],
    questions: SECTION_5_QUESTION_IDS[audience].map(questionTextById),
  }))
}

// ─── Section 6 — Governed Answers ───────────────────────────────────────────

export interface GovernedAnswersContent {
  headlineLines: [string, string]
  conceptCallouts: { term: string; description: string }[]
}

const governedAnswers: GovernedAnswersContent = {
  headlineLines: ['Most AI assistants answer from dashboards.', 'Certen answers from governed evidence.'],
  conceptCallouts: [
    {
      term: 'Outcome Ledger',
      description: 'Every identified opportunity is tracked from recommendation through to verified outcome.',
    },
    {
      term: 'Evidence Registry',
      description: 'Answers are backed by recorded evidence, not assumptions.',
    },
    {
      term: 'Finance Reconciliation',
      description: 'Verified value is reconciled against finance-confirmed figures before it is reported.',
    },
    {
      term: 'Economic Control Chain',
      description: 'Every answer can be traced back to the stage of the control chain that produced it.',
    },
  ],
}

// ─── Section 7 — AI & Technology Exposure Report ────────────────────────────

export interface ExposureReportSampleMetric {
  label: string
  sampleValue: string
}

export interface ExposureReportSectionContent {
  metrics: ExposureReportSampleMetric[]
  illustrativeNote: string
  flowSteps: string[]
  cta: string
}

const exposureReportSection: ExposureReportSectionContent = {
  // Sample/illustrative values only, reusing the same metric labels as
  // Section 1 of the Exposure Report model (defaultExposureReport.ts).
  // Not claimed live customer data.
  metrics: [
    { label: 'Potential Annual Value', sampleValue: '$320,000' },
    { label: 'Inactive Licences', sampleValue: '184' },
    { label: 'Ownerless Licences', sampleValue: '47' },
    { label: 'Copilot Exposure', sampleValue: 'Not available' },
    { label: 'Governance Findings', sampleValue: '12' },
  ],
  illustrativeNote: 'Sample figures shown for illustration. Your Exposure Report is generated from your own tenant data.',
  flowSteps: [
    'Connect Microsoft 365.',
    'Receive an AI & Technology Exposure Report.',
    'No changes made.',
    'Results in minutes.',
  ],
  cta: RUN_EXPOSURE_REVIEW_CTA,
}

// ─── Section 8 — Executive Economic Review ──────────────────────────────────

export interface ExecutiveReviewContent {
  headline: string
  supportingCopy: string
  cta: string
}

const executiveReview: ExecutiveReviewContent = {
  headline: 'Understand what you own, what you spend, what is exposed and what value can be proven.',
  supportingCopy:
    'Review technology exposure, ownership, governance, opportunities, verified outcomes and protection readiness.',
  cta: 'Book Executive Review',
}

// ─── Full landing page model ─────────────────────────────────────────────────

export interface LandingPageSection {
  id: number
  title: string
}

export const LANDING_PAGE_SECTIONS: LandingPageSection[] = [
  { id: 1, title: 'Hero' },
  { id: 2, title: 'Market Problem' },
  { id: 3, title: 'Uncover, Execute, Protect' },
  { id: 4, title: 'Economic Control Chain' },
  { id: 5, title: 'Questions Certen Answers' },
  { id: 6, title: 'Governed Answers' },
  { id: 7, title: 'AI & Technology Exposure Report' },
  { id: 8, title: 'Executive Economic Review' },
]

export interface LandingPageContent {
  sections: LandingPageSection[]
  hero: HeroContent
  marketProblem: MarketProblemContent
  commercialModel: CommercialModelContent
  economicControlChain: EconomicControlChainContent
  questionsByAudience: QuestionsByAudience[]
  governedAnswers: GovernedAnswersContent
  exposureReportSection: ExposureReportSectionContent
  executiveReview: ExecutiveReviewContent
}

export function getDefaultLandingPage(): LandingPageContent {
  return {
    sections: LANDING_PAGE_SECTIONS,
    hero,
    marketProblem,
    commercialModel,
    economicControlChain: buildEconomicControlChainContent(),
    questionsByAudience: buildQuestionsByAudience(),
    governedAnswers,
    exposureReportSection,
    executiveReview,
  }
}
