import type { DecisionLineageEntry } from './platform-audit-types';

/**
 * Sprint 8, Workstream 3: validates the Investment -> Asset -> Decision ->
 * Outcome -> Protected Value chain for the two connectors with the deepest
 * data (M365, Flexera). "INFERRED" means the link is reconstructed via
 * string/name matching rather than a database foreign key.
 */
export const decisionLineageAudit: DecisionLineageEntry[] = [
  {
    source: 'M365',
    investmentToAsset: 'COMPLETE',
    assetToDecision: 'COMPLETE',
    decisionToOutcome: 'COMPLETE',
    outcomeToProtectedValue: 'INFERRED',
    notes: 'FK-backed chain through decision and outcome; protected-value linkage exists but drift-policy coverage is not yet 1:1 with every verified outcome, so it is treated as inferred rather than fully confirmed.',
  },
  {
    source: 'Flexera',
    investmentToAsset: 'COMPLETE',
    assetToDecision: 'INFERRED',
    decisionToOutcome: 'INFERRED',
    outcomeToProtectedValue: 'MISSING',
    notes: 'Asset ingestion is FK-backed; decision and outcome linkage rely on name/vendor string matching rather than confirmed FKs; no protected-value record yet ties back to Flexera-sourced outcomes.',
  },
];

export function lineageFor(source: string): DecisionLineageEntry | undefined {
  return decisionLineageAudit.find((entry) => entry.source === source);
}

export function brokenOrMissingLinks(): DecisionLineageEntry[] {
  return decisionLineageAudit.filter((entry) =>
    [entry.investmentToAsset, entry.assetToDecision, entry.decisionToOutcome, entry.outcomeToProtectedValue].some(
      (status) => status === 'MISSING' || status === 'BROKEN',
    ),
  );
}
