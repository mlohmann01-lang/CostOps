import { createHash } from 'node:crypto';
import { runGoldenPathEconomicReplay } from './golden-path-runner';
import { proveGoldenPathBoundaryIntegrity } from './golden-path-boundary-proof';
import { proveGoldenPathLineageIntegrity } from './golden-path-lineage-proof';
import { proveGoldenPathArbitrationIntegrity } from './golden-path-arbitration-proof';
import { buildGoldenPathOracleJavaFixture } from './golden-path-oracle-java-fixture';
import { computeOracleJavaEconomicReport } from '../oracle-java-governance';

export const computeGoldenPathControlPlaneProof = () => {
  const base = runGoldenPathEconomicReplay();
  const oracleJava = computeOracleJavaEconomicReport(buildGoldenPathOracleJavaFixture());
  const lineageProof = proveGoldenPathLineageIntegrity(base.composedLineage as Array<{ id: string; path: string[] }>);
  const arbitrationProof = proveGoldenPathArbitrationIntegrity({ governanceRiskOverride: oracleJava.risk.riskScore > 0.6, finalGovernanceClass: oracleJava.risk.riskScore > 0.6 ? 'APPROVAL_REQUIRED' : 'RECOMMEND_ONLY' });
  const envelope = { base, oracleJava, lineageProof, arbitrationProof, finalRecommendation: 'Governance review only; approval required before action.' };
  const boundaryProof = proveGoldenPathBoundaryIntegrity(envelope);
  const proofHash = createHash('sha256').update(JSON.stringify(envelope)).digest('hex');
  return { ...envelope, boundaryProof, proofHash };
};
