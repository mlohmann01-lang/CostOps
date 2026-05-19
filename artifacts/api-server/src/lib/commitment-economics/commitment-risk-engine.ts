import type { CommitmentRiskResult } from './commitment-economics-types';
import type { NormalizedCommitmentEconomicSignal } from './commitment-normalizer';
export function evaluateCommitmentRisk(portfolio:NormalizedCommitmentEconomicSignal[]):CommitmentRiskResult[] { const u=portfolio.filter(c=>c.utilizationPercentage<0.7).length; const gaps=portfolio.filter(c=>c.coveragePercentage<0.65).length; const exp=portfolio.filter(c=>(Date.parse(c.endDate)-Date.now())/86400000<120).length; const gpu=portfolio.filter(c=>c.commitmentType==='GPU_COMMITMENT'&&c.commitmentTermMonths>=24).length; return [
{riskType:'UNDERUTILIZATION',severity:u>2?'HIGH':u>0?'MEDIUM':'LOW',trajectory:'STABLE',confidence:0.75,recommendedReview:'Prioritize underutilized commitments for governance review.'},
{riskType:'COVERAGE_GAPS',severity:gaps>2?'HIGH':gaps>0?'MEDIUM':'LOW',trajectory:'WORSENING',confidence:0.7,recommendedReview:'Review service-family commitment coverage mapping.'},
{riskType:'EXPIRATION_CONCENTRATION',severity:exp>2?'HIGH':exp>0?'MEDIUM':'LOW',trajectory:'WORSENING',confidence:0.8,recommendedReview:'Stage renewal and fallback coverage plans.'},
{riskType:'GPU_LOCKIN',severity:gpu>0?'MEDIUM':'LOW',trajectory:'STABLE',confidence:0.65,recommendedReview:'Assess GPU commitment lock-in against AI demand volatility.'}
]; }
